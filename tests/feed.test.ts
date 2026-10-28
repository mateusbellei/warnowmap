import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { strToU8, zipSync } from "fflate";
import type { EventFeed } from "../shared/types/conflict";

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
  storage.setItem.mockClear();
  vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
  vi.stubGlobal("setHeader", vi.fn());
  vi.stubGlobal("getQuery", () => query);
  vi.stubGlobal("useRuntimeConfig", () => ({ gdeltEnabled: true }));
  vi.stubGlobal("useStorage", () => storage);
  vi.stubGlobal("$fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());
async function handler() {
  return (await import("../server/api/events.get")).default as unknown as (
    event: object,
  ) => Promise<EventFeed>;
}
describe("API de relatos", () => {
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
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(storage.setItem).toHaveBeenCalledOnce();
    await api({});
    expect(fetchMock).toHaveBeenCalledTimes(2);
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
});
