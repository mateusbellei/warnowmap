import { describe, it, expect, vi, afterEach } from "vitest";
import {
  parseMilitaryPage,
  fetchMilitaryDataset,
} from "../server/utils/military-provider";
import { feedCoverage } from "../shared/utils/coverage";
import {
  sourceEvidence,
  evidencePlace,
  evidenceDateLabel,
} from "../shared/utils/evidence";
import { demoEvents } from "../server/data/demo";
import type { EventFeed } from "../shared/types/conflict";
import snapshot from "../server/data/military.json";
const page = (value: string) =>
  `<title>Tank Strength by Country (2026)</title><a href="/country-military-strength-detail.php?country_id=brazil"><div class="rankNumContainer">49</div><div class="longFormName"><span>Brazil</span></div><div class="valueContainer"><span>${value}</span></div><div>Readiness:191</div></a>`;
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
describe("inventários militares", () => {
  it("preserva o snapshot e limita tentativas quando o provedor falha", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(
      new Date(Date.parse(snapshot.retrievedAt) + 15 * 86400000),
    );
    vi.stubGlobal("useStorage", () => ({
      getItem: async () => null,
      setItem: async () => {},
    }));
    const request = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal("fetch", request);
    const { militaryDataset } = await import("../server/services/military");
    const first = await militaryDataset();
    const second = await militaryDataset();
    expect(first.countries).toEqual(snapshot.countries);
    expect(second.retrievedAt).toBe(snapshot.retrievedAt);
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("lê o inventário sem confundir posição e prontidão, e preserva zero", () => {
    expect(parseMilitaryPage(page("294"), "tanks").get("BRA")).toMatchObject({
      value: 294,
      year: 2026,
    });
    expect(parseMilitaryPage(page("0"), "tanks").get("BRA")?.value).toBe(0);
    expect(parseMilitaryPage(page("N/A"), "tanks").size).toBe(0);
  });
  it("rejeita atualização incompleta em vez de substituir o último snapshot", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, text: async () => page("294") }),
    );
    await expect(fetchMilitaryDataset()).rejects.toThrow("MILITARY_INCOMPLETE");
  });
  it("distribui cinco séries com fonte por país e não inventa drones", () => {
    expect(snapshot.countries.length).toBeGreaterThanOrEqual(130);
    const brazil = snapshot.countries.find(
      (country) => country.code === "BRA",
    )!;
    expect(brazil.metrics.find((metric) => metric.key === "tanks")?.value).toBe(
      294,
    );
    for (const country of snapshot.countries) {
      expect(country.metrics).toHaveLength(5);
      expect(new Set(country.metrics.map((metric) => metric.key)).size).toBe(5);
      expect(
        country.metrics.every(
          (metric) =>
            Number.isSafeInteger(metric.value) &&
            metric.value >= 0 &&
            metric.sourceUrl.startsWith("https://www.globalfirepower.com/"),
        ),
      ).toBe(true);
    }
  });
});
describe("evidência e cobertura", () => {
  it("usa somente o texto coletado e distingue menção nacional de local", () => {
    const event = {
      ...demoEvents[0]!,
      locationPrecision: "country" as const,
      title: "Manchete original",
      dateBasis: "indexed" as const,
      articleContext: { themes: [], headline: "Texto da fonte" },
    };
    expect(sourceEvidence(event)).toBe("Texto da fonte");
    expect(evidencePlace(event)).toContain("Local do fato não confirmado");
    expect(evidenceDateLabel(event)).toContain("Indexação");
    expect(sourceEvidence({ ...event, articleContext: undefined })).toBe(
      "Manchete original",
    );
  });
  it("não apresenta contexto completo de um lote como cobertura de todo o mês", () => {
    const feed = {
      mode: "live",
      fetchedAt: "2026-11-08T12:00:00Z",
      coverage: {
        lastCollectedAt: "2026-11-08T12:00:00Z",
        contextStatus: "complete",
        persistence: "ephemeral",
        contextBatchDates: [
          "2026-11-08T11:45:00Z",
          "2026-11-08T11:45:00Z",
          "2026-11-09T00:00:00Z",
        ],
      },
    } as EventFeed;
    const info = feedCoverage(
      feed,
      "2026-11-07",
      "2026-11-08",
      Date.parse("2026-11-08T12:00:00Z"),
    );
    expect(info).toMatchObject({
      batches: 1,
      expected: 144,
      days: 2,
      withRecords: 1,
      gaps: 1,
      partial: true,
      temporary: true,
      state: "recent",
      minutes: 0,
    });
    expect(
      feedCoverage(
        feed,
        "2026-11-01",
        "2026-11-02",
        Date.parse("2026-11-08T14:00:00Z"),
      ),
    ).toMatchObject({ batches: 0, gaps: 2, state: "stale" });
  });
  it("não trata horário desconhecido ou ausência de lotes como cobertura confirmada", () => {
    expect(feedCoverage(null, "2026-11-07", "2026-11-08").state).toBe(
      "waiting",
    );
    expect(
      feedCoverage({ mode: "live" } as EventFeed, "2026-11-07", "2026-11-08"),
    ).toMatchObject({ partial: true, state: "unknown", last: null });
  });
});
