import { describe, expect, it } from "vitest";
import { demoEvents } from "../server/data/demo";
import {
  canonicalArticleUrl,
  groupOccurrences,
} from "../shared/utils/occurrences";
const event = {
  ...demoEvents[0]!,
  demo: false,
  title: "Iran and US begin new round of peace negotiations",
  sourceUrl: "https://example.org/story",
  reportedAt: "2026-10-29T03:00:00Z",
  eventDate: "2026-10-29",
};
describe("agrupamento conservador", () => {
  it("remove rastreamento mas preserva identificadores de matérias e atualizações que não sejam liveblogs", () => {
    expect(
      canonicalArticleUrl("https://example.org/story?id=1&utm_source=x#top"),
    ).toBe("https://example.org/story?id=1");
    expect(
      canonicalArticleUrl("https://example.org/liveblog/today?update=1"),
    ).toBe("https://example.org/liveblog/today");
    expect(canonicalArticleUrl("https://example.org/story?update=1")).toContain(
      "update=1",
    );
  });
  it("agrega manchetes idênticas publicadas em domínios diferentes sem afirmar confirmação independente", () => {
    const items = groupOccurrences([
      event,
      {
        ...event,
        id: "b",
        sourceUrl: "https://other.org/story",
        source: "other.org",
      },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]?.reportCount).toBe(2);
    expect(items[0]?.groupingBasis).toBe("matching-headline");
  });
  it("preserva novas ações, datas e países diferentes", () => {
    expect(
      groupOccurrences([
        event,
        {
          ...event,
          id: "b",
          title: "Iran and US announce missile strikes on military bases",
          sourceUrl: "https://b.org/attack",
        },
      ]),
    ).toHaveLength(2);
    expect(
      groupOccurrences([
        event,
        {
          ...event,
          id: "b",
          eventDate: "2026-10-28",
          sourceUrl: "https://b.org/old",
        },
      ]),
    ).toHaveLength(2);
  });
  it("mantém identidade entre coletas e contabiliza atualizações de liveblog como publicações, sem multiplicar acontecimentos", () => {
    const a = {
      ...event,
      sourceUrl: "https://example.org/liveblog/today?update=1",
    };
    const b = {
      ...a,
      id: "b",
      sourceUrl: "https://example.org/liveblog/today?update=2",
      title: "Iran and US discuss a new agreement",
      reportedAt: "2026-10-29T03:15:00Z",
    };
    expect(groupOccurrences([a, b])[0]?.id).toBe(groupOccurrences([a])[0]?.id);
    expect(groupOccurrences([a, b])[0]?.reportCount).toBe(2);
    expect(groupOccurrences([a, b])[0]?.contentType).toBe("liveblog");
  });
});
