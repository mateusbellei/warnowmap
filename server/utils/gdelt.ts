import { strFromU8, unzipSync } from "fflate";
import type { ConflictEvent } from "../../shared/types/conflict";
import {
  regionFromCoordinates,
  safeSourceUrl,
} from "../../shared/utils/events";

const labels: Record<string, string> = {
  "17": "Coerção relatada",
  "18": "Violência relatada",
  "19": "Confronto armado relatado",
  "20": "Violência em massa relatada",
};

export function parseGdeltDate(value: string): string | null {
  if (!/^\d{14}$/.test(value)) return null;
  const iso = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(8, 10)}:${value.slice(10, 12)}:${value.slice(12, 14)}Z`;
  const time = Date.parse(iso);
  return Number.isFinite(time) &&
    new Date(time).toISOString().slice(0, 19) === iso.slice(0, 19)
    ? iso
    : null;
}

export function parseGdeltExport(text: string): ConflictEvent[] {
  const events = new Map<string, ConflictEvent>();
  for (const line of text.split(/\r?\n/)) {
    const row = line.split("\t");
    if (row.length < 61 || !labels[row[28]!] || !/^\d+$/.test(row[0]!))
      continue;
    const lat = Number(row[56]);
    const lng = Number(row[57]);
    const url = safeSourceUrl(row[60]!);
    const reportedAt = parseGdeltDate(row[59]!);
    if (
      !row[56]?.trim() ||
      !row[57]?.trim() ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180 ||
      !url ||
      !reportedAt ||
      row[51] === "0"
    )
      continue;
    if (!/^\d{8}$/.test(row[1]!) || !parseGdeltDate(`${row[1]}000000`))
      continue;
    const location = row[52]?.trim() || "Localização aproximada";
    const root = row[28]!;
    const actors = [
      ...new Set(
        [row[6], row[16]].filter((actor): actor is string => !!actor?.trim()),
      ),
    ];
    events.set(row[0]!, {
      id: row[0]!,
      title: `${labels[root]} · ${location}`,
      location,
      coordinates: [lng, lat],
      region: regionFromCoordinates(lng, lat),
      kind: root === "19" ? "armed" : root === "17" ? "tension" : "violence",
      actors,
      reportedAt,
      eventDate: `${row[1]!.slice(0, 4)}-${row[1]!.slice(4, 6)}-${row[1]!.slice(6, 8)}`,
      source: new URL(url).hostname.replace(/^www\./, ""),
      sourceUrl: url,
      mentions: Math.max(0, Number(row[31]) || 0),
      demo: false,
      military:
        [row[12], row[13], row[14], row[22], row[23], row[24]].some((code) =>
          /^(MIL|REB|INS|SEP|UAF)$/.test(code ?? ""),
        ) || root === "20",
    });
  }
  // O mesmo artigo pode gerar vários registros CAMEO para o mesmo local.
  // Agrupamos essas extrações, sem afirmar deduplicação factual entre fontes.
  const grouped = new Map<string, ConflictEvent>();
  for (const event of events.values()) {
    const key = [
      event.sourceUrl,
      event.coordinates.join(","),
      event.kind,
      event.eventDate,
    ].join("|");
    const previous = grouped.get(key);
    if (!previous) grouped.set(key, event);
    else {
      previous.actors = [...new Set([...previous.actors, ...event.actors])];
      previous.military ||= event.military;
      previous.mentions = Math.max(previous.mentions, event.mentions);
      if (event.reportedAt > previous.reportedAt)
        previous.reportedAt = event.reportedAt;
    }
  }
  return [...grouped.values()]
    .sort(
      (a, b) =>
        b.reportedAt.localeCompare(a.reportedAt) || Number(b.id) - Number(a.id),
    )
    .slice(0, 2000);
}

export function getExportUrl(manifest: string): { url: string; date: string } {
  const match = manifest.match(
    /(?:https?:\/\/data\.gdeltproject\.org\/gdeltv2\/)(\d{14})\.export\.CSV\.zip/,
  );
  const date = match?.[1] && parseGdeltDate(match[1]);
  if (!match || !date) throw new Error("Manifesto GDELT inválido");
  return {
    url: `https://data.gdeltproject.org/gdeltv2/${match[1]}.export.CSV.zip`,
    date,
  };
}

export function decodeExport(bytes: Uint8Array): string {
  const files = unzipSync(bytes, {
    filter: (file) =>
      /\.export\.CSV$/i.test(file.name) && file.originalSize < 30_000_000,
  });
  const file = Object.values(files)[0];
  if (!file) throw new Error("Arquivo de eventos ausente ou muito grande");
  return strFromU8(file);
}
