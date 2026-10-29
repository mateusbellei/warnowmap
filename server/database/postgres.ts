import postgres from "postgres";
import type { EventFeed } from "../../shared/types/conflict";
import { selectEditorial } from "../utils/editorial";
import type { FeedRepository, IngestionRun } from "./repository";
import { postgresSchema } from "./schema";

export function postgresRepository(url: string): FeedRepository {
  // sslmode do provedor é respeitado; não desabilitamos validação de certificados.
  const sql = postgres(url, {
    max: 3,
    connect_timeout: 8,
    idle_timeout: 20,
    prepare: false,
    connection: { statement_timeout: 12000 },
  });
  const record = async (run: IngestionRun) => {
    await sql`INSERT INTO warnow_runs VALUES (${run.id},${run.startedAt},${run.endedAt},${run.status},${run.reports},${run.errorCode ?? null}) ON CONFLICT(id) DO UPDATE SET ended_at=excluded.ended_at,status=excluded.status,reports=excluded.reports,error_code=excluded.error_code`;
  };
  return {
    kind: "postgres",
    async migrate() {
      await sql.begin(async (tx) => {
        await tx.unsafe(postgresSchema);
      });
    },
    async load() {
      const rows =
        await sql`SELECT payload FROM warnow_snapshots WHERE id='current'`;
      return (rows[0]?.payload as EventFeed) ?? null;
    },
    async commit(feed, run, holder) {
      const reports = selectEditorial(feed.events).events.map((event) => ({
        id: event.id,
        url: event.sourceUrl,
        indexed_at: event.reportedAt,
        payload: event,
      }));
      const cutoff = new Date(
        Date.now() - (feed.coverage?.retentionDays ?? 30) * 86400000,
      ).toISOString();
      await sql.begin(async (tx) => {
        const lease =
          await tx`SELECT holder FROM warnow_leases WHERE id='ingestion' AND holder=${holder} AND expires_at > now() FOR UPDATE`;
        if (!lease.length) throw new Error("LEASE_LOST");
        await tx`INSERT INTO warnow_snapshots VALUES ('current',${sql.json(feed as unknown as postgres.JSONValue)},now()) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at`;
        if (reports.length)
          await tx`INSERT INTO warnow_reports SELECT id,url,indexed_at,payload FROM jsonb_to_recordset(${sql.json(reports as unknown as postgres.JSONValue)}) AS x(id text,url text,indexed_at timestamptz,payload jsonb) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,indexed_at=excluded.indexed_at`;
        await tx`DELETE FROM warnow_reports WHERE indexed_at < ${cutoff}`;
        await tx`DELETE FROM warnow_runs WHERE ended_at < ${cutoff}`;
        await tx`INSERT INTO warnow_runs VALUES (${run.id},${run.startedAt},${run.endedAt},${run.status},${run.reports},${run.errorCode ?? null}) ON CONFLICT(id) DO UPDATE SET ended_at=excluded.ended_at,status=excluded.status,reports=excluded.reports,error_code=excluded.error_code`;
      });
    },
    async recordFailure(run) {
      await record(run);
    },
    async acquire(holder, now, expires) {
      const rows =
        await sql`INSERT INTO warnow_leases VALUES ('ingestion',${holder},${expires}) ON CONFLICT(id) DO UPDATE SET holder=excluded.holder,expires_at=excluded.expires_at WHERE warnow_leases.expires_at <= ${now} RETURNING holder`;
      return rows.length > 0;
    },
    async release(holder) {
      await sql`DELETE FROM warnow_leases WHERE id='ingestion' AND holder=${holder}`;
    },
    async health() {
      const rows =
        await sql`SELECT * FROM warnow_runs ORDER BY ended_at DESC LIMIT 1`;
      const counts =
        await sql`SELECT count(*)::integer AS count FROM warnow_reports`;
      const row = rows[0];
      return {
        reports: Number(counts[0]?.count ?? 0),
        lastRun: row
          ? {
              id: row.id,
              startedAt: new Date(row.started_at).toISOString(),
              endedAt: new Date(row.ended_at).toISOString(),
              status: row.status,
              reports: row.reports,
              errorCode: row.error_code ?? undefined,
            }
          : null,
      };
    },
    async close() {
      await sql.end({ timeout: 5 });
    },
  };
}
