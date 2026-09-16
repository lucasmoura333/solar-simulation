import { describe, expect, it } from "vitest";
import type { Block, SolarModule, Water } from "../types";
import { snapBlockPlace, snapWaterToBlock } from "./snapping";
import { coverBlockModules, repartitionAnchor, splitWaterWithIds } from "./waterTools";
import { waterSurfacePointLocal } from "./waterMath";

const blockA: Block = {
  id: "bk-001",
  name: "A",
  orientation_deg: 0,
  width_m: 8,
  depth_m: 5,
  wall_height_m: 3,
  place: { x: 0, z: 0 },
  external_refs: [],
};

const water: Water = {
  id: "bk-001-1",
  block_id: "bk-001",
  name: "Frente",
  origin_x_m: -4,
  origin_y_m: 3,
  origin_z_m: 2.5,
  length_m: 8,
  depth_m: 2.5,
  tilt_deg: 25,
  yaw_deg: 0,
  external_refs: [],
};

describe("snapBlockPlace", () => {
  it("encaixa borda quando outro bloco está perto", () => {
    const moving: Block = { ...blockA, id: "bk-002", place: { x: 8.2, z: 0 } };
    const other: Block = { ...blockA, id: "bk-001", place: { x: 0, z: 0 } };
    const snap = snapBlockPlace(moving, [other]);
    // borda +4 (bloco A) vs borda -4 do moving em 8.2-4=4.2 → delta -0.2
    expect(snap.snapX).toBe(true);
    expect(snap.dx).toBeCloseTo(-0.2, 5);
  });

  it("não encaixa quando longe", () => {
    const moving: Block = { ...blockA, id: "bk-002", place: { x: 20, z: 0 } };
    const snap = snapBlockPlace(moving, [blockA]);
    expect(snap.snapX).toBe(false);
    expect(snap.dx).toBe(0);
  });
});

describe("snapWaterToBlock (pivô no centro)", () => {
  const shape = { yaw_deg: 0, length_m: 8, depth_m: 2.5 };
  it("centro exato da água não corrige", () => {
    const snap = snapWaterToBlock(blockA, shape, { x: 0, z: 1.25 });
    expect(snap.snapX).toBe(false);
    expect(snap.snapZ).toBe(false);
    expect(snap.dx).toBe(0);
    expect(snap.dz).toBe(0);
  });

  it("canto da pegada perto da borda encosta", () => {
    const snap = snapWaterToBlock(blockA, shape, { x: 0, z: 1.4 });
    expect(snap.snapZ).toBe(true);
    expect(snap.dz).toBeCloseTo(-0.15, 5);
  });
});

describe("splitWater", () => {
  it("divide ao longo do comprimento mantendo a superfície original", () => {
    const { first, second } = splitWaterWithIds(water, "length");
    expect(first.length_m).toBeCloseTo(4, 6);
    expect(second.length_m).toBeCloseTo(4, 6);
    expect(second.origin_x_m).toBeCloseTo(0, 6);
    // ponto no fim da segunda metade == canto original
    const end = waterSurfacePointLocal(second, second.length_m, 0);
    const originalEnd = waterSurfacePointLocal(water, water.length_m, 0);
    expect(end.x).toBeCloseTo(originalEnd.x, 6);
    expect(end.z).toBeCloseTo(originalEnd.z, 6);
  });

  it("metades resultantes não podem ser divididas de novo", () => {
    const { first, second } = splitWaterWithIds(water, "length");
    expect(first.can_split).toBe(false);
    expect(second.can_split).toBe(false);
  });

  it("divide ao longo da subida elevando a origem da segunda metade", () => {
    const { first, second } = splitWaterWithIds(water, "rise");
    expect(first.depth_m).toBeCloseTo(1.25, 6);
    expect(second.depth_m).toBeCloseTo(1.25, 6);
    const tan = Math.tan((25 * Math.PI) / 180);
    expect(second.origin_y_m).toBeCloseTo(3 + 1.25 * tan, 6);
    const end = waterSurfacePointLocal(second, 0, second.depth_m);
    const originalEnd = waterSurfacePointLocal(water, 0, water.depth_m);
    expect(end.y).toBeCloseTo(originalEnd.y, 6);
    expect(end.z).toBeCloseTo(originalEnd.z, 6);
  });
});

describe("repartição de módulos na divisão", () => {
  const module: SolarModule = {
    id: "mod-001",
    catalog_id: "pv-mod-550g",
    block_id: "bk-001",
    anchor: { water_id: water.id, u_m: 6, v_m: 1 },
    yaw_deg: 0,
    mppt_id: null,
    external_refs: [],
  };
  it("módulo na segunda metade do comprimento muda de água preservando u", () => {
    const { first, second } = splitWaterWithIds(water, "length");
    const moved = repartitionAnchor(module, water, "length", first.id, second.id);
    expect(moved.anchor.water_id).toBe(second.id);
    expect(moved.anchor.u_m).toBeCloseTo(2, 6);
  });
});

describe("coverBlockModules (cobrir todo o telhado)", () => {
  const back: Water = { ...water, id: "bk-001-2", origin_x_m: 4, origin_z_m: -2.5, yaw_deg: 180 };
  const dims = { length_m: 2.28, width_m: 1.13 };

  it("gera fileiras em todas as águas com ids únicos e yaw 0", () => {
    const rows = coverBlockModules([water, back], "pv-mod-550g", dims, []);
    expect(rows.length).toBeGreaterThan(4);
    const ids = new Set(rows.map((r) => r.id));
    expect(ids.size).toBe(rows.length);
    for (const row of rows) {
      expect(row.yaw_deg).toBe(0);
      expect(row.catalog_id).toBe("pv-mod-550g");
      expect(row.block_id).toBe("bk-001");
    }
    const frontAnchors = rows.filter((r) => r.anchor.water_id === water.id);
    const backAnchors = rows.filter((r) => r.anchor.water_id === back.id);
    expect(frontAnchors.length).toBeGreaterThan(0);
    expect(backAnchors.length).toBeGreaterThan(0);
  });

  it("âncoras ficam dentro dos limites com margem e sem sobrepor colunas", () => {
    const rows = coverBlockModules([water], "pv-mod-550g", dims, []);
    const margin = 0.1;
    const us = rows.map((r) => r.anchor.u_m).sort((a, b) => a - b);
    const vs = rows.map((r) => r.anchor.v_m).sort((a, b) => a - b);
    expect(us[0]).toBeGreaterThanOrEqual(margin + dims.length_m / 2 - 1e-9);
    expect(us[us.length - 1]).toBeLessThanOrEqual(water.length_m - margin - dims.length_m / 2 + 1e-9);
    for (let i = 1; i < us.length; i++) {
      const step = us[i] - us[i - 1];
      if (step > 1e-6) {
        expect(step).toBeGreaterThanOrEqual(dims.length_m);
      }
    }
    expect(vs[0]).toBeGreaterThanOrEqual(0.5);
    expect(vs[vs.length - 1]).toBeLessThanOrEqual(water.depth_m - 0.5);
  });

  it("continua a sequência de ids existentes", () => {
    const rows = coverBlockModules([water], "pv-mod-550g", dims, ["mod-001", "mod-002"]);
    expect(rows[0].id).toBe("mod-003");
  });
});
