import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { strToU8, zipSync } from "fflate";
import type { EventFeed } from "../shared/types/conflict";
import { demoEvents } from "../server/data/demo";

let stored: EventFeed | null;
let query: Record<string, string>;
const fetchMock = vi.fn();
const stamp = () =>
  new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14);
const storage = {
  getItem: vi.fn(async () => stored),
  setItem: vi.fn(async (_key: string, value: EventFeed) => {
    stored = value;
  }),
};
beforeEach(() => {
  vi.resetModules();
  stored = null;
  query = {};
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(zipSync({ "empty.gkg.csv": strToU8("") }).buffer);
  storage.setItem.mockClear();
  vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
  vi.stubGlobal("setHeader", vi.fn());
  vi.stubGlobal("getQuery", () => query);
  vi.stubGlobal("useRuntimeConfig", () => ({ gdeltEnabled: true }));
  vi.stubGlobal("useStorage", () => storage);
  vi.stubGlobal("$fetch", fetchMock);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
async function handler() {
  return (await import("../server/api/events.get")).default as unknown as (
    event: object,
  ) => Promise<EventFeed>;
}
function newsArchive(date: string) {
  const row = Array(27).fill("");
  Object.assign(row, {
    0: `${date}-1`,
    1: date,
    4: `https://example.org/${date}`,
    7: "ARMEDCONFLICT;MILITARY;",
    9: "1#Ukraine#UP#UP#49#32#UP",
    26: "<PAGE_TITLE>Russian drones attack Ukraine in renewed offensive</PAGE_TITLE>",
  });
  return zipSync({ [`${date}.gkg.csv`]: strToU8(row.join("\t")) }).buffer;
}
describe("API de relatos", () => {
  it("mantém notícias quando os arquivos CAMEO não estão disponíveis", async () => {
    const date = stamp();
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith("lastupdate.txt"))
        return `100 hash http://data.gdeltproject.org/gdeltv2/${date}.export.CSV.zip`;
      if (url.endsWith(".export.CSV.zip")) throw { statusCode: 404 };
      return newsArchive(/\/(\d{14})\.gkg/.exec(url)![1]!);
    });
    const result = await (await handler())({});
    expect(result.mode).toBe("live");
    expect(result.summary?.reports).toBe(8);
    expect(result.events).toHaveLength(1);
  });
  it("revalida uma única vez um 404 de contexto que ficou no cache regional do provedor", async () => {
    const date = stamp();
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith("lastupdate.txt"))
        return `100 hash http://data.gdeltproject.org/gdeltv2/${date}.export.CSV.zip`;
      if (url.endsWith(".export.CSV.zip"))
        return zipSync({ "empty.export.CSV": strToU8("") }).buffer;
      if (url.endsWith(`${date}.gkg.csv.zip`)) throw { statusCode: 404 };
      return newsArchive(/\/(\d{14})\.gkg/.exec(url)![1]!);
    });
    const result = await (await handler())({});
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.reportCount).toBe(8);
    expect(result.coverage?.contextStatus).toBe("complete");
    expect(
      fetchMock.mock.calls.filter(([url]) => String(url).includes("?retry=")),
    ).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(11);
  });
  it("recupera notícias de oito lotes mesmo sem extrações CAMEO e evita refazer o contexto concluído", async () => {
    const date = stamp();
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith("lastupdate.txt"))
        return `100 hash http://data.gdeltproject.org/gdeltv2/${date}.export.CSV.zip`;
      if (url.endsWith(".export.CSV.zip"))
        return zipSync({ "empty.export.CSV": strToU8("") }).buffer;
      const batch = /\/(\d{14})\.gkg/.exec(url)![1]!;
      return newsArchive(batch);
    });
    const api = await handler();
    const response = await api({});
    expect(response.events).toHaveLength(1);
    expect(response.summary?.reports).toBe(8);
    expect(response.coverage?.contextBatchDates).toHaveLength(8);
    expect(response.coverage?.contextStatus).toBe("complete");
    expect(
      response.events.every((event) => event.sourceType === "article"),
    ).toBe(true);
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 301000);
    await api({});
    expect(fetchMock).toHaveBeenCalledTimes(11); // Só o manifesto adicional.
    vi.restoreAllMocks();
  });
  it("não trata falha de contexto como feed conectado e tenta novamente no mesmo lote após um minuto", async () => {
    const date = stamp();
    let available = false;
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith("lastupdate.txt"))
        return `100 hash http://data.gdeltproject.org/gdeltv2/${date}.export.CSV.zip`;
      if (url.endsWith(".export.CSV.zip"))
        return zipSync({ "empty.export.CSV": strToU8("") }).buffer;
      if (!available)
        throw Object.assign(new Error("Arquivo ainda não publicado"), {
          statusCode: 404,
        });
      return newsArchive(/\/(\d{14})\.gkg/.exec(url)![1]!);
    });
    const api = await handler();
    const failed = await api({});
    expect(failed.mode).toBe("unavailable");
    expect(failed.coverage?.contextStatus).toBe("partial");
    expect(failed.events).toEqual([]);
    available = true;
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 61000);
    const recovered = await api({});
    expect(recovered.datasetAt).toBe(failed.datasetAt);
    expect(recovered.mode).toBe("live");
    expect(recovered.events).toHaveLength(1);
    expect(recovered.events[0]?.reportCount).toBe(8);
    expect(recovered.coverage?.contextStatus).toBe("complete");
    vi.restoreAllMocks();
  });
  it("preserva notícias disponíveis quando o contexto mais recente falha e recupera apenas os lotes pendentes", async () => {
    const date = stamp();
    let currentAvailable = false;
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith("lastupdate.txt"))
        return `100 hash http://data.gdeltproject.org/gdeltv2/${date}.export.CSV.zip`;
      if (url.endsWith(".export.CSV.zip"))
        return zipSync({ "empty.export.CSV": strToU8("") }).buffer;
      const batch = /\/(\d{14})\.gkg/.exec(url)![1]!;
      if (batch === date && !currentAvailable) throw new Error("timeout");
      return newsArchive(batch);
    });
    const api = await handler();
    const partial = await api({});
    expect(partial.mode).toBe("stale");
    expect(partial.operation?.lastSuccessAt).toBeNull();
    expect(partial.events).toHaveLength(1);
    expect(partial.events[0]?.reportCount).toBe(7);
    currentAvailable = true;
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 61000);
    const recovered = await api({});
    expect(recovered.events).toHaveLength(1);
    expect(recovered.events[0]?.reportCount).toBe(8);
    expect(fetchMock).toHaveBeenCalledTimes(13); // Manifesto, exportação e único GKG pendente.
    vi.restoreAllMocks();
  });
  it("cruza o GKG do lote, prioriza a notícia e não publica a associação incidental dos atores", async () => {
    const date = stamp();
    const fields = Array(61).fill("");
    Object.assign(fields, {
      0: "123",
      1: date.slice(0, 8),
      6: "ACTOR A",
      7: "USA",
      12: "MIL",
      16: "ACTOR B",
      17: "IRN",
      26: "195",
      28: "19",
      51: "1",
      52: "Ukraine",
      56: "49",
      57: "32",
      59: date,
      60: "https://example.org/news",
    });
    const gkg = Array(27).fill("");
    Object.assign(gkg, {
      0: `${date}-1`,
      1: date,
      4: "https://example.org/news",
      7: "ARMEDCONFLICT;MILITARY;",
      9: "1#Russia#RS#RS#60#100#RS;1#Ukraine#UP#UP#49#32#UP",
      26: `<PAGE_TITLE>Russian drones attack Ukraine in renewed offensive</PAGE_TITLE><PAGE_PRECISEPUBTIMESTAMP>${date}</PAGE_PRECISEPUBTIMESTAMP>`,
    });
    fetchMock
      .mockResolvedValueOnce(
        `100 hash http://data.gdeltproject.org/gdeltv2/${date}.export.CSV.zip`,
      )
      .mockResolvedValueOnce(
        zipSync({ [`${date}.export.CSV`]: strToU8(fields.join("\t")) }).buffer,
      )
      .mockResolvedValueOnce(
        zipSync({ [`${date}.gkg.csv`]: strToU8(gkg.join("\t")) }).buffer,
      );
    const api = await handler();
    const response = await api({});
    expect(response.events).toHaveLength(1);
    expect(response.events[0]).toMatchObject({
      sourceType: "article",
      title: "Russian drones attack Ukraine in renewed offensive",
      countryPair: "RUS:UKR",
      actionCode: "",
    });
    expect(response.quality).toMatchObject({
      evaluated: 2,
      selected: 1,
      rejected: 1,
    });
    expect(fetchMock.mock.calls[2]?.[0]).toBe(
      `https://data.gdeltproject.org/gdeltv2/${date}.gkg.csv.zip`,
    );
    query.scope = "all";
    expect((await api({})).events).toHaveLength(1);
  });
  it("usa a data do lote anterior quando o arquivo do manifesto ainda retorna 404", async () => {
    fetchMock
      .mockResolvedValueOnce(
        "100 hash http://data.gdeltproject.org/gdeltv2/20261028194500.export.CSV.zip",
      )
      .mockRejectedValueOnce({ statusCode: 404 })
      .mockResolvedValueOnce(
        zipSync({ "20261028193000.export.CSV": strToU8("") }).buffer,
      );
    const response = await (await handler())({});
    expect(response.datasetAt).toBe("2026-10-28T19:30:00.000Z");
    expect(fetchMock.mock.calls[2]?.[0]).toBe(
      "https://data.gdeltproject.org/gdeltv2/20261028193000.export.CSV.zip",
    );
  });
  it("explicita o histórico temporário da Vercel sem alterar o arquivo armazenado", async () => {
    vi.stubEnv("VERCEL", "1");
    stored = {
      mode: "live",
      events: [],
      fetchedAt: "2026-10-28T12:00:00Z",
      datasetAt: "2026-10-28T12:00:00Z",
      provider: "GDELT 2.0",
      message: "",
      coverage: {
        firstCollectedAt: "2026-10-28T12:00:00Z",
        lastCollectedAt: "2026-10-28T12:00:00Z",
        batches: 1,
        retentionDays: 7,
      },
    };
    fetchMock.mockRejectedValue(new Error("offline"));
    const response = await (await handler())({});
    expect(response.coverage?.persistence).toBe("ephemeral");
    expect(stored.coverage?.persistence).toBeUndefined();
  });
  it("enriquece o arquivo anterior com economia mesmo com o provedor indisponível", async () => {
    stored = {
      mode: "live",
      events: [
        {
          ...demoEvents[0]!,
          actionCode: "163",
          kind: "tension",
          demo: false,
          participants: [{ name: "GOVERNMENT", country: null, roles: ["GOV"] }],
          articleContext: {
            themes: ["SANCTIONS"],
            headline: "Russia announces sanctions on Ukraine",
          },
        },
      ],
      fetchedAt: "2026-10-28T12:00:00Z",
      datasetAt: "2026-10-28T12:00:00Z",
      provider: "GDELT 2.0",
      message: "",
    };
    fetchMock.mockRejectedValue(new Error("offline"));
    const response = await (await handler())({});
    expect(response.events[0]?.economy).toMatchObject({
      sector: "sanctions",
      status: "reported",
    });
  });
  it("expõe indisponibilidade sem inventar relatos", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    const response = await (await handler())({});
    expect(response.mode).toBe("unavailable");
    expect(response.events).toEqual([]);
    expect(response.fetchedAt).toBeNull();
  });
  it("só retorna demonstração quando solicitada explicitamente", async () => {
    query.demo = "true";
    const response = await (await handler())({});
    expect(response.mode).toBe("demo");
    expect(response.events.every((event) => event.demo)).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("reduz o payload bilateral sem alterar o arquivo completo das coletas", async () => {
    query.demo = "true";
    query.scope = "state";
    const api = await handler();
    const scoped = await api({});
    expect(scoped.events.length).toBeGreaterThan(0);
    expect(
      scoped.events.every((event) => !!event.countryPair && event.stateLinked),
    ).toBe(true);
    query.scope = "all";
    expect((await api({})).events.length).toBeGreaterThan(scoped.events.length);
  });
  it("mantém a última coleta com aviso se a fonte falhar", async () => {
    stored = {
      mode: "live",
      events: [],
      fetchedAt: "2026-10-27T15:00:00Z",
      datasetAt: "2026-10-27T15:00:00Z",
      provider: "GDELT 2.0",
      message: "",
    };
    fetchMock.mockRejectedValue(new Error("offline"));
    const response = await (await handler())({});
    expect(response.mode).toBe("stale");
    expect(response.datasetAt).toBe(stored.datasetAt);
  });
  it("compartilha uma coleta entre requisições concorrentes e preserva lote vazio válido", async () => {
    const date = stamp();
    fetchMock
      .mockResolvedValueOnce(
        `100 hash http://data.gdeltproject.org/gdeltv2/${date}.export.CSV.zip`,
      )
      .mockResolvedValueOnce(
        zipSync({ [`${date}.export.CSV`]: strToU8("") }).buffer,
      );
    const api = await handler();
    const [a, b] = await Promise.all([api({}), api({})]);
    expect(a.mode).toBe("live");
    expect(a).toEqual(b);
    expect(a.events).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(10);
    expect(storage.setItem).toHaveBeenCalledOnce();
    await api({});
    expect(fetchMock).toHaveBeenCalledTimes(10);
  });
  it("sinaliza arquivo antigo como desatualizado", async () => {
    fetchMock
      .mockResolvedValueOnce(
        "100 hash http://data.gdeltproject.org/gdeltv2/20240101000000.export.CSV.zip",
      )
      .mockResolvedValueOnce(
        zipSync({ "20240101000000.export.CSV": strToU8("") }).buffer,
      );
    expect((await (await handler())({})).mode).toBe("stale");
  });
  it("preserva o histórico entre lotes, limita a retenção e contabiliza datas de lote únicas", async () => {
    const date = stamp();
    const currentTime = new Date().toISOString();
    const previousTime = new Date(Date.now() - 900000).toISOString();
    stored = {
      mode: "live",
      events: [{ ...demoEvents[0]!, demo: false, reportedAt: previousTime }],
      fetchedAt: previousTime,
      datasetAt: previousTime,
      provider: "GDELT 2.0",
      message: "",
      coverage: {
        firstCollectedAt: previousTime,
        lastCollectedAt: previousTime,
        batches: 1,
        retentionDays: 7,
        batchDates: [previousTime],
      },
    };
    fetchMock
      .mockResolvedValueOnce(
        `100 hash http://data.gdeltproject.org/gdeltv2/${date}.export.CSV.zip`,
      )
      .mockResolvedValueOnce(
        zipSync({ [`${date}.export.CSV`]: strToU8("") }).buffer,
      );
    const result = await (await handler())({});
    expect(result.events).toHaveLength(0);
    expect(result.quality?.rejected).toBe(1);
    expect(stored?.events).toHaveLength(1);
    expect(result.coverage?.batches).toBe(9);
    expect(result.coverage?.firstCollectedAt).toBe(previousTime);
    expect(Date.parse(result.coverage!.lastCollectedAt)).toBeGreaterThanOrEqual(
      Date.parse(currentTime),
    );
  });
});
