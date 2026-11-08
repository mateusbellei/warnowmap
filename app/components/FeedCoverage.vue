<script setup lang="ts">
import { Clock3, AlertTriangle } from "@lucide/vue";
import type { EventFeed } from "#shared/types/conflict";
import { feedCoverage } from "#shared/utils/coverage";
const props = defineProps<{
  feed: EventFeed | null;
  from: string;
  to: string;
  now: number;
  loading: boolean;
  failed: boolean;
}>();
const info = computed(() =>
  feedCoverage(props.feed, props.from, props.to, props.now),
);
const timestamp = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value)) + " UTC";
const age = computed(() =>
  info.value.minutes === null
    ? "Horário não disponível"
    : info.value.minutes < 1
      ? "há menos de 1 min"
      : info.value.minutes < 60
        ? `há ${info.value.minutes} min`
        : `há ${Math.floor(info.value.minutes / 60)} h`,
);
</script>
<template>
  <section
    class="feed-coverage-card"
    :class="{ warning: info.partial || info.state === 'stale' || failed }"
    aria-label="Atualização e cobertura dos dados"
    aria-live="polite"
  >
    <div class="coverage-primary">
      <Clock3 :size="19" />
      <div>
        <strong>{{
          feed?.mode === "demo"
            ? "Demonstração · sem coleta ao vivo"
            : info.last
              ? "Última coleta bem-sucedida"
              : "Sem coleta confirmada"
        }}</strong
        ><span v-if="info.last && feed?.mode !== 'demo'"
          ><time :datetime="info.last">{{ timestamp(info.last) }}</time> ·
          {{ age }}</span
        ><span v-else>{{
          loading
            ? "Consultando o provedor…"
            : "Ainda não há horário confirmado para exibir."
        }}</span>
      </div>
    </div>
    <template v-if="feed && feed.mode !== 'demo'">
      <div class="coverage-summary">
        <AlertTriangle v-if="info.partial || failed" :size="17" />
        <div>
          <strong>{{
            failed
              ? "A última atualização falhou"
              : info.state === "stale"
                ? "Dados podem estar desatualizados"
                : info.partial
                  ? "Cobertura parcial do período"
                  : "Lotes de contexto do período disponíveis"
          }}</strong
          ><span v-if="info.days"
            >{{ info.withRecords }} de {{ info.days }} dias com registros de
            contexto · {{ info.gaps }} dias sem registros. Um dia com registros
            pode ter lacunas.</span
          >
        </div>
      </div>
      <details>
        <summary>Ver cobertura da coleta</summary>
        <p>
          {{ info.batches }} de {{ info.expected }} janelas de 15 minutos com
          contexto registrado até agora, no período selecionado (UTC). Estes
          registros medem a coleta, não a quantidade de conflitos nem a
          veracidade das notícias.
        </p>
        <p v-if="info.temporary">
          Histórico temporário: pode reiniciar na hospedagem. O intervalo
          escolhido não garante um arquivo completo de notícias.
        </p>
        <p v-else>Os dias sem registro não são preenchidos com estimativas.</p>
        <p v-if="feed.message">{{ feed.message }}</p>
      </details>
    </template>
  </section>
</template>
