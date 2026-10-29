import { describe, expect, it } from "vitest";
import {
  economicImpact,
  headlineEconomicSignal,
} from "../shared/utils/economy";
import { filterEvents } from "../shared/utils/events";
import { demoEvents } from "../server/data/demo";

describe("sinais econômicos", () => {
  it("distingue medida, interrupção, efeito descrito e risco sem inventar preços ou causalidade", () => {
    expect(
      headlineEconomicSignal("Iran sanctions announced", ["SANCTIONS"])?.stage,
    ).toBe("measure");
    expect(
      headlineEconomicSignal("War disrupts shipping through Hormuz", [
        "ARMEDCONFLICT",
      ])?.stage,
    ).toBe("disruption");
    expect(
      headlineEconomicSignal("Oil prices surge amid Iran war", [
        "ARMEDCONFLICT",
      ])?.stage,
    ).toBe("effect");
    expect(
      headlineEconomicSignal("War could disrupt Hormuz shipping", [
        "ARMEDCONFLICT",
      ])?.stage,
    ).toBe("risk");
    expect(
      headlineEconomicSignal("Oil prices surge on earnings news", [
        "ARMEDCONFLICT",
      ]),
    ).toBeUndefined();
    expect(
      headlineEconomicSignal("War disrupts Hormuz shipping", []),
    ).toBeUndefined();
  });
  it("separa sanção relatada de ameaça e ajuda de intenção", () => {
    expect(economicImpact("163")).toMatchObject({
      sector: "sanctions",
      status: "reported",
    });
    expect(economicImpact("1312")).toMatchObject({
      sector: "sanctions",
      status: "potential",
    });
    expect(economicImpact("071")?.status).toBe("reported");
    expect(economicImpact("0331")?.status).toBe("potential");
  });
  it("não inventa impactos a partir de combate ou ajuda militar", () => {
    for (const code of ["19", "190", "195", "072", "1622", "132", "1630", ""])
      expect(economicImpact(code)).toBeUndefined();
    expect(economicImpact("191")?.sector).toBe("logistics");
    expect(economicImpact("1381")?.status).toBe("potential");
  });
  it("filtra economia junto com país, categoria e período, sem duplicar relatos", () => {
    const filters = {
      search: "",
      region: "Todas as regiões" as const,
      kinds: ["armed", "violence", "tension", "diplomacy"] as const,
      hours: 168,
      now: Date.now(),
      economicOnly: true,
    };
    const result = filterEvents(demoEvents, {
      ...filters,
      kinds: [...filters.kinds],
    });
    expect(result).toHaveLength(6);
    expect(result.every((event) => event.economy && event.demo)).toBe(true);
    expect(
      filterEvents(demoEvents, {
        ...filters,
        kinds: ["diplomacy"],
        country: "UKR",
      }),
    ).toHaveLength(1);
    expect(new Set(result.map((event) => event.id)).size).toBe(result.length);
  });
});
