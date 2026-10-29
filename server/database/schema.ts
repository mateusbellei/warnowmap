export const postgresSchema = `
CREATE TABLE IF NOT EXISTS warnow_migrations (version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS warnow_snapshots (id text PRIMARY KEY, payload jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS warnow_reports (id text PRIMARY KEY, url text NOT NULL, indexed_at timestamptz NOT NULL, payload jsonb NOT NULL);
CREATE INDEX IF NOT EXISTS warnow_reports_indexed ON warnow_reports(indexed_at);
CREATE TABLE IF NOT EXISTS warnow_leases (id text PRIMARY KEY, holder text NOT NULL, expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS warnow_runs (id text PRIMARY KEY, started_at timestamptz NOT NULL, ended_at timestamptz NOT NULL, status text NOT NULL, reports integer NOT NULL, error_code text);
INSERT INTO warnow_migrations(version) VALUES (1) ON CONFLICT DO NOTHING;
`;
export const sqliteSchema = `
PRAGMA journal_mode=WAL;
PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS warnow_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS warnow_snapshots (id TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS warnow_reports (id TEXT PRIMARY KEY, url TEXT NOT NULL, indexed_at TEXT NOT NULL, payload TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS warnow_reports_indexed ON warnow_reports(indexed_at);
CREATE TABLE IF NOT EXISTS warnow_leases (id TEXT PRIMARY KEY, holder TEXT NOT NULL, expires_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS warnow_runs (id TEXT PRIMARY KEY, started_at TEXT NOT NULL, ended_at TEXT NOT NULL, status TEXT NOT NULL, reports INTEGER NOT NULL, error_code TEXT);
INSERT OR IGNORE INTO warnow_migrations(version) VALUES (1);
`;
