import { describe, expect, it } from "vitest";
import {
  eventsInView,
  withinBounds,
  countryReferences,
} from "../shared/utils/map";
import { demoEvents } from "../server/data/demo";
describe("recorte geográfico visível", () => {
  it("conta referências nacionais por acontecimento sem contar republicações nem incluir pontos locais", () => {
    const a = {
      ...demoEvents[0]!,
      locationPrecision: "country" as const,
      reports: [],
      reportCount: 7,
    };
    const refs = countryReferences([
      a,
      a,
      { ...a, id: "local", locationPrecision: "local" },
    ]);
    expect(refs).toHaveLength(a.countries.length);
    expect(refs.every((item) => item.count === 1)).toBe(true);
  });
  it("inclui limites e exclui pontos fora da área", () => {
    expect(withinBounds([30, 40], [20, 30, 40, 50])).toBe(true);
    expect(withinBounds([20, 30], [20, 30, 40, 50])).toBe(true);
    expect(withinBounds([10, 40], [20, 30, 40, 50])).toBe(false);
  });
  it("trata o antimeridiano e limites não normalizados do mapa", () => {
    for (const bounds of [
      [170, -30, -170, 30],
      [170, -30, 190, 30],
    ] as [number, number, number, number][]) {
      expect(withinBounds([175, 0], bounds)).toBe(true);
      expect(withinBounds([-175, 0], bounds)).toBe(true);
      expect(withinBounds([0, 0], bounds)).toBe(false);
    }
    expect(withinBounds([10, 0], [-250, -80, 250, 80])).toBe(true);
  });
  it("rejeita limites inválidos e não altera a lista original", () => {
    expect(withinBounds([NaN, 0], [-180, -90, 180, 90])).toBe(false);
    expect(withinBounds([0, 0], [-180, 30, 180, -30])).toBe(false);
    const visible = eventsInView(demoEvents, [20, 20, 60, 60]);
    expect(visible.length).toBeGreaterThan(0);
    expect(
      visible.every((event) =>
        withinBounds(event.coordinates, [20, 20, 60, 60]),
      ),
    ).toBe(true);
    expect(eventsInView(demoEvents, null)).toBe(demoEvents);
  });
});
