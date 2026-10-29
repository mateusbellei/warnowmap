import type { EventFeed } from "../../shared/types/conflict";
export interface IngestionRun {
  id: string;
  startedAt: string;
  endedAt: string;
  status: "success" | "partial" | "failed";
  reports: number;
  errorCode?: string;
}
export interface FeedRepository {
  kind: "postgres" | "sqlite";
  migrate(): Promise<void>;
  load(): Promise<EventFeed | null>;
  commit(feed: EventFeed, run: IngestionRun, holder: string): Promise<void>;
  recordFailure(run: IngestionRun): Promise<void>;
  acquire(holder: string, now: string, expires: string): Promise<boolean>;
  release(holder: string): Promise<void>;
  health(): Promise<{ lastRun: IngestionRun | null; reports: number }>;
  close(): Promise<void>;
}
