import { expect, it } from "vitest";
import { decodeExport, parseGdeltExport } from "../server/utils/gdelt";
import { decodeGkg, enrichContext, newsFromGkg } from "../server/utils/gkg";
import { selectEditorial } from "../server/utils/editorial";

// Auditoria opt-in do lote do exemplo; não depende de rede no CI normal.
it.skipIf(process.env.WARNOW_LIVE_AUDIT !== "1")(
  "audita a seleção no lote real do caso AMSTERDAM/BRAZIL",
  async () => {
    const stamp = "20261029001500";
    const [eventsZip, gkgZip] = await Promise.all(
      ["export.CSV", "gkg.csv"].map(async (type) => {
        const response = await fetch(
          `https://data.gdeltproject.org/gdeltv2/${stamp}.${type}.zip`,
          { signal: AbortSignal.timeout(15000) },
        );
        if (!response.ok) throw new Error(`GDELT ${type}: ${response.status}`);
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.length > 10_000_000)
          throw new Error("Lote muito grande para auditoria");
        return bytes;
      }),
    );
    const raw = parseGdeltExport(decodeExport(eventsZip!));
    const contextText = decodeGkg(gkgZip!);
    const contextual = [
      ...enrichContext(raw, contextText),
      ...newsFromGkg(contextText, Date.parse("2026-10-29T00:15:00Z")),
    ];
    const result = selectEditorial(contextual);
    expect(raw.some((event) => event.id === "1330384491")).toBe(true);
    expect(
      result.events.some((event) =>
        event.sourceUrl.includes("diemen-abortion-murder"),
      ),
    ).toBe(false);
    expect(result.events.length).toBeGreaterThan(0);
    expect(result.events.length).toBeLessThan(raw.length);
    console.info(
      "AUDITORIA REAL",
      JSON.stringify({
        batch: stamp,
        ...result.quality,
        categories: Object.fromEntries(
          ["armed", "violence", "tension", "diplomacy"].map((kind) => [
            kind,
            result.events.filter((event) => event.kind === kind).length,
          ]),
        ),
        sample: result.events.slice(0, 20).map((event) => ({
          headline: event.title,
          actors: event.actors,
          code: event.actionCode,
          source: event.sourceUrl,
          basis: event.selection?.basis,
        })),
      }),
    );
  },
  30000,
);
