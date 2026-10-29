import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import type { EventFeed } from "../shared/types/conflict";
const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  health: vi.fn(),
  repository: vi.fn(),
  ingest: vi.fn(),
}));
vi.mock("../server/services/ingestion", () => ({
  configuredRepository: mocks.repository,
  runIngestion: mocks.ingest,
}));
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.repository.mockResolvedValue({
    kind: "postgres",
    load: mocks.load,
    health: mocks.health,
  });
  vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
  vi.stubGlobal("setHeader", vi.fn());
  vi.stubGlobal("setResponseStatus", vi.fn());
  vi.stubGlobal("getQuery", () => ({}));
  vi.stubGlobal("useRuntimeConfig", () => ({ gdeltEnabled: true }));
  vi.stubGlobal("$fetch", vi.fn());
  vi.stubGlobal("getHeader", () => undefined);
  vi.stubGlobal("createError", (error: unknown) => error);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("API com persistência configurada", () => {
  it("lê snapshot sem executar coleta nem migrações", async () => {
    const feed: EventFeed = {
      events: [],
      mode: "live",
      fetchedAt: new Date().toISOString(),
      datasetAt: new Date().toISOString(),
      provider: "GDELT 2.0",
      message: "existing",
    };
    mocks.load.mockResolvedValue(feed);
    const handler = (await import("../server/api/events.get"))
      .default as unknown as (event: object) => Promise<EventFeed>;
    const result = await handler({});
    expect(result.operation?.repository).toBe("postgres");
    expect(mocks.load).toHaveBeenCalledOnce();
    expect($fetch).not.toHaveBeenCalled();
    expect(mocks.ingest).not.toHaveBeenCalled();
  });
  it("explicita instalação sem primeira coleta e degrada snapshot antigo", async () => {
    mocks.load.mockResolvedValueOnce(null);
    const handler = (await import("../server/api/events.get"))
      .default as unknown as (event: object) => Promise<EventFeed>;
    expect((await handler({})).mode).toBe("unavailable");
    mocks.load.mockResolvedValue({
      events: [],
      mode: "live",
      fetchedAt: "2024-01-01T00:00:00Z",
      provider: "GDELT 2.0",
      message: "old",
    });
    expect((await handler({})).mode).toBe("stale");
    expect($fetch).not.toHaveBeenCalled();
  });
  it("não abre a ingestão quando segredo não foi configurado", async () => {
    vi.stubEnv("WARNOW_INGEST_SECRET", "");
    const handler = (await import("../server/api/admin/ingest.post"))
      .default as unknown as (event: object) => Promise<unknown>;
    await expect(handler({})).rejects.toMatchObject({ statusCode: 401 });
    expect(mocks.repository).not.toHaveBeenCalled();
    expect(mocks.ingest).not.toHaveBeenCalled();
  });
});
