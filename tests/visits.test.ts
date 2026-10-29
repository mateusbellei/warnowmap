import { describe, it, expect } from "vitest";
import type { EventFeed } from "../shared/types/conflict";
import { demoEvents } from "../server/data/demo";
import { historyChanges } from "../shared/utils/visits";
const feed: EventFeed = {
  mode: "live",
  fetchedAt: "2026-10-29T03:00:00Z",
  datasetAt: "2026-10-29T03:00:00Z",
  provider: "GDELT 2.0",
  message: "",
  events: [
    {
      ...demoEvents[0]!,
      firstSeenAt: "2026-10-29T02:00:00Z",
      lastSeenAt: "2026-10-29T03:00:00Z",
    },
  ],
  operation: {
    ingestion: "external",
    repository: "postgres",
    lastSuccessAt: null,
  },
  coverage: {
    firstCollectedAt: "2026-10-28T00:00:00Z",
    lastCollectedAt: "2026-10-29T03:00:00Z",
    batches: 1,
    retentionDays: 30,
    persistence: "persistent",
  },
};
describe("novidades entre visitas", () => {
  it("não trata reinício de instância temporária como novas notícias", () => {
    const temporary = {
      ...feed,
      operation: { ...feed.operation!, repository: "temporary" as const },
      coverage: { ...feed.coverage!, persistence: "ephemeral" as const },
    };
    expect(historyChanges(temporary, "2026-10-29T02:30:00Z")).toEqual({
      available: false,
      events: [],
    });
  });
  it("só compara quando o histórico persistente começou antes da visita", () => {
    expect(historyChanges(feed, "2026-10-27T00:00:00Z").available).toBe(false);
    expect(historyChanges(feed, null).available).toBe(false);
    expect(historyChanges(feed, "2026-10-29T02:30:00Z").events).toHaveLength(1);
    expect(historyChanges(feed, "2026-10-29T03:30:00Z").events).toHaveLength(0);
  });
});
