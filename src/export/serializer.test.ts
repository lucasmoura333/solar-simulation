import { describe, expect, it } from "vitest";
import {
  buildExportDocument,
  EXPORT_FORMAT,
  EXPORT_VERSION,
  isExportDocument,
  isExportDocumentV1,
  isExportDocumentV2,
} from "./serializer";
import type { SceneState } from "../types";
import scn001 from "../fixtures/examples/scn-001.json";

const scene: SceneState = {
  building: { id: "bld-001", name: "edificacao generica", external_refs: [] },
  blocks: [
    {
      id: "bk-001",
      name: "Bloco",
      orientation_deg: 0,
      width_m: 8,
      depth_m: 5,
      wall_height_m: 3,
      place: { x: 0, z: 0 },
      external_refs: [],
    },
  ],
  waters: [
    {
      id: "bk-001-1",
      block_id: "bk-001",
      name: "Água frente",
      origin_x_m: -4,
      origin_y_m: 3,
      origin_z_m: 2.5,
      length_m: 8,
      depth_m: 2.5,
      tilt_deg: 25,
      yaw_deg: 0,
      external_refs: [],
    },
  ],
  mppts: [
    { id: "mppt-001", preset_id: "mppt-node-01", name: "MPPT 01", external_refs: [] },
  ],
  modules: [
    {
      id: "mod-001",
      catalog_id: "pv-mod-550g",
      block_id: "bk-001",
      anchor: { water_id: "bk-001-1", u_m: 4, v_m: 1.2 },
      yaw_deg: 0,
      mppt_id: "mppt-001",
      external_refs: [],
    },
  ],
};

describe("serializer solar-sim export v2", () => {
  it("produz envelope v2 válido e reconhecido", async () => {
    const doc = await buildExportDocument(scene, "scn-001", "cenario-teste");
    expect(doc.format).toBe(EXPORT_FORMAT);
    expect(doc.version).toBe(EXPORT_VERSION);
    expect(isExportDocumentV2(doc)).toBe(true);
    expect(isExportDocument(doc)).toBe(true);
    expect(doc.waters).toHaveLength(1);
    expect(doc.modules[0].anchor.u_m).toBe(4);
  });

  it("idempotency_key estável e hash muda quando a cena muda", async () => {
    const a = await buildExportDocument(scene, "scn-001", "c");
    const b = await buildExportDocument(scene, "scn-001", "c");
    expect(a.scenario.idempotency_key).toBe(b.scenario.idempotency_key);
    const changed: SceneState = {
      ...scene,
      waters: [{ ...scene.waters[0], tilt_deg: 30 }],
    };
    const c = await buildExportDocument(changed, "scn-001", "c");
    expect(a.scenario.graph_snapshot_hash).not.toBe(c.scenario.graph_snapshot_hash);
  });

  it("guards v1 e v2 separados", async () => {
    expect(isExportDocumentV2({ format: "x", version: 2 })).toBe(false);
    expect(isExportDocumentV1(scn001)).toBe(true);
    expect(isExportDocumentV2(scn001)).toBe(false);
    expect(isExportDocument(scn001)).toBe(true);
    expect(isExportDocument(null)).toBe(false);
  });
});
