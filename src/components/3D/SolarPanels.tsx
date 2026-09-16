import { useEffect, useMemo, useRef } from "react";
import type { InstancedMesh } from "three";
import {
  BoxGeometry,
  Color,
  DoubleSide,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from "three";
import { findModule } from "../../fixtures";
import { useShadingStore } from "../../stores/shadingStore";
import { useUiStore } from "../../stores/uiStore";
import type { Block, SolarModule, Water } from "../../types";
import { moduleDimensions } from "../../utils/calculations";
import { setPanelMatrix } from "../../utils/debugHook";
import { isDragClick } from "../../utils/pointer";
import { MODULE_THICKNESS_M, moduleBoxBasis, modulePoseLocal } from "../../utils/waterMath";

const CAPACITY = 256;
const BASE_COLOR = new Color("#0ea5e9");
const SELECTED_COLOR = new Color("#fbbf24");
const MULTI_COLOR = new Color("#67e8f9");

const geometryCache = new Map<string, BoxGeometry>();
function geometryFor(catalogId: string, len: number, wid: number): BoxGeometry | null {
  const key = `${catalogId}|${len.toFixed(3)}x${wid.toFixed(3)}`;
  let geometry = geometryCache.get(key);
  if (!geometry) {
    geometry = new BoxGeometry(len, MODULE_THICKNESS_M, wid);
    geometryCache.set(key, geometry);
  }
  return geometry;
}

function poseMatrix(pose: ReturnType<typeof modulePoseLocal>): Matrix4 {
  const rotation = new Quaternion();
  const m = new Matrix4();
  // Box (comprimento, espessura, largura) → x=lengthAxis, y=normal, z=widthAxis.
  const b = moduleBoxBasis(pose);
  m.makeBasis(
    new Vector3(b.x.x, b.x.y, b.x.z),
    new Vector3(b.y.x, b.y.y, b.y.z),
    new Vector3(b.z.x, b.z.y, b.z.z),
  );
  rotation.setFromRotationMatrix(m);
  return new Matrix4().compose(
    new Vector3(pose.position.x, pose.position.y, pose.position.z),
    rotation,
    new Vector3(1, 1, 1),
  );
}

const materialCache = new Map<string, MeshStandardMaterial>();
function familyMaterial(key: string): MeshStandardMaterial {
  let material = materialCache.get(key);
  if (!material) {
    material = new MeshStandardMaterial({
      color: "#ffffff",
      metalness: 0.15,
      roughness: 0.4,
      side: DoubleSide,
    });
    materialCache.set(key, material);
  }
  return material;
}

/** Luz final da instÃ¢ncia dado o fator e o realce (0..10). */
export function boostLum(lum: number, boost: number): number {
  const k = Math.max(0, Math.min(10, boost)) / 10;
  const shadowFloor = 0.04 + 0.18 * (1 - k);
  const litScale = 0.25 + 1.15 * k;
  if (lum <= 0.02) {
    return shadowFloor;
  }
  return Math.min(litScale * lum, 1.6);
}

function shadeColor(base: Color, lum: number, boost: number): Color {
  return base.clone().multiplyScalar(boostLum(lum, boost));
}

/** MÃ³dulos de um bloco renderizados com InstancedMesh por famÃ­lia+dimensÃ£o. */
export function BlockPanels({
  waters,
  modules,
}: {
  waters: Water[];
  modules: SolarModule[];
}) {
  const selection = useUiStore((s) => s.selection);
  const setSelection = useUiStore((s) => s.setSelection);
  const toggleMulti = useUiStore((s) => s.toggleMulti);
  const multi = useUiStore((s) => s.multi);
  const shadingResult = useShadingStore((s) => s.result);
  const sunHour = useUiStore((s) => s.sunHour);
  const lightBoost = useUiStore((s) => s.lightBoost);

  const waterById = useMemo(
    () => new Map(waters.map((w) => [w.id, w])),
    [waters],
  );

  const groups = useMemo(() => {
    const map = new Map<string, SolarModule[]>();
    for (const module of modules) {
      const dims = moduleDimensions(module);
      if (!dims) {
        continue;
      }
      const key = `${module.catalog_id}|${dims.length_m.toFixed(3)}x${dims.width_m.toFixed(3)}`;
      const list = map.get(key) ?? [];
      list.push(module);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [modules]);

  return (
    <>
      {groups.map(([key, rows]) => (
        <FamilyMesh
          key={key}
          waters={waterById}
          rows={rows}
          familyKey={key}
          selected={selection}
          multi={multi}
          onPick={(id, additive) =>
            additive ? toggleMulti(id) : setSelection({ kind: "module", id })
          }
          shading={shadingResult}
          sunHour={sunHour}
          lightBoost={lightBoost}
        />
      ))}
    </>
  );
}

function FamilyMesh({
  waters,
  rows,
  familyKey,
  selected,
  multi,
  onPick,
  shading,
  sunHour,
  lightBoost,
}: {
  waters: Map<string, Water>;
  rows: SolarModule[];
  familyKey: string;
  selected: { kind: string; id: string } | null;
  multi: string[];
  onPick: (id: string, additive: boolean) => void;
  shading: ReturnType<typeof useShadingStore.getState>["result"];
  sunHour: number;
  lightBoost: number;
}) {
  const meshRef = useRef<InstancedMesh>(null);
  const first = rows[0];
  const dims = moduleDimensions(first)!;
  const geometry = geometryFor(first.catalog_id, dims.length_m, dims.width_m);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) {
      return;
    }
    const count = Math.min(rows.length, CAPACITY);
    mesh.count = count;
    const factorIndex = new Map<string, number>();
    if (shading) {
      shading.moduleOrder.forEach((id, index) => factorIndex.set(id, index));
    }
    const M = shading?.moduleOrder.length ?? 0;
    const hour = Math.min(23, Math.max(0, Math.floor(sunHour)));
    for (let i = 0; i < count; i++) {
      const row = rows[i];
      const water = waters.get(row.anchor.water_id);
      if (!water) {
        continue;
      }
      const pose = modulePoseLocal(row, water);
      const mat = poseMatrix(pose);
      mesh.setMatrixAt(i, mat);
      if (import.meta.env.DEV) {
        setPanelMatrix(row.id, Array.from(mat.elements));
      }
      const isSelected = selected?.kind === "module" && selected.id === row.id;
      const isMulti = multi.includes(row.id);
      const base = isSelected
        ? SELECTED_COLOR
        : isMulti
          ? MULTI_COLOR
          : BASE_COLOR;
      const index = factorIndex.get(row.id);
      if (index === undefined) {
        mesh.setColorAt(i, base);
      } else {
        const lum = shading!.factorByModuleHour[hour * M + index];
        mesh.setColorAt(i, shadeColor(base, Number.isFinite(lum) ? lum : 0, lightBoost));
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [rows, waters, selected, multi, shading, sunHour, lightBoost]);

  if (!geometry) {
    return null;
  }

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, familyMaterial(familyKey), CAPACITY]}
      castShadow
      receiveShadow
      onClick={(e) => {
        e.stopPropagation();
        if (isDragClick(e.nativeEvent)) {
          return;
        }
        if (e.instanceId === undefined || e.instanceId >= rows.length) {
          return;
        }
        const additive = e.nativeEvent.ctrlKey || e.nativeEvent.metaKey;
        onPick(rows[e.instanceId].id, additive);
      }}
    />
  );
}

/** Fantasma do mÃ³dulo a inserir (segue a Ã¡gua sob o ponteiro). */
export function PlacementGhost({
  block,
  waters,
}: {
  block: Block;
  waters: Water[];
}) {
  const placementFamily = useUiStore((s) => s.placementFamily);
  const hover = useUiStore((s) => s.hover);
  const tool = useUiStore((s) => s.tool);
  const installWaterId = useUiStore((s) => s.installWaterId);

  const water = hover ? waters.find((w) => w.id === hover.waterId) : undefined;
  const family = placementFamily ? findModule(placementFamily) : undefined;

  const restricted =
    tool === "install" && installWaterId !== null && water?.id !== installWaterId;

  const dims = family && !restricted
    ? { length_m: family.length_m, width_m: family.width_m }
    : null;

  const geometry = dims
    ? geometryFor(family!.id, dims.length_m, dims.width_m)
    : null;

  const pose = useMemo(() => {
    if (!water || !hover || !placementFamily) {
      return null;
    }
    const pseudo: SolarModule = {
      id: "__ghost__",
      catalog_id: placementFamily,
      block_id: block.id,
      anchor: { water_id: water.id, u_m: hover.u, v_m: hover.v },
      yaw_deg: 0,
      mppt_id: null,
      external_refs: [],
    };
    return modulePoseLocal(pseudo, water);
  }, [water, hover, placementFamily, block.id]);

  if (!pose || !geometry) {
    return null;
  }

  const m = poseMatrix(pose);
  const q = new Quaternion();
  m.decompose(new Vector3(), q, new Vector3());

  return (
    <mesh
      geometry={geometry}
      position={[pose.position.x, pose.position.y, pose.position.z]}
      quaternion={q}
    >
      <meshStandardMaterial
        color="#fef08a"
        transparent
        opacity={0.45}
        depthWrite={false}
        side={DoubleSide}
      />
    </mesh>
  );
}

