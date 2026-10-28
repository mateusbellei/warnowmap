import type { EconomicImpact } from "../types/conflict";

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
