import { it, expect, vi } from "vitest";
import { $fetch } from "ofetch";
import {
  getExportUrl,
  exportCandidates,
  decodeExport,
  parseGdeltExport,
} from "../server/utils/gdelt";
import { decodeGkg, enrichContext, newsFromGkg } from "../server/utils/gkg";
import { selectEditorial } from "../server/utils/editorial";
import type { EventFeed } from "../shared/types/conflict";

it.skipIf(process.env.WARNOW_LIVE_AUDIT !== "1")(
  "audita coleta e contexto do lote atual",
  async () => {
    const manifest = await $fetch<string>(
      "https://data.gdeltproject.org/gdeltv2/lastupdate.txt",
      { responseType: "text", timeout: 8000, retry: 0 },
    );
    const { date } = getExportUrl(manifest);
    const url = exportCandidates(date)[0]!.url;
    const archive = await $fetch<ArrayBuffer>(url, {
      responseType: "arrayBuffer",
      timeout: 15000,
      retry: 0,
    });
    const incoming = parseGdeltExport(decodeExport(new Uint8Array(archive)));
    const gkg = await $fetch<ArrayBuffer>(
      url.replace(".export.CSV.zip", ".gkg.csv.zip"),
      { responseType: "arrayBuffer", timeout: 15000, retry: 0 },
    );
    const text = decodeGkg(new Uint8Array(gkg));
    const selected = selectEditorial([
      ...enrichContext(incoming, text),
      ...newsFromGkg(text),
    ]);
    console.info("LOTE ATUAL", {
      date,
      raw: incoming.length,
      ...selected.quality,
      headlines: selected.events.map((e) => e.title),
    });
    expect(text.length).toBeGreaterThan(0);
    let stored: EventFeed | null = null;
    vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
    vi.stubGlobal("setHeader", () => {});
    vi.stubGlobal("getQuery", () => ({}));
    vi.stubGlobal("useRuntimeConfig", () => ({ gdeltEnabled: true }));
    vi.stubGlobal("useStorage", () => ({
      getItem: async () => stored,
      setItem: async (_key: string, value: EventFeed) => {
        stored = value;
      },
    }));
    vi.stubGlobal("$fetch", $fetch);
    try {
      const handler = (await import("../server/api/events.get"))
        .default as unknown as (event: object) => Promise<EventFeed>;
      const response = await handler({});
      console.info("JANELA RECUPERADA", {
        mode: response.mode,
        ...response.quality,
        coverage: response.coverage,
        headlines: response.events.map((e) => e.title),
      });
      expect(response.coverage?.contextBatchDates?.length).toBeGreaterThan(0);
      expect(response.summary!.reports).toBeGreaterThanOrEqual(
        selected.events.length,
      );
      expect(response.events.every((e) => !!e.selection)).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  },
  60000,
);
