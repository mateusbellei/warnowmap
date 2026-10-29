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
export const actorRoleLabels: Record<string, string> = {
  GOV: "Governo",
  MIL: "Forças armadas",
  REB: "Rebeldes",
  INS: "Insurgentes",
  SEP: "Separatistas",
  UAF: "Grupo armado",
  IGO: "Organização intergovernamental",
  NGO: "Organização não governamental",
};
export interface CountryRef {
  code: string;
  name: string;
}
export interface ConflictEvent {
  reports?: SourceReport[];
  reportCount?: number;
  groupingBasis?: "canonical-url" | "matching-headline";
  firstSeenAt?: string;
  lastSeenAt?: string;
  dossier?: { id: string; label: string; basis: "mentioned-countries" };
  situation?:
    | "reported"
    | "announced"
    | "threatened"
    | "contested"
    | "negotiation"
    | "agreement";
  contentType?: "news" | "analysis" | "liveblog";
  sourceType?: "article" | "extraction";
  countryBasis?: "headline" | "actors";
  dateBasis?: "publication" | "indexed" | "event";
  participants?: {
    name: string;
    country: CountryRef | null;
    roles: string[];
  }[];
  articleContext?: {
    themes: string[];
    headline?: string;
    originalHeadline?: string;
  };
  locationPrecision?: "country" | "region" | "local";
  selection?: { basis: "context" | "structured"; reasons: string[] };
  economy?: EconomicImpact;
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
export interface SourceReport {
  id: string;
  title: string;
  url: string;
  source: string;
  indexedAt: string;
  date: string;
  dateBasis: ConflictEvent["dateBasis"];
}
export const situationLabels = {
  reported: "Relatado pela fonte",
  announced: "Anúncio relatado",
  threatened: "Ameaça / intenção",
  contested: "Negação ou contestação relatada",
  negotiation: "Negociação relatada",
  agreement: "Acordo relatado",
} as const;
export interface EconomicImpact {
  stage?: "measure" | "disruption" | "effect" | "risk";
  evidence?: string;
  sourceUrl?: string;
  date?: string;
  sector: "sanctions" | "trade" | "aid" | "logistics";
  status: "reported" | "potential";
  label: string;
  context: string;
}
export interface EventFeed {
  view?: "reports" | "groups";
  pipelineVersion?: "news-v2" | "news-v3" | "monitor-v1";
  summary?: {
    reports: number;
    occurrences: number;
    dossiers: number;
    policy: "conservative-v1";
  };
  operation?: {
    ingestion: "external" | "on-demand";
    repository: "postgres" | "sqlite" | "temporary";
    lastSuccessAt: string | null;
  };
  quality?: {
    policy: "conflict-v1";
    evaluated: number;
    selected: number;
    rejected: number;
    withContext: number;
  };
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
    persistence?: "ephemeral" | "persistent";
    batchDates?: string[];
    contextBatchDates?: string[];
    contextStatus?: "complete" | "partial";
  };
}
export const kindLabels: Record<EventKind, string> = {
  armed: "Confronto armado",
  violence: "Violência",
  tension: "Coerção e tensão",
  diplomacy: "Diplomacia",
};
