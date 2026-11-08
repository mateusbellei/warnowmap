export const militaryDefinitions = {
  active: {
    label: "Militares na ativa",
    detail:
      "Efetivo das Forças Armadas; não inclui reservistas nem a categoria paramilitar do provedor.",
  },
  reserve: {
    label: "Reservistas",
    detail:
      "Reserva informada pelo provedor; critérios de mobilização variam entre países.",
  },
  tanks: {
    label: "Tanques",
    detail:
      "Inventário de tanques principais, médios e leves; não equivale ao total operacional.",
  },
  fighters: {
    label: "Caças / interceptadores",
    detail:
      "Inventário de aeronaves da categoria de caça; não inclui toda a aviação militar.",
  },
  attack: {
    label: "Aviões de ataque",
    detail:
      "Aeronaves de asa fixa dedicadas ao ataque, em categoria separada dos caças. Não somamos categorias.",
  },
  drones: {
    label: "Drones militares",
    detail:
      "O provedor não publica uma contagem comparável de UAVs nesta base.",
  },
} as const;
export type MilitaryKey = keyof typeof militaryDefinitions;
export interface MilitaryValue {
  key: MilitaryKey;
  value: number;
  year: number;
  sourceUrl: string;
}
export interface MilitaryCountry {
  code: string;
  metrics: MilitaryValue[];
}
export interface MilitaryDataset {
  version: 1;
  retrievedAt: string;
  countries: MilitaryCountry[];
}
export interface MilitaryResponse {
  code: string;
  metrics: MilitaryValue[];
  retrievedAt: string | null;
  stale: boolean;
  source: "Global Firepower";
  availability: "available" | "not-covered";
}
