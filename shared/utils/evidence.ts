import type { ConflictEvent } from "../types/conflict";
/** Only source text that was actually collected; no synthetic article summary. */
export function sourceEvidence(event: ConflictEvent) {
  const headline = event.articleContext?.headline?.trim();
  return headline || event.title;
}
export function evidencePlace(event: ConflictEvent) {
  if (event.locationPrecision === "country")
    return (
      "Local do fato não confirmado · países mencionados: " +
      (event.countries.map((country) => country.name).join(" · ") ||
        "não identificados")
    );
  return (
    (event.location || "Local não identificado") + " · referência aproximada"
  );
}
export function evidenceDateLabel(event: ConflictEvent) {
  return event.dateBasis === "publication"
    ? "Publicação da fonte"
    : event.dateBasis === "indexed"
      ? "Indexação · data do fato não confirmada"
      : "Data atribuída ao fato";
}
export function evidenceDate(event: ConflictEvent) {
  const time = Date.parse(event.eventDate + "T12:00:00Z");
  return Number.isFinite(time)
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "medium",
        timeZone: "UTC",
      }).format(new Date(time))
    : "Data não informada";
}
