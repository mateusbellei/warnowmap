import { describe, expect, it, vi, afterEach } from "vitest";
import { normalizeWorldBank, fetchWorldBank } from "../server/utils/world-bank";
import {
  latestMetric,
  metricText,
  countryActivity,
  observeCountries,
  stabilityColor,
  countryDailyActivity,
} from "../shared/utils/country";
import { groupStories, changedStories } from "../shared/utils/stories";
import { demoEvents } from "../server/data/demo";
import { countryGeometryCode } from "../shared/utils/map";
import type { EventFeed } from "../shared/types/conflict";
const event = {
  ...demoEvents[0]!,
  demo: false,
  sourceUrl: "https://example.org/first",
  title: "Russian drone attack hits Ukrainian train station, officials report",
  reportedAt: "2026-11-05T01:00:00Z",
  eventDate: "2026-11-05",
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("estatísticas e observações nacionais", () => {
  it("respeita a base de data no gráfico do país", () => {
    const item = { ...event, eventDate: "2026-11-04" };
    const code = item.countries[0]!.code;
    expect(
      countryDailyActivity(
        [item],
        code,
        "2026-11-04",
        "2026-11-05",
        "event",
      ).map((point) => point.count),
    ).toEqual([1, 0]);
    expect(
      countryDailyActivity(
        [item],
        code,
        "2026-11-04",
        "2026-11-05",
        "collected",
      ).map((point) => point.count),
    ).toEqual([0, 1]);
  });
  it("rejeita atualização parcial para preservar as séries existentes", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: true,
          json: async () => [
            { pages: 1, lastupdated: "2026-10-08" },
            [
              {
                indicator: { id: "SP.POP.TOTL" },
                countryiso3code: "BRA",
                date: "2025",
                value: 200000000,
              },
            ],
          ],
        }),
    );
    await expect(fetchWorldBank()).rejects.toThrow("WORLD_BANK_INCOMPLETE");
  });
  it("concilia os códigos cartográficos sem atribuir dados nacionais a regiões sem série própria", () => {
    expect(countryGeometryCode("PSX")).toBe("PSE");
    expect(countryGeometryCode("KOS")).toBe("KSV");
    expect(countryGeometryCode("SDS")).toBe("SSD");
    expect(countryGeometryCode("CYN")).toBe("CYN");
    expect(countryGeometryCode("SOL")).toBe("SOL");
  });
  it("exclui agregados, preserva zero/deflação e ordena anos sem inventar ausências", () => {
    const dataset = normalizeWorldBank(
      [
        {
          indicator: { id: "GOV_WGI_PV_SC" },
          countryiso3code: "BRA",
          date: "2025",
          value: 0,
        },
        {
          indicator: { id: "GOV_WGI_PV_SC" },
          countryiso3code: "BRA",
          date: "2024",
          value: 50,
        },
        {
          indicator: { id: "GOV_WGI_PV_SC" },
          countryiso3code: "BRA",
          date: "2023",
          value: null,
        },
        {
          indicator: { id: "FP.CPI.TOTL.ZG" },
          countryiso3code: "BRA",
          date: "2025",
          value: -1.5,
        },
        {
          indicator: { id: "SP.POP.TOTL" },
          countryiso3code: "WLD",
          date: "2025",
          value: 123,
        },
        {
          indicator: { id: "GOV_WGI_PV_SC" },
          countryiso3code: "USA",
          date: "2025",
          value: 101,
        },
      ],
      "2026-11-05T00:00:00Z",
      "2026-10-08",
    );
    expect(dataset.countries.some((country) => country.code === "WLD")).toBe(
      false,
    );
    const brazil = dataset.countries.find((country) => country.code === "BRA")!;
    expect(
      latestMetric(brazil.metrics.find((metric) => metric.key === "stability")),
    ).toEqual({ year: 2025, value: 0 });
    expect(
      latestMetric(brazil.metrics.find((metric) => metric.key === "inflation"))
        ?.value,
    ).toBe(-1.5);
    expect(
      latestMetric(brazil.metrics.find((metric) => metric.key === "income")),
    ).toBeNull();
    expect(stabilityColor(null)).not.toBe(stabilityColor(0));
    expect(metricText(0, "percent")).toBe("0%");
  });
  it("conta publicações distintas e histórias relacionadas, preservando a natureza de menção", () => {
    const second = {
      ...event,
      id: "second",
      sourceUrl: "https://second.example.org/story",
    };
    const stories = groupStories([event, second]);
    expect(stories).toHaveLength(1);
    const code = event.countries[0]!.code;
    expect(countryActivity(stories, code)).toMatchObject({
      publications: 2,
      stories: 1,
    });
    expect(countryActivity([event], "BRA").stories).toBe(0);
  });
  it("registra somente a observação atual e explicita lacunas de lotes", () => {
    const feed: EventFeed = {
      events: [event],
      mode: "live",
      fetchedAt: event.reportedAt,
      datasetAt: event.reportedAt,
      provider: "GDELT 2.0",
      message: "",
      coverage: {
        firstCollectedAt: event.reportedAt,
        lastCollectedAt: event.reportedAt,
        batches: 1,
        retentionDays: 30,
        contextBatchDates: [event.reportedAt],
      },
    };
    const observed = observeCountries(feed, "2026-11-05T02:00:00Z");
    expect(
      observed.every(
        (point) => point.day === "2026-11-05" && point.coverage < 0.01,
      ),
    ).toBe(true);
    expect(observed.map((point) => point.code)).toEqual(
      event.countries.map((country) => country.code),
    );
    expect(
      observeCountries(
        { ...feed, events: [{ ...event, demo: true }] },
        "2026-11-05T02:00:00Z",
      ),
    ).toEqual([]);
  });
  it("API retorna série distribuída e distingue histórico não configurado", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("WARNOW_SQLITE_PATH", "");
    vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
    vi.stubGlobal("getRouterParam", () => "BRA");
    const handler = (await import("../server/api/countries/[code].get"))
      .default as unknown as (
      event: object,
    ) => Promise<import("../shared/types/country").CountryResponse>;
    const result = await handler({});
    expect(result.profile.code).toBe("BRA");
    expect(result.profile.metrics).toHaveLength(5);
    expect(result.historyState).toBe("not-configured");
    expect(result.history).toEqual([]);
  });
});
describe("histórias e atualização incremental", () => {
  it("relaciona manchetes equivalentes sem fundir números, datas ou ações diferentes", () => {
    const next = {
      ...event,
      id: "next",
      title: event.title.replace(", officials report", ", officials say"),
      sourceUrl: "https://other.example/story",
      reportedAt: "2026-11-05T02:00:00Z",
    };
    expect(groupStories([event, next])).toHaveLength(1);
    expect(
      groupStories([event, { ...next, title: next.title + " 14 dead" }]),
    ).toHaveLength(2);
    expect(
      groupStories([event, { ...next, eventDate: "2026-11-04" }]),
    ).toHaveLength(2);
    expect(groupStories([event, { ...next, kind: "diplomacy" }])).toHaveLength(
      2,
    );
  });
  it("nova publicação mantém identidade da história e sinaliza mudança", () => {
    const before = groupStories([event]);
    const after = groupStories([
      event,
      {
        ...event,
        id: "new",
        sourceUrl: "https://other.example/story",
        reportedAt: "2026-11-05T02:00:00Z",
      },
    ]);
    expect(before[0]?.id).toBe(after[0]?.id);
    expect(changedStories(before, after)).toBe(1);
    expect(changedStories(after, after)).toBe(0);
    expect(
      changedStories(after, [
        { ...after[0]!, reports: [...after[0]!.reports!].reverse() },
      ]),
    ).toBe(0);
    expect(changedStories(after, [{ ...after[0]!, countries: [] }])).toBe(1);
    expect(after[0]?.story?.sourceCount).toBe(2);
  });
});
