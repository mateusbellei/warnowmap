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
    ) ||
    (/\b(midterms?|elections?|eleico\w*|votac\w*)\b/.test(text) &&
      /(?:hoping for|hope for|predict\w*|esper\w*).{0,35}massacre/.test(text))
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
    conflict &&
    /\b(war|conflict|guerra|conflito|hormuz|ormuz|red sea|blockade)\b/.test(
      text,
    ) &&
    (/(?:oil|gas|energy|petroleo).{0,25}(?:price|preco).{0,25}(?:surge|ris|jump|fall|drop|sobe|alta|queda)/.test(
      text,
    ) ||
      /(?:shipping|ships|port|strait|supply|transport|freight|navios|estreito).{0,35}(?:clos|halt|disrupt|block|suspend|reopen|fech|interromp|reabr)/.test(
        text,
      ) ||
      /(?:clos|halt|disrupt|block|suspend|reopen|fech|interromp|reabr).{0,35}(?:shipping|ships|port|strait|supply|transport|freight|navios|estreito)/.test(
        text,
      ))
  )
    return {
      kind: "tension",
      reason:
        "Manchete sobre efeito econômico ou circulação em contexto explícito de conflito",
    };
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
    /(?:threat\w*|ameac\w*|amenaz\w*).{0,60}(?:strike|attack|war\b|nuclear|militar|missile|invasion|ataque|guerra)|(?:strike|attack|nuclear|militar|missile|invasion|ataque|guerra).{0,60}(?:threat\w*|ameac\w*|amenaz\w*)|missile launch|missile test|military (exercise|drill|deployment)|naval (exercise|drill|deployment)|nuclear.{0,18}(weapon|program|talk|deal|dispute|crisis)|(?:weapon|arma|programa).{0,18}nuclear|lancamento.{0,25}miss|teste.{0,25}miss|troops deployed/.test(
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
