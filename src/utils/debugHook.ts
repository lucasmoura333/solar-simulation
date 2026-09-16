import { Matrix4, Quaternion, Vector3 } from "three";
import type { Vec3 } from "../types";
import { useSceneStore } from "../stores/sceneStore";
import { moduleBoxBasis, modulePoseLocal } from "./waterMath";

export interface PanelProbeRow {
  id: string;
  blockId: string;
  waterId: string;
  waterTilt: number | null;
  waterYaw: number | null;
  waterOrigin: [number, number, number] | null;
  waterLength: number | null;
  waterDepth: number | null;
  anchorU: number;
  anchorV: number;
  pitchOverride: number | null;
  moduleYaw: number;
  /** Normal calculada pela pose (mesmas funções do render). */
  poseNormal: [number, number, number] | null;
  /** Normal real do InstancedMesh (coluna Y da matriz, frame local do bloco). */
  matrixNormal: [number, number, number] | null;
  /** Centro real do InstancedMesh (translação da matriz, frame local). */
  matrixPosition: [number, number, number] | null;
  /** Eixo X da matriz (comprimento) e eixo Z (largura no plano). */
  matrixX: [number, number, number] | null;
  matrixZ: [number, number, number] | null;
  /** Matriz completa capturada (16 elementos, column-major). */
  matrixFull: number[] | null;
  /** Recálculo in-page da base usada pelo render (length/normal/width/pos). */
  recomputed:
    | {
        lengthAxis: [number, number, number];
        normal: [number, number, number];
        widthAxis: [number, number, number];
        position: [number, number, number];
      }
    | null;
}

const panelMats = new Map<string, number[]>();

/** Registra a matriz de instância de um módulo (chamado pelo render). */
export function setPanelMatrix(id: string, elements: number[]): void {
  panelMats.set(id, elements);
}

/** Remove entradas de módulos que não existem mais na cena. */
export function prunePanelMatrices(ids: Set<string>): void {
  for (const key of Array.from(panelMats.keys())) {
    if (!ids.has(key)) {
      panelMats.delete(key);
    }
  }
}

const asTuple = (v: Vec3): [number, number, number] => [v.x, v.y, v.z];

export function probeModules(): PanelProbeRow[] {
  const s = useSceneStore.getState();
  const waters = new Map(s.waters.map((w) => [w.id, w]));
  prunePanelMatrices(new Set(s.modules.map((m) => m.id)));
  return s.modules.map((m) => {
    const w = waters.get(m.anchor.water_id);
    let poseNormal: [number, number, number] | null = null;
    let recomputed: PanelProbeRow["recomputed"] = null;
    if (w) {
      const p = modulePoseLocal(m, w);
      poseNormal = asTuple(p.normal);
      const b = moduleBoxBasis(p);
      recomputed = {
        lengthAxis: asTuple(b.x),
        normal: asTuple(b.y),
        widthAxis: asTuple(b.z),
        position: asTuple(p.position),
      };
    }
    const els = panelMats.get(m.id);
    return {
      id: m.id,
      blockId: m.block_id,
      waterId: m.anchor.water_id,
      waterTilt: w?.tilt_deg ?? null,
      waterYaw: w?.yaw_deg ?? null,
      waterOrigin: w ? [w.origin_x_m, w.origin_y_m, w.origin_z_m] : null,
      waterLength: w?.length_m ?? null,
      waterDepth: w?.depth_m ?? null,
      anchorU: m.anchor.u_m,
      anchorV: m.anchor.v_m,
      pitchOverride: m.pitch_override_deg ?? null,
      moduleYaw: m.yaw_deg,
      poseNormal,
      matrixNormal: els ? [els[4], els[5], els[6]] : null,
      matrixPosition: els ? [els[12], els[13], els[14]] : null,
      matrixX: els ? [els[0], els[1], els[2]] : null,
      matrixZ: els ? [els[8], els[9], els[10]] : null,
      matrixFull: els ? Array.from(els) : null,
      recomputed,
    };
  });
}

/**
 * Gancho de diagnóstico (somente DEV): expõe cena bruta e sonda de módulos
 * para validação headless das matrizes reais do InstancedMesh.
 */
export function installSolarDebug(): void {
  if (!import.meta.env.DEV) {
    return;
  }
  if (typeof window === "undefined") {
    return;
  }
  const w = window as unknown as { __solarDebug?: unknown };
  if (w.__solarDebug) {
    return;
  }
  w.__solarDebug = {
    scene: () => {
      const s = useSceneStore.getState();
      return {
        building: s.building,
        blocks: s.blocks,
        waters: s.waters,
        mppts: s.mppts,
        modules: s.modules,
      };
    },
    probeModules,
    /** Recomputa a matriz exatamente como o render (mesmos imports do three). */
    recomputeMatrix: (id: string): number[] | null => {
      const s = useSceneStore.getState();
      const mod = s.modules.find((x) => x.id === id);
      const w = mod && s.waters.find((x) => x.id === mod.anchor.water_id);
      if (!mod || !w) {
        return null;
      }
      const pose = modulePoseLocal(mod, w);
      const b = moduleBoxBasis(pose);
      const basis = new Matrix4();
      basis.makeBasis(
        new Vector3(b.x.x, b.x.y, b.x.z),
        new Vector3(b.y.x, b.y.y, b.y.z),
        new Vector3(b.z.x, b.z.y, b.z.z),
      );
      const q = new Quaternion().setFromRotationMatrix(basis);
      const out = new Matrix4().compose(
        new Vector3(pose.position.x, pose.position.y, pose.position.z),
        q,
        new Vector3(1, 1, 1),
      );
      return Array.from(out.elements);
    },
    threeRevision: async () => {
      const three = await import("three");
      return (three as unknown as { REVISION: string }).REVISION;
    },
  };
}
