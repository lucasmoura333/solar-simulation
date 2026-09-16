import { useEffect, useMemo, useRef, useState } from "react";
import type { Group } from "three";
import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import { TransformControls } from "@react-three/drei";
import { useSceneStore } from "../../stores/sceneStore";
import { useUiStore } from "../../stores/uiStore";
import { DEG } from "../../utils/waterMath";
import {
  blockLocalToWorld,
  modulePoseLocal,
  projectToWaterLocal,
  rotateLocalToWorld,
  waterCenterPointLocal,
  waterOriginForCenterLocal,
  worldToBlockLocal,
} from "../../utils/waterMath";
import { snapBlockPlace, snapWaterToBlock } from "../../utils/snapping";

interface HandleState {
  position: [number, number, number];
  quaternion: Quaternion;
}

/** Quaternion de um triedro (X, Y, Z) de vetores. */
function quatOfBasis(x: Vector3, y: Vector3, z: Vector3): Quaternion {
  const m = new Matrix4();
  m.makeBasis(x, y, z);
  return new Quaternion().setFromRotationMatrix(m);
}

interface Basis {
  x: Vector3;
  y: Vector3;
  z: Vector3;
}

/** Triedro da água no mundo (X=comprimento, Y=normal, Z=largura no plano). */
function waterBasisWorld(
  block: { orientation_deg: number },
  water: { yaw_deg: number; tilt_deg: number },
): Basis {
  const a = water.yaw_deg * DEG;
  const t = Math.tan(water.tilt_deg * DEG);
  const uLocal = { x: Math.cos(a), y: 0, z: -Math.sin(a) };
  // normal local da água (U × dirT)
  const dirT = { x: -Math.sin(a), y: t, z: -Math.cos(a) };
  const nl = {
    x: uLocal.y * dirT.z - uLocal.z * dirT.y,
    y: uLocal.z * dirT.x - uLocal.x * dirT.z,
    z: uLocal.x * dirT.y - uLocal.y * dirT.x,
  };
  const nLen = Math.hypot(nl.x, nl.y, nl.z) || 1;
  const x = rotateLocalToWorld(
    { orientation_deg: block.orientation_deg },
    { x: uLocal.x, y: 0, z: uLocal.z },
  );
  const n = rotateLocalToWorld(
    { orientation_deg: block.orientation_deg },
    { x: nl.x / nLen, y: nl.y / nLen, z: nl.z / nLen },
  );
  const y = new Vector3(n.x, n.y, n.z);
  // Triedro destro (x × y = z): essencial para o quaternion do gizmo.
  const z = new Vector3().crossVectors(new Vector3(x.x, x.y, x.z), y).normalize();
  return {
    x: new Vector3(x.x, x.y, x.z),
    y,
    z,
  };
}

export function SelectionControls() {
  const blocks = useSceneStore((s) => s.blocks);
  const waters = useSceneStore((s) => s.waters);
  const modules = useSceneStore((s) => s.modules);
  const mppts = useSceneStore((s) => s.mppts);
  const upsertBlock = useSceneStore((s) => s.upsertBlock);
  const upsertWater = useSceneStore((s) => s.upsertWater);
  const upsertModule = useSceneStore((s) => s.upsertModule);
  const upsertMppt = useSceneStore((s) => s.upsertMppt);
  const selection = useUiStore((s) => s.selection);
  const toolMode = useUiStore((s) => s.toolMode);
  const multi = useUiStore((s) => s.multi);

  const tool = useUiStore((s) => s.tool);
  const [handle, setHandle] = useState<Group | null>(null);
  const [dragging, setDragging] = useState(false);
  const lastQuat = useRef<Quaternion>(new Quaternion());

  const blockById = useMemo(() => new Map(blocks.map((b) => [b.id, b])), [blocks]);
  const waterById = useMemo(() => new Map(waters.map((w) => [w.id, w])), [waters]);

  const handleState = useMemo<HandleState | null>(() => {
    // Multiseleção: gizmo de transladar no centróide dos módulos.
    if (multi.length > 0) {
      const selected = modules.filter((m) => multi.includes(m.id));
      const sum = new Vector3();
      let count = 0;
      for (const module of selected) {
        const water = waterById.get(module.anchor.water_id);
        const block = blockById.get(module.block_id);
        if (!water || !block) {
          continue;
        }
        const pose = modulePoseLocal(module, water);
        const w = blockLocalToWorld(block, pose.position);
        sum.add(new Vector3(w.x, w.y, w.z));
        count += 1;
      }
      if (count === 0) {
        return null;
      }
      sum.divideScalar(count);
      return { position: [sum.x, sum.y, sum.z], quaternion: new Quaternion() };
    }

    if (!selection) {
      return null;
    }
    if (selection.kind === "block") {
      const block = blockById.get(selection.id);
      if (!block) {
        return null;
      }
      return {
        position: [block.place?.x ?? 0, 0, block.place?.z ?? 0],
        quaternion: new Quaternion().setFromEuler(
          new Euler(0, block.orientation_deg * DEG, 0),
        ),
      };
    }
    if (selection.kind === "water") {
      const water = waterById.get(selection.id);
      const block = blockById.get(water?.block_id ?? "");
      if (!water || !block) {
        return null;
      }
      // Pivô no CENTRO da água (mover e girar "no próprio eixo").
      const center = blockLocalToWorld(block, waterCenterPointLocal(water));
      const quat =
        toolMode === "rotate"
          ? quatOfBasis(...(Object.values(waterBasisWorld(block, water)) as [Vector3, Vector3, Vector3]))
          : new Quaternion();
      return {
        position: [center.x, center.y, center.z],
        quaternion: quat,
      };
    }
    if (selection.kind === "module") {
      const module = modules.find((m) => m.id === selection.id);
      const water = waterById.get(module?.anchor.water_id ?? "");
      const block = blockById.get(module?.block_id ?? "");
      if (!module || !water || !block) {
        return null;
      }
      const pose = modulePoseLocal(module, water);
      const center = blockLocalToWorld(block, pose.position);
      let quat = new Quaternion();
      if (toolMode === "rotate") {
        const uw = rotateLocalToWorld(block, pose.lengthAxis);
        const nw = rotateLocalToWorld(block, pose.normal);
        // Triedro destro (x × y = z) para o quaternion do gizmo.
        const z = new Vector3().crossVectors(
          new Vector3(uw.x, uw.y, uw.z),
          new Vector3(nw.x, nw.y, nw.z),
        ).normalize();
        quat = quatOfBasis(
          new Vector3(uw.x, uw.y, uw.z),
          new Vector3(nw.x, nw.y, nw.z),
          z,
        );
      }
      return { position: [center.x, center.y, center.z], quaternion: quat };
    }
    const mppt = mppts.find((m) => m.id === selection.id);
    if (mppt) {
      const place = mppt.place ?? { x: 0, y: 4.4, z: 0 };
      return { position: [place.x, place.y, place.z], quaternion: new Quaternion() };
    }
    return null;
  }, [selection, multi, modules, waters, blocks, mppts, blockById, waterById, toolMode]);

  useEffect(() => {
    if (handle && handleState && !dragging) {
      handle.position.set(...handleState.position);
      handle.quaternion.copy(handleState.quaternion);
      lastQuat.current.copy(handleState.quaternion);
    }
  }, [handle, handleState, dragging]);

  const mode = toolMode === "rotate" ? "rotate" : "translate";
  const local = toolMode === "rotate" && selection?.kind !== "block";

  const handleObjectChange = () => {
    if (!handle || handleState === null) {
      return;
    }

    if (multi.length > 0) {
      const delta = new Vector3(
        handle.position.x - handleState.position[0],
        0,
        handle.position.z - handleState.position[2],
      );
      const selected = modules.filter((m) => multi.includes(m.id));
      for (const module of selected) {
        const water = waterById.get(module.anchor.water_id);
        const block = blockById.get(module.block_id);
        if (!water || !block) {
          continue;
        }
        const pose = modulePoseLocal(module, water);
        const cur = blockLocalToWorld(block, pose.position);
        const moved = worldToBlockLocal(block, {
          x: cur.x + delta.x,
          y: pose.position.y,
          z: cur.z + delta.z,
        });
        const anchor = projectToWaterLocal(water, moved);
        if (anchor) {
          upsertModule({ ...module, anchor });
        }
      }
      handle.position.set(...handleState.position);
      return;
    }

    if (!selection) {
      return;
    }

    if (selection.kind === "block") {
      const block = blockById.get(selection.id);
      if (!block) {
        return;
      }
      if (toolMode === "rotate") {
        const orientation = ((Math.round((handle.rotation.y / DEG) % 360) + 360) % 360);
        handle.rotation.set(0, orientation * DEG, 0);
        upsertBlock({ ...block, orientation_deg: orientation });
        return;
      }
      handle.position.y = 0;
      const proposed = { ...block, place: { x: handle.position.x, z: handle.position.z } };
      const snap = snapBlockPlace(proposed, blocks);
      const x = handle.position.x + snap.dx;
      const z = handle.position.z + snap.dz;
      handle.position.set(x, 0, z);
      upsertBlock({ ...block, place: { x, z } });
      return;
    }

    if (selection.kind === "water") {
      const water = waterById.get(selection.id);
      const block = blockById.get(water?.block_id ?? "");
      if (!water || !block) {
        return;
      }
      // Girar "no próprio eixo": tilt/yaw mudam, mas o centro (pivô) fica parado.
      if (toolMode === "rotate") {
        const localCenter = waterCenterPointLocal(water);
        applyPoseDelta(handle, lastQuat, (dx, dy) => {
          const tilt = Math.max(0, Math.min(75, water.tilt_deg + dx));
          const yaw = ((water.yaw_deg + dy) % 360 + 360) % 360;
          const origin = waterOriginForCenterLocal(
            { length_m: water.length_m, depth_m: water.depth_m, yaw_deg: yaw, tilt_deg: tilt },
            localCenter,
          );
          upsertWater({
            ...water,
            tilt_deg: tilt,
            yaw_deg: yaw,
            origin_x_m: origin.x,
            origin_y_m: origin.y,
            origin_z_m: origin.z,
          });
        });
        return;
      }
      // Mover pelo centro: arrasta o centro e recalcula a origem dele.
      const startLocal = worldToBlockLocal(block, {
        x: handleState.position[0],
        y: handleState.position[1],
        z: handleState.position[2],
      });
      const target = worldToBlockLocal(block, {
        x: handle.position.x,
        y: startLocal.y,
        z: handle.position.z,
      });
      const footprint = {
        yaw_deg: water.yaw_deg,
        tilt_deg: water.tilt_deg,
        length_m: water.length_m,
        depth_m: water.depth_m,
      };
      const snap = snapWaterToBlock(block, footprint, target);
      const center = {
        x: target.x + snap.dx,
        y: startLocal.y,
        z: target.z + snap.dz,
      };
      const origin = waterOriginForCenterLocal(footprint, center);
      upsertWater({
        ...water,
        origin_x_m: origin.x,
        origin_y_m: origin.y,
        origin_z_m: origin.z,
      });
      return;
    }

    if (selection.kind === "module") {
      const module = modules.find((m) => m.id === selection.id);
      const water = waterById.get(module?.anchor.water_id ?? "");
      const block = blockById.get(module?.block_id ?? "");
      if (!module || !water || !block) {
        return;
      }
      if (toolMode === "rotate") {
        const baseTilt = module.pitch_override_deg ?? water.tilt_deg;
        applyPoseDelta(handle, lastQuat, (dx, dy) => {
          const yaw = ((module.yaw_deg + dy) % 360 + 360) % 360;
          // Arrasto só de yaw não congela a inclinação: sem override gravado a
          // placa continua colada e acompanhando a água.
          if (Math.abs(dx) > 0.5) {
            const pitch = Math.max(0, Math.min(75, baseTilt + dx));
            upsertModule({
              ...module,
              pitch_override_deg: pitch,
              yaw_deg: yaw,
            });
            return;
          }
          upsertModule({ ...module, yaw_deg: yaw });
        });
        return;
      }
      const local = worldToBlockLocal(block, {
        x: handle.position.x,
        y: modulePoseLocal(module, water).position.y,
        z: handle.position.z,
      });
      const anchor = projectToWaterLocal(water, local);
      if (anchor) {
        upsertModule({ ...module, anchor });
      }
      return;
    }

    const mppt = mppts.find((m) => m.id === selection.id);
    if (mppt) {
      const place = mppt.place ?? { x: 0, y: 4.4, z: 0 };
      upsertMppt({
        ...mppt,
        place: { x: handle.position.x, y: place.y, z: handle.position.z },
      });
    }
  };

  return (
    <>
      {tool !== "select" ? null : (
        <>
          <group
            ref={(el) => {
              if (el && el !== handle) {
                setHandle(el);
              }
            }}
            visible={false}
          />
          {handleState && (
            <TransformControls
              object={handle ?? undefined}
              mode={mode}
              space={local ? "local" : "world"}
              onMouseDown={() => setDragging(true)}
              onMouseUp={() => setDragging(false)}
              onObjectChange={handleObjectChange}
            />
          )}
        </>
      )}
    </>
  );
}

/**
 * Converte o delta de rotação do gizmo (espaço local do handle) em variação de
 * inclinação (eixo X local — dobradiça do comprimento) e yaw (eixo Y local).
 */
function applyPoseDelta(
  handle: Group,
  lastQuat: { current: Quaternion },
  onChange: (tiltDeltaDeg: number, yawDeltaDeg: number) => void,
): void {
  const inv = lastQuat.current.clone().invert();
  const delta = new Quaternion().multiplyQuaternions(handle.quaternion, inv);
  const e = new Euler().setFromQuaternion(delta, "XYZ");
  const tilt = e.x / DEG;
  const yaw = e.y / DEG;
  const rollDominant =
    Math.abs(e.z) > Math.abs(e.x) * 2 && Math.abs(e.z) > Math.abs(e.y) * 2;
  if (!rollDominant && (Math.abs(tilt) > 0.05 || Math.abs(yaw) > 0.05)) {
    onChange(-tilt, -yaw);
  }
  lastQuat.current.copy(handle.quaternion);
}
