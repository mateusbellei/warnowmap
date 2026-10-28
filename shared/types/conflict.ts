export const regions = [
  "Todas as regiões",
  "Europa",
  "Oriente Médio",
  "África",
  "Ásia e Pacífico",
  "Américas",
] as const;
export type Region = (typeof regions)[number];
export type EventKind = "armed" | "violence" | "tension" | "diplomacy";
export interface CountryRef {
  code: string;
  name: string;
}
export interface ConflictEvent {
  id: string;
  title: string;
  location: string;
  region: Region;
  coordinates: [number, number];
  kind: EventKind;
  actors: string[];
  countries: CountryRef[];
  countryPair: string | null;
  stateLinked: boolean;
  actionCode: string;
  reportedAt: string;
  eventDate: string;
  source: string;
  sourceUrl: string;
  mentions: number;
  military: boolean;
  demo: boolean;
}
export interface EventFeed {
  events: ConflictEvent[];
  mode: "live" | "stale" | "demo" | "unavailable";
  fetchedAt: string | null;
  datasetAt: string | null;
  message: string;
  provider: "GDELT 2.0" | "Demonstração";
  coverage?: {
    firstCollectedAt: string;
    lastCollectedAt: string;
    batches: number;
    retentionDays: number;
    batchDates?: string[];
  };
}
export const kindLabels: Record<EventKind, string> = {
  armed: "Confronto armado",
  violence: "Violência",
  tension: "Coerção e tensão",
  diplomacy: "Diplomacia",
};
