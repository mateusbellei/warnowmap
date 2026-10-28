import type { ConflictEvent } from "../../shared/types/conflict";
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
export const demoEvents: ConflictEvent[] = points.map(
  ([location, region, lng, lat, kind], index) => ({
    id: `demo-${index}`,
    title: `Cenário de demonstração · ${location}`,
    location,
    region: region as ConflictEvent["region"],
    coordinates: [lng, lat],
    kind,
    actors: [],
    reportedAt: "2024-04-06T12:00:00Z",
    eventDate: "2024-04-06",
    source: "Dados ilustrativos",
    sourceUrl: "https://www.gdeltproject.org/",
    mentions: 0,
    military: true,
    demo: true,
  }),
);
