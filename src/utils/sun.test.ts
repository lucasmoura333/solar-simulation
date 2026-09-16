import { describe, expect, it } from "vitest";
import { LOCATION, sunDirectionWorld, sunPositionAt } from "./sun";

describe("posicao solar (suncalc/NOAA)", () => {
  it("meio-dia de setembro em SP tem sol alto e ao norte (az ~0/360)", () => {
    const pos = sunPositionAt(12, "2026-09-07T12:00:00Z", LOCATION);
    expect(pos.elevationDeg).toBeGreaterThan(40);
    expect(pos.elevationDeg).toBeLessThan(85);
    const nearNorth = pos.azimuthDeg < 45 || pos.azimuthDeg > 315;
    expect(nearNorth).toBe(true);
  });

  it("meia-noite o sol está abaixo do horizonte", () => {
    const pos = sunPositionAt(0, "2026-09-07T12:00:00Z", LOCATION);
    expect(pos.elevationDeg).toBeLessThan(0);
  });

  it("direção de mundo aponta leste de manhã e tem componente vertical coerente", () => {
    const morning = sunPositionAt(8, "2026-09-07T12:00:00Z", LOCATION);
    expect(morning.azimuthDeg).toBeGreaterThan(45);
    expect(morning.azimuthDeg).toBeLessThan(135);
    const dir = sunDirectionWorld(morning);
    if (morning.elevationDeg > 5) {
      expect(dir.x).toBeGreaterThan(0);
      expect(dir.y).toBeGreaterThan(0);
    }
    const norm = Math.hypot(dir.x, dir.y, dir.z);
    expect(norm).toBeCloseTo(1, 5);
  });
});
