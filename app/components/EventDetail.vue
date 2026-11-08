<script setup lang="ts">
import { X, ExternalLink } from "@lucide/vue";
import {
  kindLabels,
  situationLabels,
  type ConflictEvent,
} from "#shared/types/conflict";
import { readingContext } from "#shared/utils/reading";
import { economicSectors, economicStageLabels } from "#shared/utils/economy";
import {
  sourceEvidence,
  evidencePlace,
  evidenceDateLabel,
} from "#shared/utils/evidence";
defineProps<{ event: ConflictEvent }>();
defineEmits<{ close: [] }>();
const date = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value.length === 10 ? value + "T12:00:00Z" : value));
</script>
<template>
  <section class="event-detail readable-detail" aria-label="Detalhes do relato">
    <header class="reading-header">
      <span class="event-category" :class="event.kind">{{
        kindLabels[event.kind]
      }}</span>
      <button
        class="icon-button"
        aria-label="Fechar detalhes"
        @click="$emit('close')"
      >
        <X :size="20" />
      </button>
    </header>
    <div class="reading-body">
      <p class="reading-countries">
        {{ event.countries.map((country) => country.name).join(" · ") }}
      </p>
      <span class="evidence-label"
        >O que ocorreu ·
        {{ event.demo ? "demonstração" : "manchete da fonte" }}</span
      >
      <h2>{{ sourceEvidence(event) }}</h2>
      <p class="reading-byline">
        {{ event.source }} · {{ date(event.eventDate)
        }}<span v-if="event.demo"> · Demonstração</span>
      </p>
      <dl class="evidence-facts">
        <div>
          <dt>Onde</dt>
          <dd>{{ evidencePlace(event) }}</dd>
        </div>
        <div>
          <dt>Quando</dt>
          <dd>
            {{ date(event.eventDate)
            }}<small>{{ evidenceDateLabel(event) }}</small>
          </dd>
        </div>
        <div>
          <dt>Segundo qual fonte</dt>
          <dd>
            <a
              v-if="!event.demo"
              :href="event.sourceUrl"
              target="_blank"
              rel="noopener noreferrer"
              >{{ event.source }} ↗</a
            ><span v-else>Demonstração</span>
          </dd>
        </div>
      </dl>
      <section v-if="event.economy" class="reading-context">
        <h3>
          {{ economicSectors[event.economy.sector] }} ·
          {{
            economicStageLabels[
              event.economy.stage ??
                (event.economy.status === "potential" ? "risk" : "measure")
            ]
          }}
        </h3>
        <p>{{ event.economy.label }}</p>
      </section>
      <OccurrenceContext v-if="(event.reportCount ?? 0) > 1" :event="event" />
      <details class="reading-metadata">
        <summary>Como este relato foi classificado</summary>
        <p>{{ readingContext(event) }}</p>
        <p v-if="event.situation">{{ situationLabels[event.situation] }}</p>
        <p v-if="event.selection?.reasons.length">
          {{ event.selection.reasons.join(" ") }}
        </p>
        <p v-if="event.economy">{{ event.economy.context }}</p>
        <p>
          Classificação automática, sem revisão editorial. A manchete é a
          evidência disponível, não um resumo do artigo. Países citados não
          definem agressor ou alvo.
        </p>
        <dl>
          <div>
            <dt>Referência geográfica</dt>
            <dd>
              {{ event.location
              }}{{
                event.locationPrecision === "country"
                  ? " · somente referência nacional"
                  : " · coordenada aproximada"
              }}
            </dd>
          </div>
          <div>
            <dt>
              {{
                event.dateBasis === "publication"
                  ? "Publicação da fonte"
                  : event.dateBasis === "indexed"
                    ? "Indexação, não data do fato"
                    : "Data atribuída ao fato"
              }}
            </dt>
            <dd>{{ date(event.eventDate) }}</dd>
          </div>
          <div>
            <dt>Entrada no feed (UTC)</dt>
            <dd>{{ event.reportedAt.replace("T", " ").slice(0, 16) }}</dd>
          </div>
          <div>
            <dt>Revisão editorial</dt>
            <dd>{{ event.demo ? "Demonstração" : "Não realizada" }}</dd>
          </div>
          <div v-if="event.actors.length">
            <dt>Atores indexados</dt>
            <dd>{{ event.actors.join(" · ") }}</dd>
          </div>
        </dl>
      </details>
    </div>
    <footer v-if="!event.demo" class="reading-action">
      <a :href="event.sourceUrl" target="_blank" rel="noopener noreferrer"
        >Ler notícia em {{ event.source }} <ExternalLink :size="17"
      /></a>
    </footer>
  </section>
</template>
