import { describe, expect, it } from "vitest";
import type { Block, SolarModule, Water } from "../types";
import {
  blockLocalToWorld,
  moduleBoxBasis,
  modulePoseLocal,
  projectToWaterFromGround,
  projectToWaterLocal,
  rotateAround,
  waterCenterPointLocal,
  waterNormalLocal,
  waterOriginForCenterLocal,
  waterSurfacePointLocal,
  worldToBlockLocal,
} from "./waterMath";

const block: Block = {
  id: "bk-001",
  name: "B",
  orientation_deg: 0,
  width_m: 8,
  depth_m: 5,
  wall_height_m: 3,
  place: { x: 0, z: 0 },
  external_refs: [],
};

const waterFront: Water = {
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

const waterBack: Water = {
  ...waterFront,
  id: "bk-001-2",
  name: "Fundo",
  origin_x_m: 4,
  origin_z_m: -2.5,
  yaw_deg: 180,
};

function moduleOf(anchor: { u_m: number; v_m: number }, waterId: string): SolarModule {
  return {
    id: "mod-001",
    catalog_id: "pv-mod-550g",
    block_id: "bk-001",
    anchor: { water_id: waterId, ...anchor },
    yaw_deg: 0,
    mppt_id: null,
    external_refs: [],
  };
}

describe("superfÃ­cie das Ã¡guas (frame local)", () => {
  it("Ã¡gua da frente: beirado em z=+2.5 e cumeeira em z=0 na altura certa", () => {
    const p0 = waterSurfacePointLocal(waterFront, 4, 0);
    expect(p0.x).toBeCloseTo(0, 6);
    expect(p0.y).toBeCloseTo(3, 6);
    expect(p0.z).toBeCloseTo(2.5, 6);
    const ridge = waterSurfacePointLocal(waterFront, 4, 2.5);
    expect(ridge.y).toBeCloseTo(3 + 2.5 * Math.tan((25 * Math.PI) / 180), 6);
    expect(ridge.z).toBeCloseTo(0, 6);
    expect(waterFront.length_m).toBe(8);
  });

  it("Ã¡gua do fundo: origem no outro canto, sobe em +z atÃ© a cumeeira", () => {
    const ridge = waterSurfacePointLocal(waterBack, 8, 2.5);
    expect(ridge.x).toBeCloseTo(-4, 6);
    expect(ridge.z).toBeCloseTo(0, 6);
    const eave = waterSurfacePointLocal(waterBack, 0, 0);
    expect(eave.x).toBeCloseTo(4, 6);
    expect(eave.z).toBeCloseTo(-2.5, 6);
  });

  it("normais: frente e fundo inclinadas para fora", () => {
    const nFront = waterNormalLocal(waterFront);
    const t = Math.tan((25 * Math.PI) / 180);
    const k = Math.hypot(1, t);
    expect(nFront.x).toBeCloseTo(0, 5);
    expect(nFront.y).toBeCloseTo(1 / k, 5);
    expect(nFront.z).toBeCloseTo(t / k, 5);
    const nBack = waterNormalLocal(waterBack);
    expect(nBack.z).toBeCloseTo(-t / k, 5);
  });

  it("centro da agua da frente fica no meio do retangulo", () => {
    const c = waterCenterPointLocal(waterFront);
    expect(c.x).toBeCloseTo(0, 6);
    expect(c.y).toBeCloseTo(3 + 1.25 * Math.tan((25 * Math.PI) / 180), 6);
    expect(c.z).toBeCloseTo(1.25, 6);
  });

  it("origem-para-centro faz roundtrip (yaw 0 e 180)", () => {
    const cFront = waterCenterPointLocal(waterFront);
    const oFront = waterOriginForCenterLocal(waterFront, cFront);
    expect(oFront.x).toBeCloseTo(waterFront.origin_x_m, 6);
    expect(oFront.y).toBeCloseTo(waterFront.origin_y_m, 6);
    expect(oFront.z).toBeCloseTo(waterFront.origin_z_m, 6);
    const cBack = waterCenterPointLocal(waterBack);
    const oBack = waterOriginForCenterLocal(waterBack, cBack);
    expect(oBack.x).toBeCloseTo(waterBack.origin_x_m, 6);
    expect(oBack.y).toBeCloseTo(waterBack.origin_y_m, 6);
    expect(oBack.z).toBeCloseTo(waterBack.origin_z_m, 6);
  });

  it("mudar tilt mantem o centro parado no mesmo ponto", () => {
    const c0 = waterCenterPointLocal(waterFront);
    const origin = waterOriginForCenterLocal({ ...waterFront, tilt_deg: 40 }, c0);
    const moved: typeof waterFront = { ...waterFront, tilt_deg: 40, origin_x_m: origin.x, origin_y_m: origin.y, origin_z_m: origin.z };
    const c1 = waterCenterPointLocal(moved);
    expect(c1.x).toBeCloseTo(c0.x, 6);
    expect(c1.y).toBeCloseTo(c0.y, 6);
    expect(c1.z).toBeCloseTo(c0.z, 6);
  });
});

describe("pose de mÃ³dulo ancorado", () => {
  it("colado: normal = normal da Ã¡gua e posiÃ§Ã£o acima da superfÃ­cie", () => {
    const pose = modulePoseLocal(moduleOf({ u_m: 4, v_m: 1.25 }, waterFront.id), waterFront);
    expect(pose.normal.y).toBeCloseTo(waterNormalLocal(waterFront).y, 6);
    const surface = waterSurfacePointLocal(waterFront, 4, 1.25);
    expect(pose.position.y).toBeGreaterThan(surface.y);
  });

  it("yaw 90Â° roda o comprimento dentro do plano", () => {
    const colado = moduleOf({ u_m: 4, v_m: 1.25 }, waterFront.id);
    const p0 = modulePoseLocal(colado, waterFront);
    const p90 = modulePoseLocal({ ...colado, yaw_deg: 90 }, waterFront);
    const d = Math.abs(p0.lengthAxis.x) + Math.abs(p90.lengthAxis.x);
    expect(d).toBeGreaterThan(0.001);
  });

  it("pitch override descola a normal da Ã¡gua", () => {
    const colado = moduleOf({ u_m: 4, v_m: 1.25 }, waterFront.id);
    const solto = { ...colado, pitch_override_deg: 5 };
    const p0 = modulePoseLocal(colado, waterFront);
    const p1 = modulePoseLocal(solto, waterFront);
    expect(p1.normal.y).not.toBeCloseTo(p0.normal.y, 6);
  });

  it("box 3D: x=comprimento, y=normal (espessura), z=largura no plano", () => {
    for (const water of [waterFront, waterBack]) {
      const pose = modulePoseLocal(moduleOf({ u_m: 4, v_m: 1.25 }, water.id), water);
      const basis = moduleBoxBasis(pose);
      const normal = waterNormalLocal(water);
      const dot = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) =>
        a.x * b.x + a.y * b.y + a.z * b.z;
      expect(dot(basis.y, normal)).toBeCloseTo(1, 6);
      expect(dot(basis.x, normal)).toBeCloseTo(0, 6);
      expect(dot(basis.z, normal)).toBeCloseTo(0, 6);
      expect(dot(basis.x, pose.lengthAxis)).toBeCloseTo(1, 6);
      expect(dot(basis.z, pose.widthAxis)).toBeCloseTo(1, 6);
      // Triedro DESTRO (x × y = z, det +1): matriz de rotação válida —
      // a ordem inversa gerava quaternions inválidos (placas planas).
      const cross = {
        x: basis.x.y * basis.y.z - basis.x.z * basis.y.y,
        y: basis.x.z * basis.y.x - basis.x.x * basis.y.z,
        z: basis.x.x * basis.y.y - basis.x.y * basis.y.x,
      };
      expect(dot(cross, basis.z)).toBeCloseTo(1, 6);
    }
  });
});

describe("projeÃ§Ã£o e world roundtrip", () => {
  it("projeta ponto na superfÃ­cie de volta em u/v e rejeita fora", () => {
    const p = waterSurfacePointLocal(waterFront, 3, 1.5);
    const anchor = projectToWaterLocal(waterFront, p);
    expect(anchor).not.toBeNull();
    expect(anchor!.u_m).toBeCloseTo(3, 5);
    expect(anchor!.v_m).toBeCloseTo(1.5, 5);
    expect(projectToWaterLocal(waterFront, { x: 10, y: 4, z: 10 })).toBeNull();
  });

  it("roundtrip na Ã¡gua do fundo (yaw 180, U=âˆ’x)", () => {
    const p = waterSurfacePointLocal(waterBack, 6, 1);
    expect(p.x).toBeCloseTo(-2, 5);
    const anchor = projectToWaterLocal(waterBack, p);
    expect(anchor).not.toBeNull();
    expect(anchor!.u_m).toBeCloseTo(6, 5);
    expect(anchor!.v_m).toBeCloseTo(1, 5);
  });

  it("projeÃ§Ã£o do chÃ£o resolve u/v independente da altura", () => {
    const p = waterSurfacePointLocal(waterFront, 2, 1);
    const fromGround = projectToWaterFromGround(waterFront, { x: p.x, z: p.z });
    expect(fromGround).not.toBeNull();
    expect(fromGround!.u_m).toBeCloseTo(2, 5);
    expect(fromGround!.v_m).toBeCloseTo(1, 5);
    const backGround = projectToWaterFromGround(waterBack, { x: 1, z: -1 });
    expect(backGround).not.toBeNull();
    expect(backGround!.u_m).toBeCloseTo(3, 5); // origem x=4, U=âˆ’x â†’ u = 3
  });

  it("localâ†’worldâ†’local preserva o ponto (com yaw e place)", () => {
    const rotated: Block = { ...block, orientation_deg: 40, place: { x: 3, z: -2 } };
    const local = { x: 1.5, y: 4.25, z: -0.75 };
    const world = blockLocalToWorld(rotated, local);
    const back = worldToBlockLocal(rotated, world);
    expect(back.x).toBeCloseTo(local.x, 6);
    expect(back.y).toBeCloseTo(local.y, 6);
    expect(back.z).toBeCloseTo(local.z, 6);
  });
});

describe("rotateAround", () => {
  it("gira 90Â° o eixo x no eixo y", () => {
    const v = rotateAround({ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, Math.PI / 2);
    expect(v.x).toBeCloseTo(0, 5);
    expect(v.z).toBeCloseTo(-1, 5);
  });
});

