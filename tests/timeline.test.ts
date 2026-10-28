import { describe, expect, it } from "vitest";
import { demoEvents } from "../server/data/demo";
import {
  calendarDays,
  groupTimeline,
  mergeHistory,
  sortTimeline,
  timelineDays,
} from "../shared/utils/timeline";
import { filterEvents } from "../shared/utils/events";

describe("linha do tempo e relações bilaterais", () => {
  it("ordena por data do fato sem confundir com a data de coleta", () => {
    const input = [
      {
        ...demoEvents[0]!,
        id: "a",
        eventDate: "2026-10-20",
        reportedAt: "2026-10-28T13:00:00Z",
      },
      {
        ...demoEvents[0]!,
        id: "b",
        eventDate: "2026-10-27",
        reportedAt: "2026-10-28T12:00:00Z",
      },
    ];
    expect(sortTimeline(input, "event", "asc").map((e) => e.id)).toEqual([
      "a",
      "b",
    ]);
    expect(sortTimeline(input, "collected", "asc").map((e) => e.id)).toEqual([
      "b",
      "a",
    ]);
    expect(input[0]?.id).toBe("a");
  });
  it("agrupa por dia e mantém precisão diária do fato", () => {
    const input = [
      {
        ...demoEvents[0]!,
        eventDate: "2026-10-20",
        reportedAt: "2026-10-28T12:00:00Z",
      },
      {
        ...demoEvents[1]!,
        eventDate: "2026-10-20",
        reportedAt: "2026-10-28T15:00:00Z",
      },
    ];
    expect(groupTimeline(input, "event")[0]?.events).toHaveLength(2);
    expect(timelineDays(input, "event")).toEqual([
      { date: "2026-10-20", count: 2 },
    ]);
    expect(timelineDays(input, "collected")[0]?.date).toBe("2026-10-28");
  });
  it("gera dias UTC, inclusive lacunas, e rejeita datas impossíveis ou intervalos grandes", () => {
    expect(calendarDays("2024-02-28", "2024-03-01")).toEqual([
      "2024-02-28",
      "2024-02-29",
      "2024-03-01",
    ]);
    expect(calendarDays("2026-10-28", "2026-10-27")).toEqual([]);
    expect(calendarDays("2026-02-30", "2026-03-01")).toEqual([]);
    expect(calendarDays("2026-01-01", "2026-12-31")).toEqual([]);
  });
  it("preserva lotes anteriores e limita a retenção pela coleta, não pela data histórica do fato", () => {
    const now = Date.parse("2026-10-28T16:00:00Z");
    const base = {
      ...demoEvents[0]!,
      demo: false,
      reportedAt: "2026-10-28T15:00:00Z",
      eventDate: "2020-01-01",
    };
    const input = [
      { ...base, id: "old", reportedAt: "2026-10-10T15:00:00Z" },
      { ...base, id: "valid" },
    ];
    expect(mergeHistory(input, [], now).map((e) => e.id)).toEqual(["valid"]);
    expect(mergeHistory([], demoEvents, now)).toEqual([]);
  });
  it("atualiza IDs e agrupa extrações repetidas entre lotes sem perder pares", () => {
    const now = Date.parse("2026-10-28T16:00:00Z");
    const base = {
      ...demoEvents[0]!,
      demo: false,
      reportedAt: "2026-10-28T14:00:00Z",
    };
    const merged = mergeHistory(
      [base],
      [
        {
          ...base,
          id: "new-id",
          reportedAt: "2026-10-28T15:00:00Z",
          actors: ["ACTOR C"],
        },
      ],
      now,
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]?.actors).toContain("ACTOR C");
    expect(merged[0]?.reportedAt).toBe("2026-10-28T15:00:00Z");
    expect(base.actors).toEqual([]);
  });
  it("filtra país, par e vínculo estatal, incluindo diplomacia não militar", () => {
    const filters = {
      search: "",
      region: "Todas as regiões" as const,
      kinds: ["diplomacy"] as const,
      hours: 168,
      now: Date.now(),
      interstateOnly: true,
      country: "USA",
      pair: "IRN:USA",
      stateOnly: true,
    };
    const result = filterEvents(demoEvents, {
      ...filters,
      kinds: [...filters.kinds],
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.military).toBe(false);
  });
});
