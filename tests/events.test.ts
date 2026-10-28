import { describe, expect, it } from "vitest";
import { filterEvents, safeSourceUrl } from "../shared/utils/events";
import { demoEvents } from "../server/data/demo";

const defaults = {
  search: "",
  region: "Todas as regiões" as const,
  kinds: ["armed", "violence", "tension", "diplomacy"] as (
    "armed" | "violence" | "tension" | "diplomacy"
  )[],
  hours: 24,
  now: Date.parse("2026-10-28T16:00:00Z"),
};
describe("filtros do monitor", () => {
  it("busca sem acentos e combina região e tipo", () => {
    expect(
      filterEvents(demoEvents, {
        ...defaults,
        search: "ira",
        region: "Oriente Médio",
        kinds: ["tension"],
      }).map((e) => e.location),
    ).toEqual(["Irã"]);
    expect(filterEvents(demoEvents, { ...defaults, kinds: [] })).toEqual([]);
  });
  it("filtra notícias antigas e datas futuras sem esconder cenários demo", () => {
    const base = { ...demoEvents[0]!, demo: false };
    expect(
      filterEvents(
        [
          { ...base, reportedAt: "2026-10-28T15:30:00Z" },
          { ...base, reportedAt: "2026-10-27T01:00:00Z" },
          { ...base, reportedAt: "2026-10-29T01:00:00Z" },
        ],
        defaults,
      ),
    ).toHaveLength(1);
    expect(filterEvents(demoEvents, defaults)).toHaveLength(demoEvents.length);
  });
  it("aceita apenas fontes http(s) sem credenciais embutidas", () => {
    expect(safeSourceUrl("https://example.org/news")).toBe(
      "https://example.org/news",
    );
    for (const source of [
      "data:text/html,hi",
      "//evil.test",
      "javascript:alert(1)",
      "https://user:secret@example.org/",
    ])
      expect(safeSourceUrl(source)).toBeNull();
  });
  it("o filtro militar separa relatos civis e permite ampliar a cobertura", () => {
    const input = [{ ...demoEvents[0]!, military: false }];
    expect(filterEvents(input, { ...defaults, militaryOnly: true })).toEqual(
      [],
    );
    expect(
      filterEvents(input, { ...defaults, militaryOnly: false }),
    ).toHaveLength(1);
  });
});
