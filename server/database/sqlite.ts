import { DatabaseSync } from "node:sqlite";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { EventFeed } from "../../shared/types/conflict";
import { selectEditorial } from "../utils/editorial";
import type { FeedRepository, IngestionRun } from "./repository";
import { sqliteSchema } from "./schema";

export async function sqliteRepository(path: string): Promise<FeedRepository> {
  if (path !== ":memory:") await mkdir(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  const record = (run: IngestionRun) =>
    db
      .prepare("INSERT OR REPLACE INTO warnow_runs VALUES (?, ?, ?, ?, ?, ?)")
      .run(
        run.id,
        run.startedAt,
        run.endedAt,
        run.status,
        run.reports,
        run.errorCode ?? null,
      );
  return {
    kind: "sqlite",
    async migrate() {
      db.exec(sqliteSchema);
    },
    async load() {
      const row = db
        .prepare("SELECT payload FROM warnow_snapshots WHERE id='current'")
        .get() as { payload: string } | undefined;
      return row ? (JSON.parse(row.payload) as EventFeed) : null;
    },
    async commit(feed, run, holder) {
      db.exec("BEGIN IMMEDIATE");
      try {
        const lease = db
          .prepare(
            "SELECT holder FROM warnow_leases WHERE id='ingestion' AND expires_at > ?",
          )
          .get(new Date().toISOString()) as { holder: string } | undefined;
        if (lease?.holder !== holder) throw new Error("LEASE_LOST");
        db.prepare(
          "INSERT INTO warnow_snapshots VALUES ('current', ?, ?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload, updated_at=excluded.updated_at",
        ).run(JSON.stringify(feed), run.endedAt);
        for (const event of selectEditorial(feed.events).events)
          db.prepare(
            "INSERT INTO warnow_reports VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload, indexed_at=excluded.indexed_at",
          ).run(
            event.id,
            event.sourceUrl,
            event.reportedAt,
            JSON.stringify(event),
          );
        const cutoff = new Date(
          Date.now() - (feed.coverage?.retentionDays ?? 30) * 86400000,
        ).toISOString();
        db.prepare("DELETE FROM warnow_reports WHERE indexed_at < ?").run(
          cutoff,
        );
        db.prepare("DELETE FROM warnow_runs WHERE ended_at < ?").run(cutoff);
        record(run);
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
    async recordFailure(run) {
      record(run);
    },
    async acquire(holder, now, expires) {
      return (
        db
          .prepare(
            "INSERT INTO warnow_leases VALUES ('ingestion', ?, ?) ON CONFLICT(id) DO UPDATE SET holder=excluded.holder, expires_at=excluded.expires_at WHERE warnow_leases.expires_at <= ?",
          )
          .run(holder, expires, now).changes > 0
      );
    },
    async release(holder) {
      db.prepare(
        "DELETE FROM warnow_leases WHERE id='ingestion' AND holder=?",
      ).run(holder);
    },
    async health() {
      const row = db
        .prepare("SELECT * FROM warnow_runs ORDER BY ended_at DESC LIMIT 1")
        .get() as
        | {
            id: string;
            started_at: string;
            ended_at: string;
            status: IngestionRun["status"];
            reports: number;
            error_code: string | null;
          }
        | undefined;
      const count = db
        .prepare("SELECT count(*) AS count FROM warnow_reports")
        .get() as { count: number };
      return {
        reports: count.count,
        lastRun: row
          ? {
              id: row.id,
              startedAt: row.started_at,
              endedAt: row.ended_at,
              status: row.status,
              reports: row.reports,
              errorCode: row.error_code ?? undefined,
            }
          : null,
      };
    },
    async close() {
      db.close();
    },
  };
}
