import type { EconomicImpact, ConflictEvent } from "../types/conflict";

export const economicStageLabels = {
  measure: "Medida mencionada",
  disruption: "Interrupção relatada",
  effect: "Efeito descrito pela fonte",
  risk: "Risco / intenção",
} as const;

export function headlineEconomicSignal(
  title: string,
  themes: string[],
): EconomicImpact | undefined {
  const text = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const potential =
    /\b(may|could|risk\w*|threat\w*|propos\w*|consider\w*|plans?|discuss\w*|talks|negotiat\w*|intend\w*|pode|risco\w*|ameac\w*|pretende)\b/.test(
      text,
    );
  const conflict = themes.some((theme) =>
    ["ARMEDCONFLICT", "MILITARY", "CEASEFIRE", "TERROR", "WMD"].includes(theme),
  );
  const linked =
    /\b(war|conflict|guerra|conflito|hormuz|ormuz|red sea|blockade|bloqueio)\b/.test(
      text,
    );
  if (
    /sanction\w*|sancoes|sanciones|embargo/.test(text) &&
    themes.includes("SANCTIONS")
  )
    return {
      sector: "sanctions",
      status: potential ? "potential" : "reported",
      stage: potential ? "risk" : "measure",
      label: "Sanções ou embargo mencionados",
      context:
        "Medida ou discussão relatada na manchete; não demonstra execução, perdas ou efeito econômico mensurado.",
    };
  if (!conflict || !linked) return undefined;
  if (
    /(?:oil|gas|energy|petroleo|energia).{0,25}(?:price|preco)|(?:price|preco).{0,25}(?:oil|gas|energy|petroleo)/.test(
      text,
    ) &&
    /\b(surge\w*|rose|ris\w*|jump\w*|fell|fall\w*|drop\w*|sobe\w*|alta|queda)\b/.test(
      text,
    )
  )
    return {
      sector: "trade",
      status: potential ? "potential" : "reported",
      stage: potential ? "risk" : "effect",
      label: "Variação econômica descrita pela fonte",
      context:
        "A manchete associa variação de preços ao contexto de conflito. Sem cotação própria, estimativa de perdas ou causalidade verificada.",
    };
  if (
    /shipping|ships|ports?|strait|supply|transport|freight|navios|estreito|abastecimento/.test(
      text,
    ) &&
    /clos\w*|halt\w*|disrupt\w*|block\w*|suspend\w*|reopen\w*|fech\w*|interromp\w*|reabr\w*/.test(
      text,
    )
  )
    return {
      sector: "logistics",
      status: potential ? "potential" : "reported",
      stage: potential ? "risk" : "disruption",
      label: /reopen|reabr/.test(text)
        ? "Reabertura logística relatada"
        : "Restrição logística mencionada",
      context:
        "Circulação ou abastecimento mencionados em contexto de conflito; dimensão comercial e impacto não quantificados.",
    };
  if (
    /economic aid|financial aid|financial assistance|ajuda economica|ajuda financeira/.test(
      text,
    )
  )
    return {
      sector: "aid",
      status: potential ? "potential" : "reported",
      stage: potential ? "risk" : "measure",
      label: "Ajuda econômica mencionada",
      context:
        "Anúncio ou apoio relatado; a manchete não comprova desembolso nem efeito sobre a economia.",
    };
  return undefined;
}
export function economicEvidence(
  event: ConflictEvent,
): EconomicImpact | undefined {
  const signal =
    event.sourceType === "article"
      ? headlineEconomicSignal(event.title, event.articleContext?.themes ?? [])
      : event.economy;
  return signal
    ? {
        ...signal,
        stage:
          signal.stage ?? (signal.status === "potential" ? "risk" : "measure"),
        evidence: event.title,
        sourceUrl: event.sourceUrl,
        date: event.eventDate,
      }
    : undefined;
}

export const economicSectors = {
  sanctions: "Sanções",
  trade: "Comércio",
  aid: "Ajuda econômica",
  logistics: "Rotas e logística",
} as const;

// Códigos específicos do manual CAMEO. Não inferimos impacto por país,
// tom da notícia, URL ou simples existência de confronto.
const signals: Record<
  string,
  [EconomicImpact["sector"], EconomicImpact["status"], string, string]
> = {
  "163": [
    "sanctions",
    "reported",
    "Sanções ou embargo relatados",
    "Restrições podem afetar comércio e pagamentos; alcance e perdas não quantificados.",
  ],
  "085": [
    "sanctions",
    "reported",
    "Alívio de sanções relatado",
    "Pode facilitar comércio e pagamentos; recuperação econômica não mensurada.",
  ],
  "1312": [
    "sanctions",
    "potential",
    "Ameaça de sanções",
    "Risco de novas restrições comerciais ou financeiras, caso a ameaça se concretize.",
  ],
  "061": [
    "trade",
    "reported",
    "Cooperação econômica relatada",
    "Sinal de intercâmbio econômico; não demonstra recuperação nem vínculo causal com o conflito.",
  ],
  "0311": [
    "trade",
    "potential",
    "Intenção de cooperação econômica",
    "Possível ampliação do intercâmbio; intenção não equivale a execução.",
  ],
  "1211": [
    "trade",
    "reported",
    "Cooperação econômica rejeitada",
    "Pode limitar oportunidades de comércio e investimento; perdas não mensuradas.",
  ],
  "071": [
    "aid",
    "reported",
    "Ajuda econômica relatada",
    "Apoio financeiro relatado; valor e efeito sobre a economia não informados pelo feed.",
  ],
  "0331": [
    "aid",
    "potential",
    "Intenção de ajuda econômica",
    "Possível apoio financeiro; anúncio não comprova desembolso.",
  ],
  "1621": [
    "aid",
    "reported",
    "Redução de ajuda econômica relatada",
    "Pode restringir recursos disponíveis; dimensão econômica não quantificada.",
  ],
  "191": [
    "logistics",
    "reported",
    "Bloqueio ou restrição de movimento",
    "Pode afetar circulação e abastecimento; o código não comprova interrupção comercial.",
  ],
  "1381": [
    "logistics",
    "potential",
    "Ameaça de bloqueio",
    "Risco para circulação e abastecimento caso o bloqueio ocorra; não é previsão de preços.",
  ],
};

export function economicImpact(actionCode: string): EconomicImpact | undefined {
  const signal = signals[actionCode];
  if (!signal) return undefined;
  const [sector, status, label, context] = signal;
  return { sector, status, label, context };
}
