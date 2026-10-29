import type { EventFeed } from "../types/conflict";
export function historyChanges(
  feed: EventFeed | null | undefined,
  previousVisit: string | null,
) {
  const visited = previousVisit ? Date.parse(previousVisit) : NaN;
  const started = Date.parse(feed?.coverage?.firstCollectedAt ?? "");
  const available =
    !!feed &&
    feed.coverage?.persistence === "persistent" &&
    ["postgres", "sqlite"].includes(feed.operation?.repository ?? "") &&
    Number.isFinite(visited) &&
    Number.isFinite(started) &&
    visited >= started;
  return {
    available,
    events: available
      ? feed.events.filter((event) => {
          const observed = Date.parse(
            event.lastSeenAt ?? event.firstSeenAt ?? "",
          );
          return Number.isFinite(observed) && observed > visited;
        })
      : [],
  };
}
