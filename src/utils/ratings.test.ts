import { describe, expect, it } from "vitest";
import type { Mppt, SolarModule } from "../types";
import { formatWp, installedRatings, moduleWp } from "./ratings";

const module550: SolarModule = {
  id: "mod-001",
  catalog_id: "pv-mod-550g",
  block_id: "bk-001",
  anchor: { water_id: "bk-001-1", u_m: 4, v_m: 1 },
  yaw_deg: 0,
  mppt_id: "mppt-001",
  external_refs: [],
};

const module430 = (id: string, mpptId: string | null): SolarModule => ({
  ...module550,
  id,
  catalog_id: "pv-mod-430g",
  mppt_id: mpptId,
});

const mppt: Mppt = {
  id: "mppt-001",
  preset_id: "mppt-node-01",
  name: "MPPT 01",
  external_refs: [],
};

describe("formatWp (kWp técnico)", () => {
  it("abaixo de 1000 W mostra Wp", () => {
    expect(formatWp(550)).toBe("550 Wp");
  });
  it("acima mostra kWp com 2 casas", () => {
    expect(formatWp(1100)).toBe("1,10 kWp");
    expect(formatWp(2270)).toBe("2,27 kWp");
  });
});

describe("installedRatings", () => {
  it("totaliza Wp efetivo (com override elétrico) por MPPT e cena", () => {
    const modules = [
      { ...module430("a", "mppt-001"), overrides: { nominal_wp: 600 } },
      module430("b", null),
    ];
    const ratings = installedRatings(modules, [mppt]);
    expect(moduleWp(modules[0])).toBe(600);
    expect(moduleWp(modules[1])).toBe(430);
    expect(ratings.totalWp).toBe(1030);
    const row = ratings.byMppt.find((r) => r.mpptId === "mppt-001")!;
    expect(row.moduleCount).toBe(1);
    expect(row.wp).toBe(600);
    const loose = ratings.byMppt.find((r) => r.mpptId === null)!;
    expect(loose.wp).toBe(430);
  });
});
