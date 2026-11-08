<script setup lang="ts">
import { Shield, ExternalLink } from "@lucide/vue";
import {
  militaryDefinitions,
  type MilitaryResponse,
  type MilitaryKey,
} from "#shared/types/military";
const props = defineProps<{ code: string }>();
const { data, status, error, refresh } = await useFetch<MilitaryResponse>(
  () => `/api/countries/${props.code}/military`,
  { server: false, lazy: true, timeout: 45000 },
);
const result = computed(() =>
  data.value?.code === props.code ? data.value : null,
);
const keys = Object.keys(militaryDefinitions) as MilitaryKey[];
const value = (key: MilitaryKey) =>
  result.value?.metrics.find((item) => item.key === key);
const count = (number: number) => new Intl.NumberFormat("pt-BR").format(number);
</script>
<template>
  <section
    class="military-profile"
    aria-label="Exército e Forças Armadas"
    :aria-busy="status === 'pending'"
  >
    <h3><Shield :size="19" /> Exército e Forças Armadas</h3>
    <p class="country-explanation">
      Efetivos e inventários públicos das forças terrestres e aéreas. As
      quantidades podem ser estimadas e não medem prontidão ou poder de combate.
    </p>
    <p v-if="status === 'pending' && !result" role="status">
      Consultando inventários…
    </p>
    <p v-else-if="error && !result" role="alert">
      Não foi possível carregar os inventários.
      <button @click="refresh()">Tentar novamente</button>
    </p>
    <template v-else-if="result">
      <p v-if="result.stale" class="military-notice">
        A atualização do provedor está pendente. Exibimos a última referência
        disponível.
      </p>
      <p v-if="result.availability === 'not-covered'" class="military-notice">
        Este país ou território não é coberto pelo inventário integrado.
        Ausência de dados não significa ausência de forças militares.
      </p>
      <div class="country-metric-grid">
        <article
          v-for="key in keys"
          :key="key"
          class="country-metric-card military-card"
        >
          <span>{{ militaryDefinitions[key].label }}</span>
          <strong>{{
            value(key) ? count(value(key)!.value) : "Não disponível"
          }}</strong>
          <small v-if="value(key)"
            >Referência {{ value(key)!.year }} · Global Firepower</small
          >
          <details>
            <summary>O que é contado</summary>
            <p>{{ militaryDefinitions[key].detail }}</p>
          </details>
          <a
            v-if="value(key)"
            :href="value(key)!.sourceUrl"
            target="_blank"
            rel="noopener noreferrer"
            >Consultar fonte <ExternalLink :size="12"
          /></a>
        </article>
      </div>
      <p class="country-explanation">
        Inventário declarado ou estimado, não acompanhamento em tempo real. Zero
        é um valor publicado; “não disponível” indica ausência de série. Drones
        não são incluídos nas contagens de aviação desta base.
      </p>
      <small v-if="result.retrievedAt"
        >Dados obtidos em
        {{
          new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "short",
            timeStyle: "short",
            timeZone: "UTC",
          }).format(new Date(result.retrievedAt))
        }}
        UTC. Atualização automática semanal na consulta.</small
      >
    </template>
  </section>
</template>
