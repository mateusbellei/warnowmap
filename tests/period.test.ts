import { describe, expect, it } from "vitest";
import { demoEvents } from "../server/data/demo";
import {
  defaultMonth,
  eventsInPeriod,
  validPeriod,
} from "../shared/utils/period";
import { presentPublications } from "../shared/utils/occurrences";
import { filterEvents } from "../shared/utils/events";
const report = {
  ...demoEvents[0]!,
  demo: false,
  eventDate: "2026-10-05",
  reportedAt: "2026-10-06T00:30:00Z",
  sourceUrl: "https://example.org/news",
};
describe("período mensal e publicações", () => {
  it("inclui exatamente 30 dias corridos ao atravessar meses", () => {
    expect(defaultMonth("2026-03-01")).toEqual({
      from: "2026-01-31",
      to: "2026-03-01",
    });
    expect(defaultMonth("2026-10-29")).toEqual({
      from: "2026-09-30",
      to: "2026-10-29",
    });
  });
  it("recusa datas inexistentes, invertidas ou mais de 90 dias", () => {
    expect(validPeriod("2026-02-30", "2026-03-01")).toBe(false);
    expect(validPeriod("2026-10-29", "2026-10-01")).toBe(false);
    expect(validPeriod("2026-01-01", "2026-10-29")).toBe(false);
  });
  it("datas explícitas não herdam a antiga restrição de sete dias", () => {
    const filtered = filterEvents([report], {
      search: "",
      region: "Todas as regiões",
      kinds: ["armed", "violence", "tension", "diplomacy"],
      now: Date.parse("2026-10-29T12:00:00Z"),
      interstateOnly: false,
      stateOnly: false,
      country: "",
      pair: "",
      economicOnly: false,
    });
    expect(
      eventsInPeriod(filtered, "2026-09-30", "2026-10-29", "event"),
    ).toEqual([report]);
    expect(
      eventsInPeriod(filtered, "2026-10-07", "2026-10-29", "event"),
    ).toEqual([]);
  });
  it("mudar base temporal altera o recorte e inclui o dia final inteiro", () => {
    expect(
      eventsInPeriod([report], "2026-10-05", "2026-10-05", "event"),
    ).toEqual([report]);
    expect(
      eventsInPeriod([report], "2026-10-05", "2026-10-05", "collected"),
    ).toEqual([]);
    expect(
      eventsInPeriod([report], "2026-10-06", "2026-10-06", "collected"),
    ).toEqual([report]);
  });
  it("remover um atalho de horas recupera os registros do período personalizado", () => {
    const now = Date.parse("2026-10-06T12:00:00Z");
    expect(
      eventsInPeriod([report], "2026-10-01", "2026-10-29", "collected", 6, now),
    ).toEqual([]);
    expect(
      eventsInPeriod(
        [report],
        "2026-10-01",
        "2026-10-29",
        "collected",
        null,
        now,
      ),
    ).toEqual([report]);
  });
  it("modo individual preserva manchetes e identificadores, mesmo em matérias relacionadas", () => {
    const other = {
      ...report,
      id: "other",
      title: "A different update",
      sourceUrl: "https://example.org/news?update=2",
    };
    const results = presentPublications([report, other]);
    expect(results.map((item) => [item.id, item.title])).toEqual([
      [report.id, report.title],
      [other.id, other.title],
    ]);
    expect(results.every((item) => item.reportCount === 1)).toBe(true);
  });
});
