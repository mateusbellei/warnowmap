<script setup lang="ts">
import { ArrowUpRight, Clock3, Radio } from "@lucide/vue";
import { kindLabels, type ConflictEvent } from "#shared/types/conflict";
import { groupTimeline } from "#shared/utils/timeline";
const props = defineProps<{
  events: ConflictEvent[];
  selected: string | null;
  basis: "event" | "collected";
  loading: boolean;
}>();
defineEmits<{ select: [id: string] }>();
const visible = ref(40);
const groups = computed(() =>
  groupTimeline(props.events.slice(0, visible.value), props.basis),
);
watch(
  () => props.events,
  () => {
    visible.value = 40;
  },
);
const dateLabel = (date: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
const timeLabel = (date: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(date));
</script>

<template>
  <section
    class="chronology"
    aria-label="Linha do tempo de confrontos e diplomacia"
    :aria-busy="loading"
  >
    <header class="chronology-heading">
      <div>
        <Radio :size="17" />
        <h2>Linha do tempo</h2>
      </div>
      <span
        >{{ events.length }}
        {{ events.length === 1 ? "relato" : "relatos" }}</span
      >
    </header>
    <p class="chronology-note">
      <Clock3 :size="12" />{{
        basis === "event"
          ? "Data de referência · publicação ou extração do fato"
          : "Entrada no feed · horário em UTC"
      }}
    </p>
    <div class="chronology-scroll">
      <div v-if="!events.length" class="empty-state">
        <Clock3 :size="28" /><strong>{{
          loading ? "Consultando o histórico" : "Sem relatos neste recorte"
        }}</strong>
        <p>
          {{
            loading
              ? "Buscando confrontos e relações diplomáticas."
              : "Amplie as datas ou os filtros. Ausência de relatos não significa ausência de conflitos."
          }}
        </p>
      </div>
      <section
        v-for="group in groups"
        :key="group.date"
        class="chronology-day"
        :aria-label="dateLabel(group.date)"
      >
        <h3 class="chronology-date">
          <time :datetime="group.date">{{ dateLabel(group.date) }}</time
          ><span
            >{{ group.events.length }}
            {{ group.events.length === 1 ? "exibido" : "exibidos" }}</span
          >
        </h3>
        <ol class="chronology-track">
          <li v-for="event in group.events" :key="event.id" :class="event.kind">
            <button
              class="chronology-card"
              :class="{ selected: selected === event.id }"
              :aria-pressed="selected === event.id"
              @click="$emit('select', event.id)"
            >
              <div class="event-meta">
                <span class="event-category" :class="event.kind">{{
                  kindLabels[event.kind]
                }}</span
                ><span class="chronology-time">{{
                  event.demo
                    ? "DEMO"
                    : basis === "collected"
                      ? `${timeLabel(event.reportedAt)} UTC`
                      : event.dateBasis === "publication"
                        ? "Publicação"
                        : event.dateBasis === "indexed"
                          ? "Indexação"
                          : "Data atribuída"
                }}</span>
              </div>
              <div v-if="event.countries.length" class="country-relation">
                <small class="affiliation-label">{{
                  event.countryBasis === "headline"
                    ? "Países citados na manchete"
                    : "Afiliações dos atores indexados"
                }}</small>
                <template
                  v-for="(country, index) in event.countries"
                  :key="country.code"
                  ><span v-if="index" class="relation-link">·</span
                  ><span>{{ country.name }}</span></template
                >
              </div>
              <h4>{{ event.title }}</h4>
              <span v-if="event.selection" class="selection-badge">{{
                event.selection.basis === "context"
                  ? "Triagem com contexto do artigo"
                  : "Sinal militar · contexto limitado"
              }}</span>
              <div v-if="event.economy" class="timeline-economy">
                <span class="economy-badge"
                  >$
                  {{
                    event.economy.status === "reported"
                      ? "Medida relatada"
                      : "Potencial"
                  }}</span
                >
                <span>{{ event.economy.label }}</span>
              </div>
              <p>{{ event.location }}</p>
              <div class="event-footer">
                <span><span class="source-dot" />{{ event.source }}</span
                ><ArrowUpRight :size="14" />
              </div>
            </button>
          </li>
        </ol>
      </section>
      <button
        v-if="events.length > visible"
        class="filter-button load-more"
        @click="visible += 40"
      >
        Carregar mais {{ Math.min(40, events.length - visible) }} relatos
      </button>
    </div>
  </section>
</template>
