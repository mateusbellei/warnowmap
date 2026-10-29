import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sqliteRepository } from "../server/database/sqlite";
import { postgresRepository } from "../server/database/postgres";
import type { FeedRepository } from "../server/database/repository";
import type { EventFeed } from "../shared/types/conflict";
import { validIngestionToken } from "../server/utils/ingestion-auth";
import { demoEvents } from "../server/data/demo";
const repos: FeedRepository[] = [];
const folders: string[] = [];
afterEach(async () => {
  for (const repo of repos.splice(0)) await repo.close();
  for (const folder of folders.splice(0))
    await rm(folder, { recursive: true, force: true });
});
export async function repositoryContract(repo: FeedRepository) {
  await repo.migrate();
  await repo.migrate();
  expect(await repo.load()).toBeNull();
  const now = new Date().toISOString(),
    expires = new Date(Date.now() + 60000).toISOString();
  expect(await repo.acquire("worker-a", now, expires)).toBe(true);
  expect(await repo.acquire("worker-b", now, expires)).toBe(false);
  const feed: EventFeed = {
    events: [
      {
        ...demoEvents[0]!,
        id: "report-a",
        demo: false,
        sourceType: "article",
        countryBasis: "headline",
        locationPrecision: "country",
        reportedAt: now,
        eventDate: now.slice(0, 10),
        title: "Russian drones attack Ukraine in renewed offensive",
        sourceUrl: "https://example.org/report",
        participants: [],
        articleContext: {
          headline: "Russian drones attack Ukraine in renewed offensive",
          themes: ["ARMEDCONFLICT", "MILITARY"],
        },
      },
    ],
    mode: "live",
    provider: "GDELT 2.0",
    fetchedAt: now,
    datasetAt: now,
    message: "snapshot",
  };
  const run = {
    id: "run-a",
    startedAt: now,
    endedAt: now,
    status: "success" as const,
    reports: 1,
  };
  await expect(
    repo.commit({ ...feed, message: "unauthorized" }, run, "worker-b"),
  ).rejects.toThrow("LEASE_LOST");
  expect(await repo.load()).toBeNull();
  await repo.commit(feed, run, "worker-a");
  await repo.commit(feed, run, "worker-a");
  expect((await repo.health()).reports).toBe(1);
  expect((await repo.load())?.events[0]?.countries).toEqual(
    feed.events[0]?.countries,
  );
  expect((await repo.load())?.message).toBe("snapshot");
  await repo.release("worker-b");
  expect(await repo.acquire("worker-b", now, expires)).toBe(false);
  await repo.release("worker-a");
  expect(await repo.acquire("worker-b", now, expires)).toBe(true);
  await repo.recordFailure({
    ...run,
    id: "failed",
    endedAt: new Date(Date.now() + 1000).toISOString(),
    status: "failed",
    errorCode: "PROVIDER_UNAVAILABLE",
  });
  expect((await repo.health()).lastRun?.status).toBe("failed");
  expect((await repo.load())?.message).toBe("snapshot");
}
describe("persistência e controle de ingestão", () => {
  it.skipIf(!process.env.WARNOW_TEST_DATABASE_URL)(
    "valida migração, transação e lock em PostgreSQL real",
    async () => {
      const repo = postgresRepository(process.env.WARNOW_TEST_DATABASE_URL!);
      repos.push(repo);
      await repositoryContract(repo);
    },
    30000,
  );
  it("aplica migração idempotente, exclui escritores concorrentes e não perde snapshot em falhas", async () => {
    const repo = await sqliteRepository(":memory:");
    repos.push(repo);
    await repositoryContract(repo);
  });
  it("preserva o histórico após fechar e reabrir o banco local", async () => {
    const dir = await mkdtemp(join(tmpdir(), "warnow-test-"));
    folders.push(dir);
    const file = join(dir, "history.sqlite");
    const first = await sqliteRepository(file);
    await repositoryContract(first);
    await first.close();
    const reopened = await sqliteRepository(file);
    repos.push(reopened);
    expect((await reopened.load())?.message).toBe("snapshot");
  });
  it("exige segredo longo, compara tokens e não aceita autenticação ausente", () => {
    const secret = "a".repeat(40);
    expect(validIngestionToken(`Bearer ${secret}`, secret)).toBe(true);
    for (const token of [undefined, "Bearer wrong", "Basic abc"])
      expect(validIngestionToken(token, secret)).toBe(false);
    expect(validIngestionToken("Bearer short", "short")).toBe(false);
  });
});
