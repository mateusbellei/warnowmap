import { type ConflictEvent } from "../types/conflict";
export function readingContext(event: ConflictEvent): string {
  if (event.demo)
    return "Cenário ilustrativo para explorar a interface; não descreve uma notícia atual.";
  const subject = {
    armed: "Ação armada relatada em contexto de conflito",
    violence: "Violência relatada em contexto de conflito",
    tension: "Tensão, restrição ou postura militar mencionada pela fonte",
    diplomacy: "Negociação ou desescalada mencionada em contexto de conflito",
  }[event.kind];
  const geography =
    event.locationPrecision === "country"
      ? "A localização indica somente um país citado na notícia."
      : "A coordenada foi extraída da fonte e pode ser aproximada.";
  return `${subject}. ${geography}`;
}
