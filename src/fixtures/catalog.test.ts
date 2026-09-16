import { describe, expect, it } from "vitest";
import { isExportDocument } from "../export/serializer";
import { catalog, catalogItems } from "./index";
import scn001 from "./examples/scn-001.json";

describe("catalogo mockado", () => {
  it("ids sao unicos, ascii e estaveis", () => {
    const items = catalogItems();
    const ids = items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("todos os itens estao em validated ou alem (gate do piloto)", () => {
    for (const item of catalogItems()) {
      expect(["validated", "fixture-ready", "building"]).toContain(
        item.status,
      );
      expect(item.evidence.startsWith("plan.txt")).toBe(true);
      expect(item.kind).toBeTruthy();
    }
  });

  it("pelo menos 3 modulos com valores de ordem de grandeza san", () => {
    expect(catalog.modules.length).toBeGreaterThanOrEqual(3);
    for (const m of catalog.modules) {
      expect(m.nominal_wp).toBeGreaterThanOrEqual(100);
      expect(m.nominal_wp).toBeLessThanOrEqual(1000);
      expect(m.vmp_v).toBeGreaterThanOrEqual(20);
      expect(m.vmp_v).toBeLessThanOrEqual(80);
      expect(m.efficiency_pct).toBeGreaterThanOrEqual(10);
      expect(m.efficiency_pct).toBeLessThanOrEqual(30);
      expect(m.length_m).toBeGreaterThan(0);
      expect(m.width_m).toBeGreaterThan(0);
    }
  });

  it("1-2 telhados, 1 mppt e 1 irradiancia com faixas sanas", () => {
    expect(catalog.roofs.length).toBeGreaterThanOrEqual(1);
    expect(catalog.roofs.length).toBeLessThanOrEqual(2);
    for (const r of catalog.roofs) {
      expect(r.defaults.tilt_deg).toBeGreaterThanOrEqual(0);
      expect(r.defaults.tilt_deg).toBeLessThanOrEqual(60);
      expect(r.defaults.width_m).toBeGreaterThan(0);
      expect(r.defaults.depth_m).toBeGreaterThan(0);
    }
    expect(catalog.mppts).toHaveLength(1);
    expect(catalog.mppts[0].v_max_v).toBeGreaterThan(0);
    expect(catalog.mppts[0].i_max_a).toBeGreaterThan(0);

    expect(catalog.irradiance).toHaveLength(1);
    const irr = catalog.irradiance[0];
    expect(irr.hourly_w_m2).toHaveLength(24);
    let totalWh = 0;
    for (const sample of irr.hourly_w_m2) {
      totalWh += sample;
      expect(sample).toBeGreaterThanOrEqual(0);
      expect(sample).toBeLessThanOrEqual(1200);
    }
    const totalKwhPerM2 = totalWh / 1000;
    expect(totalKwhPerM2).toBeGreaterThanOrEqual(1);
    expect(totalKwhPerM2).toBeLessThanOrEqual(10);
  });
});

describe("exemplo scn-001", () => {
  it("e um export solar-sim v1 valido", () => {
    expect(isExportDocument(scn001)).toBe(true);
  });

  it("referencia apenas fixtures existentes e consistentes", () => {
    const ids = new Set(catalogItems().map((i) => `fixture:${i.id}`));
    for (const ref of scn001.scenario.catalog_refs) {
      expect(ids.has(ref.item)).toBe(true);
    }
    expect(scn001.modules).toHaveLength(1);
    const module = scn001.modules[0];
    const roofIds = scn001.roofs.map((r) => r.id);
    expect(roofIds).toContain(module.roof_id);
    expect(scn001.building?.roof_ids).toEqual(roofIds);
    expect(scn001.mppts.map((m) => m.id)).toContain(module.mppt_id);
  });
});
