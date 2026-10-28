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
      <span>{{ events.length }} relatos</span>
    </header>
    <p class="chronology-note">
      <Clock3 :size="12" />{{
        basis === "event"
          ? "Data atribuída ao fato · horário não informado"
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
                      : "Data do fato"
                }}</span>
              </div>
              <div v-if="event.countryPair" class="country-relation">
                <span>{{ event.countries[0]?.name }}</span
                ><span class="relation-link">↔</span
                ><span>{{ event.countries[1]?.name }}</span>
              </div>
              <h4>{{ event.title }}</h4>
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
