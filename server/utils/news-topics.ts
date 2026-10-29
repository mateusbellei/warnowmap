import type { EventKind } from "../../shared/types/conflict";
export const normalizeText = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

// Regras explicáveis de assunto; não representam confirmação dos fatos ou de responsabilidades.
export function articleTopic(
  headline: string,
  themes: string[],
): { kind: EventKind; reason: string } | null {
  const text = normalizeText(headline);
  if (
    /\b(obituar\w*|dies at|died aged|morre aos|fallece a los|remembering|on this day|a look back|retrospectiv\w*)\b/.test(
      text,
    )
  )
    return null;
  const conflict = themes.some((theme) =>
    [
      "ARMEDCONFLICT",
      "CEASEFIRE",
      "TERROR",
      "TAX_TERROR_GROUP",
      "WMD",
    ].includes(theme),
  );
  const military = conflict || themes.includes("MILITARY");
  if (
    /sanction\w*|sancoes|sanciones|embargo/.test(text) &&
    themes.includes("SANCTIONS")
  )
    return {
      kind: "tension",
      reason: "Manchete sobre sanções e tema SANCTIONS do mesmo artigo",
    };
  if (
    conflict &&
    /ceasefire|truce|peace (talks|deal|agreement|negotiation)|negotiat\w*|mediat\w*|cessar.fogo|tregua|negociac\w*|negociac\w*|mediac\w*|cessez.le.feu|pourparlers|وقف إطلاق النار/.test(
      text,
    )
  )
    return {
      kind: "diplomacy",
      reason:
        "Manchete sobre negociação ou desescalada em contexto de conflito",
    };
  if (
    military &&
    /threat\w*|ameac\w*|amenaz\w*|missile launch|missile test|military (exercise|drill)|naval (exercise|drill)|nuclear.{0,18}(weapon|program|talk|deal|dispute|crisis)|(?:weapon|arma|programa).{0,18}nuclear|lancamento.{0,25}miss|teste.{0,25}miss|deployment|troops deployed/.test(
      text,
    )
  )
    return {
      kind: "tension",
      reason:
        "Manchete sobre ameaça, postura militar ou programa nuclear e tema militar",
    };
  if (
    conflict &&
    /massacre|genocid\w*|ethnic cleansing|civilians.{0,25}killed/.test(text)
  )
    return {
      kind: "violence",
      reason: "Manchete sobre violência em contexto de conflito",
    };
  if (
    conflict &&
    /airstrike\w*|air strike\w*|missile.{0,25}(attack|strike|hit)|drone.{0,25}(attack|strike)|bombard\w*|shelling|clash\w*|fighting|offensive|invasion|invasao|ataque\w*|combate\w*|confronto\w*|enfrentamiento\w*|frappe\w*|боев|удар|صاروخ/.test(
      text,
    )
  )
    return {
      kind: "armed",
      reason: "Manchete sobre ação armada e tema de conflito do mesmo artigo",
    };
  return null;
}
