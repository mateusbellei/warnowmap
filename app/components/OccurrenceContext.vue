<script setup lang="ts">
import { situationLabels, type ConflictEvent } from "#shared/types/conflict";
defineProps<{ event: ConflictEvent }>();
const date = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value)) + " UTC";
</script>
<template>
  <section
    v-if="event.reports"
    class="occurrence-context"
    aria-label="Acontecimento e publicações relacionadas"
  >
    <div class="occurrence-badges">
      <span>{{
        event.situation ? situationLabels[event.situation] : "Relatado"
      }}</span>
      <span v-if="event.contentType === 'liveblog'"
        >Acompanhamento ao vivo</span
      >
      <span v-else-if="event.contentType === 'analysis'"
        >Análise / opinião identificada</span
      >
      <span
        >{{ event.reportCount }}
        {{ event.reportCount === 1 ? "publicação" : "publicações" }}</span
      >
    </div>
    <p v-if="event.dossier">
      <strong>Contexto: {{ event.dossier.label }}</strong
      ><small
        >Agrupamento por países citados; não identifica beligerantes ou uma
        guerra específica.</small
      >
    </p>
    <details>
      <summary>
        Ver publicações e atualizações ({{ event.reportCount }})
      </summary>
      <p>
        {{
          event.groupingBasis === "matching-headline"
            ? "Manchetes equivalentes agrupadas automaticamente. Republicações não comprovam confirmação por fontes independentes."
            : "URLs da mesma matéria ou acompanhamento agrupadas. A manchete geral de um liveblog não descreve cada atualização individual."
        }}
      </p>
      <ol class="source-reports">
        <li v-for="report in event.reports" :key="report.url">
          <a :href="report.url" target="_blank" rel="noopener noreferrer"
            >{{ report.source }} ↗</a
          >
          <span>{{ report.title }}</span
          ><small>Indexação: {{ date(report.indexedAt) }}</small>
        </li>
      </ol>
    </details>
    <p v-if="event.firstSeenAt" class="observed-at">
      Primeira observação nesta instalação: {{ date(event.firstSeenAt) }}. Não é
      a data do fato.
    </p>
  </section>
</template>
