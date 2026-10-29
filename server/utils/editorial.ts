import type { ConflictEvent } from "../../shared/types/conflict";
import { articleTopic } from "./news-topics";
import { headlineCountries } from "./headline-countries";
import { safeSourceUrl } from "../../shared/utils/events";

const armedRoles = new Set(["MIL", "REB", "INS", "SEP", "UAF"]);
const conflictThemes = new Set([
  "ARMEDCONFLICT",
  "CEASEFIRE",
  "TERROR",
  "TAX_TERROR_GROUP",
  "WMD",
]);
export function explicitStateLink(event: ConflictEvent) {
  return (
    event.participants?.some((actor) =>
      actor.roles.some((role) => role === "GOV" || role === "MIL"),
    ) ?? false
  );
}

// Política de relevância, não probabilidade de veracidade. País/capital não prova papel estatal.
export function assessEvent(event: ConflictEvent): {
  accepted: boolean;
  reason: string;
  basis?: "context" | "structured";
} {
  if (!safeSourceUrl(event.sourceUrl))
    return { accepted: false, reason: "URL de fonte inválida" };
  const roles = event.participants?.flatMap((actor) => actor.roles) ?? [];
  if (event.sourceType === "article") {
    const headline = event.articleContext?.headline;
    const topic = headline
      ? articleTopic(headline, event.articleContext?.themes ?? [])
      : null;
    const named = headline ? headlineCountries(headline) : [];
    if (
      topic &&
      event.kind === topic.kind &&
      event.countryBasis === "headline" &&
      event.locationPrecision === "country" &&
      event.countries.length > 0 &&
      event.countries.every((country) =>
        named.some((item) => item.code === country.code),
      )
    )
      return {
        accepted: true,
        basis: "context",
        reason: `${topic.reason}. Países identificados na manchete; ponto de referência, sem atribuição de agressor ou alvo.`,
      };
    return {
      accepted: false,
      reason:
        "Matéria sem combinação de manchete, tema e referência geográfica identificada",
    };
  }
  if (!event.participants?.length)
    return {
      accepted: false,
      reason: "Arquivo sem papéis dos atores; requer nova coleta",
    };
  const military = roles.some((role) => armedRoles.has(role));
  const government = roles.includes("GOV");
  const humanitarian = roles.some((role) =>
    ["GOV", "MIL", "IGO", "NGO"].includes(role),
  );
  const themes = event.articleContext?.themes ?? [];
  const conflict = themes.some((theme) => conflictThemes.has(theme));
  const code = event.actionCode;
  const headline = event.articleContext?.headline ?? "";
  // Precisão primeiro: sem manchete e temas do próprio artigo não há seleção nova.
  if (!headline)
    return { accepted: false, reason: "Sem manchete contextual do artigo" };
  const narrative = articleTopic(headline, themes);
  if (!narrative || narrative.kind !== event.kind)
    return {
      accepted: false,
      reason:
        "A classificação da ação não corresponde ao assunto principal reconhecido na manchete",
    };
  const mentioned = headlineCountries(event.articleContext?.headline ?? "");
  if (
    event.countries.some(
      (country) => !mentioned.some((item) => item.code === country.code),
    )
  )
    return {
      accepted: false,
      reason: "Afiliações dos atores sem correspondência explícita na manchete",
    };
  const accept = (
    reason: string,
    basis: "context" | "structured" = "context",
  ) => ({ accepted: true, reason, basis });
  // Não usamos temas amplos como CRIME_VIOLENCE, KILL, TRIAL ou WB_*_CONFLICT.
  if (/^(19[1-6]\d?|20[1-4]\d?)$/.test(code) && military && conflict)
    return accept(
      "Ação armada, ator militar ou grupo armado e tema de conflito no mesmo artigo",
    );
  if (/^(1823|183\d?|185|186)$/.test(code) && military && conflict)
    return accept(
      "Violência específica com ator armado e tema de conflito no artigo",
    );
  if (
    ["152", "154", "155"].includes(code) &&
    military &&
    (conflict || themes.includes("MILITARY"))
  )
    return accept("Postura militar específica e tema militar no artigo");
  if (
    ["163", "1312", "085"].includes(code) &&
    government &&
    themes.includes("SANCTIONS") &&
    !!event.countryPair
  )
    return accept(
      "Sanção específica, ator governamental e tema de sanções no artigo",
    );
  if (/^138\d?$/.test(code) && (military || government) && conflict)
    return accept(
      "Ameaça de força militar com ator identificado e tema de conflito",
    );
  if (
    [
      "0256",
      "0356",
      "028",
      "038",
      "039",
      "045",
      "046",
      "057",
      "062",
      "072",
      "087",
      "0871",
      "0872",
      "0873",
      "0874",
    ].includes(code) &&
    (military || government) &&
    conflict
  )
    return accept(
      "Diplomacia ou desescalada específica em artigo sobre conflito",
    );
  if (
    ["071", "073", "074", "0331", "1621"].includes(code) &&
    humanitarian &&
    conflict
  )
    return accept(
      "Ajuda ou restrição de ajuda com ator identificado em contexto de conflito",
    );
  if (
    ["161", "1622", "164", "165"].includes(code) &&
    (military || government) &&
    conflict
  )
    return accept("Ruptura ou restrição específica em contexto de conflito");
  return {
    accepted: false,
    reason:
      "Sem combinação suficiente de ação específica, papéis e contexto de conflito",
  };
}

export function selectEditorial(events: ConflictEvent[]) {
  const selected = new Map<string, ConflictEvent>();
  for (const event of events) {
    const decision = assessEvent(event);
    if (decision.accepted) {
      const key = new URL(event.sourceUrl).href.split("#")[0]!;
      if (
        selected.has(key) &&
        (selected.get(key)?.sourceType === "article" ||
          event.sourceType !== "article")
      )
        continue;
      selected.set(key, {
        ...event,
        ...(event.sourceType === "article"
          ? (() => {
              const countries = headlineCountries(
                event.articleContext?.headline ?? event.title,
              );
              return {
                countries,
                countryPair:
                  countries.length === 2
                    ? countries
                        .map((country) => country.code)
                        .sort()
                        .join(":")
                    : null,
              };
            })()
          : {}),
        stateLinked: explicitStateLink(event),
        selection: { basis: decision.basis!, reasons: [decision.reason] },
      });
    }
  }
  return {
    events: [...selected.values()],
    quality: {
      policy: "conflict-v1" as const,
      evaluated: events.length,
      selected: selected.size,
      rejected: events.length - selected.size,
      withContext: [...selected.values()].filter(
        (event) => event.selection?.basis === "context",
      ).length,
    },
  };
}
