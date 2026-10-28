import type { ConflictEvent } from "../../shared/types/conflict";
import { actorCountry } from "../utils/countries";
import { economicImpact } from "../../shared/utils/economy";
// Cenários de interface; não são notícias, incidentes confirmados ou um retrato atual.
const points: [string, string, number, number, ConflictEvent["kind"]][] = [
  ["Ucrânia", "Europa", 37.8, 48.5, "armed"],
  ["Israel e Palestina", "Oriente Médio", 34.47, 31.5, "armed"],
  ["Irã", "Oriente Médio", 51.39, 35.69, "tension"],
  ["Líbano", "Oriente Médio", 35.5, 33.85, "violence"],
  ["Sudão", "África", 32.56, 15.5, "armed"],
  ["República Democrática do Congo", "África", 29.22, -1.67, "violence"],
  ["Sahel", "África", -2, 16, "armed"],
  ["Myanmar", "Ásia e Pacífico", 96.1, 21.9, "armed"],
  ["Estreito de Taiwan", "Ásia e Pacífico", 120, 24, "tension"],
  ["Península Coreana", "Ásia e Pacífico", 127, 38, "tension"],
  ["Venezuela e Guiana", "Américas", -60, 7, "tension"],
  ["Estados Unidos", "Américas", -77.04, 38.9, "tension"],
  ["Iêmen", "Oriente Médio", 44.2, 15.35, "armed"],
  ["Somália", "África", 45.34, 2.04, "violence"],
];
const pairs = [
  ["RUS", "UKR"],
  ["ISR", "PSE"],
  ["IRN", "USA"],
  ["ISR", "LBN"],
  ["SDN"],
  ["COD"],
  ["MLI"],
  ["MMR"],
  ["CHN", "TWN"],
  ["PRK", "KOR"],
  ["VEN", "GUY"],
  ["USA", "CHN"],
  ["YEM", "SAU"],
  ["SOM"],
];
const baseEvents: ConflictEvent[] = points.map(
  ([location, region, lng, lat, kind], index) => ({
    id: `demo-${index}`,
    title: `Cenário de demonstração · ${location}`,
    location,
    region: region as ConflictEvent["region"],
    coordinates: [lng, lat],
    kind,
    actors: [],
    countries: pairs[index]!.map((code) => actorCountry(code)!),
    countryPair:
      pairs[index]!.length === 2 ? [...pairs[index]!].sort().join(":") : null,
    stateLinked: true,
    actionCode: kind === "armed" ? "19" : kind === "tension" ? "13" : "18",
    reportedAt: `2024-04-0${1 + (index % 6)}T12:00:00Z`,
    eventDate: `2024-04-0${1 + (index % 6)}`,
    source: "Dados ilustrativos",
    sourceUrl: "https://www.gdeltproject.org/",
    mentions: 0,
    military: true,
    demo: true,
  }),
);
export const demoEvents: ConflictEvent[] = [
  ...baseEvents,
  ...["163", "1312", "071", "191", "0331", "085"].map(
    (code, index): ConflictEvent => ({
      ...baseEvents[[2, 11, 0, 12, 1, 8][index]!]!,
      id: `demo-economy-${index}`,
      title: `Simulação · ${economicImpact(code)!.label}`,
      actionCode: code,
      economy: economicImpact(code),
      kind: ["071", "0331", "085"].includes(code)
        ? "diplomacy"
        : code === "191"
          ? "armed"
          : "tension",
      reportedAt: `2024-04-0${index + 1}T14:00:00Z`,
      eventDate: `2024-04-0${index + 1}`,
    }),
  ),
  ...[2, 0, 1, 8, 11, 12].map((point, index): ConflictEvent => ({
    ...baseEvents[point]!,
    id: `demo-diplomacy-${index}`,
    title: "Simulação · Consulta e cooperação bilateral",
    kind: "diplomacy",
    military: false,
    actionCode: "04",
    reportedAt: `2024-04-0${1 + index}T16:00:00Z`,
    eventDate: `2024-04-0${1 + index}`,
  })),
];
