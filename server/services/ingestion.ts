import { randomUUID } from "node:crypto";
import type { EventFeed } from "../../shared/types/conflict";
import { collectFeed, type FeedStorage } from "./collector";
import type { FeedRepository } from "../database/repository";
import { selectEditorial } from "../utils/editorial";

let repositoryPromise: Promise<FeedRepository> | undefined;
export async function configuredRepository(): Promise<FeedRepository | null> {
  if (!process.env.DATABASE_URL && !process.env.WARNOW_SQLITE_PATH) return null;
  if (
    process.env.VERCEL &&
    process.env.WARNOW_SQLITE_PATH &&
    !process.env.DATABASE_URL
  )
    throw new Error("SQLITE_NOT_DURABLE_ON_VERCEL");
  repositoryPromise ??= (async () => {
    const repository = process.env.DATABASE_URL
      ? (await import("../database/postgres")).postgresRepository(
          process.env.DATABASE_URL,
        )
      : await (
          await import("../database/sqlite")
        ).sqliteRepository(process.env.WARNOW_SQLITE_PATH!);
    // Migrações explícitas: npm run db:migrate. GET nunca cria tabelas nem ingere dados.
    return repository;
  })();
  return repositoryPromise;
}
export async function runIngestion(
  repository: FeedRepository,
  collect = collectFeed,
) {
  const id = randomUUID();
  const startedAt = new Date().toISOString();
  if (
    !(await repository.acquire(
      id,
      startedAt,
      new Date(Date.now() + 120000).toISOString(),
    ))
  )
    return { status: "busy" as const };
  try {
    let previous = await repository.load();
    const before = new Map(previous?.events.map((event) => [event.id, event]));
    const store: FeedStorage = {
      async getItem<T>() {
        return previous as T | null;
      },
      async setItem<T>(_key: string, value: T) {
        previous = value as EventFeed;
      },
    };
    const feed = await collect(store, 30, 35000);
    if (feed.mode === "unavailable" && !feed.events.length)
      throw new Error("PROVIDER_UNAVAILABLE");
    const observed = new Date().toISOString();
    feed.events = feed.events.map((event) => ({
      ...event,
      firstSeenAt: before.get(event.id)?.firstSeenAt ?? observed,
      lastSeenAt:
        event.lastSeenAt ?? before.get(event.id)?.lastSeenAt ?? observed,
    }));
    const reports = selectEditorial(feed.events).events.length;
    await repository.commit(
      feed,
      {
        id,
        startedAt,
        endedAt: observed,
        status:
          feed.mode === "live" && feed.coverage?.contextStatus === "complete"
            ? "success"
            : "partial",
        reports,
      },
      id,
    );
    return {
      status:
        feed.mode === "live" ? ("success" as const) : ("partial" as const),
      reports,
      contextStatus: feed.coverage?.contextStatus,
    };
  } catch (error) {
    await repository.recordFailure({
      id,
      startedAt,
      endedAt: new Date().toISOString(),
      status: "failed",
      reports: 0,
      errorCode:
        error instanceof Error &&
        ["LEASE_LOST", "PROVIDER_UNAVAILABLE"].includes(error.message)
          ? error.message
          : "INGESTION_FAILED",
    });
    throw error;
  } finally {
    await repository.release(id);
  }
}
