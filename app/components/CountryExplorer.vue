<script setup lang="ts">
import {
  ArrowUpRight,
  ChevronRight,
  Globe2,
  Star,
  X,
  TrendingUp,
  Activity,
  Shield,
  ExternalLink,
} from "@lucide/vue";
import type {
  CountryCatalog,
  CountryResponse,
  MetricPoint,
  MetricKey,
} from "#shared/types/country";
import { metricDefinitions } from "#shared/types/country";
import type { ConflictEvent } from "#shared/types/conflict";
import {
  latestMetric,
  metricText,
  stabilityColor,
  countryActivity,
  countryDailyActivity,
} from "#shared/utils/country";
const props = defineProps<{
  catalog: CountryCatalog | null;
  events: ConflictEvent[];
  mode: string;
  profileCountry: string;
  open: boolean;
  from: string;
  to: string;
  basis: "event" | "collected";
}>();
const emit = defineEmits<{
  select: [code: string];
  close: [];
  filter: [code: string];
}>();
const search = ref("");
const radarExpanded = ref(false);
const tab = ref("overview");
const favorites = ref<string[]>([]);
const picker = ref("");
const compareCode = ref("USA");
const drawer = ref<HTMLElement>();
let previousFocus: HTMLElement | null = null;
let oldOverflow = "";
const countryOptions = computed(
  () =>
    props.catalog?.countries.filter(
      (country) =>
        country.name
          .toLocaleLowerCase("pt-BR")
          .includes(search.value.toLocaleLowerCase("pt-BR")) ||
        country.code.toLowerCase().includes(search.value.toLowerCase()),
    ) ?? [],
);
const cards = computed(() => {
  const codes = favorites.value.length
    ? favorites.value
    : ["BRA", "UKR", "ISR", "IRN", "USA", "RUS"];
  return codes
    .slice(0, 8)
    .flatMap(
      (code) =>
        props.catalog?.countries.find((country) => country.code === code) ?? [],
    );
});
function favorite(code: string) {
  favorites.value = favorites.value.includes(code)
    ? favorites.value.filter((item) => item !== code)
    : [...favorites.value, code].slice(-12);
  try {
    localStorage.setItem("warnow:countries", JSON.stringify(favorites.value));
  } catch {}
}
onMounted(() => {
  try {
    const saved = JSON.parse(localStorage.getItem("warnow:countries") ?? "[]");
    if (Array.isArray(saved))
      favorites.value = saved
        .filter((code) => typeof code === "string" && /^[A-Z]{3}$/.test(code))
        .slice(0, 12);
  } catch {}
});
const {
  data: response,
  status,
  error,
  refresh,
} = await useFetch<CountryResponse>(
  () => `/api/countries/${props.profileCountry || "BRA"}`,
  { server: false, lazy: true, immediate: false, watch: false, timeout: 25000 },
);
const {
  data: comparison,
  error: comparisonError,
  status: comparisonStatus,
  refresh: refreshComparison,
} = await useFetch<CountryResponse>(
  () => `/api/countries/${compareCode.value}`,
  { server: false, lazy: true, immediate: false, watch: false },
);
const profile = computed(() =>
  response.value?.profile.code === props.profileCountry
    ? response.value.profile
    : null,
);
const activity = computed(() =>
  countryActivity(props.events, props.profileCountry),
);
const recent = computed(() =>
  props.events
    .filter((event) =>
      event.countries.some((country) => country.code === props.profileCountry),
    )
    .slice(0, 8),
);
const stability = computed(() =>
  latestMetric(
    profile.value?.metrics.find((metric) => metric.key === "stability"),
  ),
);
const daily = computed(() =>
  countryDailyActivity(
    props.events,
    props.profileCountry,
    props.from,
    props.to,
    props.basis,
  ),
);
const maxDaily = computed(() =>
  Math.max(1, ...daily.value.map((item) => item.count)),
);
const metricValue = (key: MetricKey, data = profile.value) =>
  latestMetric(data?.metrics.find((metric) => metric.key === key));
const line = (points: MetricPoint[], fixed = false) => {
  const values = points.map((point) => point.value),
    min = fixed ? 0 : Math.min(...values),
    max = fixed ? 100 : Math.max(...values);
  return points
    .map(
      (point, index) =>
        `${8 + ((point.year - points[0]!.year) * 184) / Math.max(1, points.at(-1)!.year - points[0]!.year)},${max === min ? 28 : 48 - ((point.value - min) / (max - min)) * 40}`,
    )
    .join(" ");
};
const time = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value)) + " UTC";
function focusTrap(event: KeyboardEvent) {
  if (event.key === "Escape") {
    event.preventDefault();
    emit("close");
    return;
  }
  if (event.key !== "Tab" || !drawer.value) return;
  const items = [
    ...drawer.value.querySelectorAll<HTMLElement>(
      'button:not([disabled]),a[href],select,input,[tabindex="0"]',
    ),
  ].filter((item) => item.getClientRects().length);
  const first = items[0],
    last = items.at(-1);
  if (
    event.shiftKey &&
    (document.activeElement === first ||
      document.activeElement === drawer.value)
  ) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}
watch(
  () => [props.open, props.profileCountry] as const,
  async (values, previous) => {
    const [open, code] = values;
    const wasOpen = previous?.[0] ?? false;
    if (open && code) {
      if (!wasOpen) {
        previousFocus = document.activeElement as HTMLElement;
        oldOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
      }
      tab.value = "overview";
      if (compareCode.value === code)
        compareCode.value = code === "USA" ? "BRA" : "USA";
      await nextTick();
      drawer.value?.focus();
      refresh();
    } else if (wasOpen) {
      document.body.style.overflow = oldOverflow;
      previousFocus?.focus();
    }
  },
  { immediate: true },
);
watch([compareCode, tab], () => {
  if (props.open && tab.value === "compare" && compareCode.value)
    refreshComparison();
});
onBeforeUnmount(() => {
  if (props.open) document.body.style.overflow = oldOverflow;
});
</script>
<template>
  <section
    class="country-explorer"
    :class="{ 'radar-expanded': radarExpanded }"
    aria-label="Inteligência por país"
  >
    <header class="country-explorer-heading">
      <div>
        <span class="intelligence-eyebrow"
          ><Globe2 :size="14" /> INTELIGÊNCIA POR PAÍS</span
        >
        <h2>O acontecimento. O país. O contexto.</h2>
        <p>Dados oficiais e notícias relacionadas, no mesmo mapa.</p>
      </div>
      <div class="country-picker">
        <label
          >Encontrar país<input
            v-model="search"
            type="search"
            placeholder="Nome ou código do país"
            aria-label="Buscar país no catálogo" /></label
        ><label
          >Explorar<select
            v-model="picker"
            aria-label="Abrir perfil de país"
            @change="picker && emit('select', picker)"
          >
            <option value="">Selecione um país</option>
            <option
              v-for="country in countryOptions"
              :key="country.code"
              :value="country.code"
            >
              {{ country.name }}
            </option>
          </select></label
        >
      </div>
    </header>
    <button
      class="country-radar-toggle"
      :aria-expanded="radarExpanded"
      @click="radarExpanded = !radarExpanded"
    >
      {{ radarExpanded ? "Recolher radar" : "Mostrar radar de países" }}
    </button>
    <div class="country-watchlist-heading">
      <strong>{{ favorites.length ? "Seu radar" : "Radar de países" }}</strong
      ><span>{{
        favorites.length
          ? "Salvo apenas neste navegador"
          : "Selecione a estrela de um país para acompanhar"
      }}</span>
    </div>
    <div class="country-cards">
      <article
        v-for="country in cards"
        :key="country.code"
        class="country-mini-card"
      >
        <button class="country-mini-open" @click="emit('select', country.code)">
          <span>{{ country.name }} <ChevronRight :size="14" /></span
          ><strong
            :style="{ color: stabilityColor(country.stability?.value ?? null) }"
            >{{
              country.stability
                ? metricText(country.stability.value, "score")
                : "Sem série"
            }}</strong
          ><small
            >Estabilidade política ·
            {{ country.stability?.year ?? "não informada" }}</small
          ></button
        ><button
          class="country-star"
          :aria-label="
            (favorites.includes(country.code)
              ? 'Deixar de acompanhar '
              : 'Acompanhar ') + country.name
          "
          :aria-pressed="favorites.includes(country.code)"
          @click="favorite(country.code)"
        >
          <Star
            :size="15"
            :fill="favorites.includes(country.code) ? 'currentColor' : 'none'"
          />
        </button>
      </article>
    </div>
    <footer class="country-explorer-footnote">
      <Shield :size="12" /> WGI / Banco Mundial · estimativa anual baseada em
      percepções institucionais; não é um índice de crise em tempo real.
    </footer>
  </section>
  <Teleport to="body"
    ><div v-if="open" class="country-overlay">
      <button
        class="country-backdrop"
        aria-label="Fechar perfil do país"
        tabindex="-1"
        @click="emit('close')"
      />
      <section
        ref="drawer"
        class="country-drawer"
        role="dialog"
        aria-modal="true"
        :aria-label="'Perfil de ' + (profile?.name ?? profileCountry)"
        tabindex="-1"
        @keydown="focusTrap"
      >
        <header class="country-drawer-heading">
          <div>
            <span class="intelligence-eyebrow"
              >PERFIL NACIONAL · {{ profileCountry }}</span
            >
            <h2>
              {{
                profile?.name ??
                catalog?.countries.find(
                  (country) => country.code === profileCountry,
                )?.name ??
                "Carregando país"
              }}
            </h2>
          </div>
          <div>
            <button
              class="country-star"
              :aria-label="
                favorites.includes(profileCountry)
                  ? 'Deixar de acompanhar país'
                  : 'Acompanhar país'
              "
              :aria-pressed="favorites.includes(profileCountry)"
              @click="favorite(profileCountry)"
            >
              <Star
                :size="19"
                :fill="
                  favorites.includes(profileCountry) ? 'currentColor' : 'none'
                "
              /></button
            ><button
              class="country-close"
              aria-label="Fechar perfil"
              @click="emit('close')"
            >
              <X :size="21" />
            </button>
          </div>
        </header>
        <label class="country-switcher"
          >Explorar outro país<select
            :value="profileCountry"
            aria-label="Trocar país do perfil"
            @change="emit('select', ($event.target as HTMLSelectElement).value)"
          >
            <option
              v-for="country in catalog?.countries"
              :key="country.code"
              :value="country.code"
            >
              {{ country.name }}
            </option>
          </select></label
        >
        <nav class="country-tabs" aria-label="Seções do perfil">
          <button
            v-for="item in [
              { key: 'overview', label: 'Visão geral' },
              { key: 'activity', label: 'Situação recente' },
              { key: 'economy', label: 'Economia' },
              { key: 'news', label: 'Notícias' },
              { key: 'compare', label: 'Comparar' },
            ]"
            :key="item.key"
            :aria-pressed="tab === item.key"
            @click="tab = item.key"
          >
            {{ item.label }}
          </button>
        </nav>
        <div class="country-drawer-body" :aria-busy="status === 'pending'">
          <p
            v-if="status === 'pending' && !profile"
            class="country-empty"
            role="status"
          >
            Carregando estatísticas oficiais…
          </p>
          <div v-else-if="error && !profile" class="country-empty">
            <p>Não foi possível abrir as estatísticas deste país.</p>
            <button @click="refresh()">Tentar novamente</button>
          </div>
          <template v-if="profile">
            <template v-if="tab === 'overview'">
              <section class="country-stability-card">
                <div>
                  <span>ESTABILIDADE POLÍTICA</span
                  ><strong
                    :style="{ color: stabilityColor(stability?.value ?? null) }"
                    >{{
                      stability
                        ? metricText(stability.value, "score")
                        : "Não informada"
                    }}</strong
                  >
                  <p>
                    {{
                      stability
                        ? "Referência " +
                          stability.year +
                          " · WGI / Banco Mundial"
                        : "Não há série oficial disponível para este país."
                    }}
                  </p>
                </div>
                <Shield :size="43" /><small
                  >Maior pontuação representa maior estabilidade estimada. O
                  indicador é anual e não descreve a situação militar
                  atual.</small
                >
              </section>
              <section class="country-section">
                <h3><Activity :size="16" /> No recorte do noticiário</h3>
                <div class="country-activity-grid">
                  <div>
                    <strong>{{ activity.stories }}</strong
                    ><span>histórias relacionadas</span>
                  </div>
                  <div>
                    <strong>{{ activity.publications }}</strong
                    ><span>publicações de origem</span>
                  </div>
                  <div>
                    <strong>{{ activity.conflict }}</strong
                    ><span>sobre conflito e violência</span>
                  </div>
                  <div>
                    <strong>{{ activity.diplomacy }}</strong
                    ><span>sobre diplomacia</span>
                  </div>
                </div>
                <p class="country-explanation">
                  {{ from }} a {{ to }}. Menções ao país não identificam o local
                  do incidente, agressor ou alvo.
                  {{
                    mode === "demo"
                      ? "Noticiário demonstrativo."
                      : mode !== "live"
                        ? "A coleta pode estar desatualizada ou incompleta."
                        : ""
                  }}
                </p>
              </section>
              <div class="country-metric-grid">
                <article
                  v-for="metric in profile.metrics.filter(
                    (metric) =>
                      metric.key === 'population' || metric.key === 'income',
                  )"
                  :key="metric.key"
                  class="country-metric-card"
                >
                  <span>{{ metricDefinitions[metric.key].label }}</span
                  ><strong>{{
                    latestMetric(metric)
                      ? metricText(
                          latestMetric(metric)!.value,
                          metricDefinitions[metric.key].unit,
                        )
                      : "Não informado"
                  }}</strong
                  ><small
                    >{{ latestMetric(metric)?.year ?? "Sem observação" }} ·
                    Banco Mundial</small
                  >
                </article>
              </div>
            </template>
            <template v-if="tab === 'economy'"
              ><section class="country-section">
                <h3><TrendingUp :size="17" /> A economia em perspectiva</h3>
                <p>
                  Indicadores anuais de contexto. A variação econômica não é
                  atribuída automaticamente a conflitos.
                </p>
              </section>
              <div class="country-metric-grid">
                <article
                  v-for="metric in profile.metrics.filter(
                    (metric) => metric.key !== 'stability',
                  )"
                  :key="metric.key"
                  class="country-metric-card"
                >
                  <span>{{ metricDefinitions[metric.key].label }}</span
                  ><strong>{{
                    latestMetric(metric)
                      ? metricText(
                          latestMetric(metric)!.value,
                          metricDefinitions[metric.key].unit,
                        )
                      : "Não informado"
                  }}</strong
                  ><small
                    >{{ latestMetric(metric)?.year ?? "Sem observação" }} ·
                    Banco Mundial</small
                  ><svg
                    v-if="metric.points.length > 1"
                    viewBox="0 0 200 56"
                    role="img"
                    :aria-label="
                      'Série anual de ' +
                      metricDefinitions[metric.key].label +
                      ' de ' +
                      metric.points[0]?.year +
                      ' a ' +
                      metric.points.at(-1)?.year
                    "
                  >
                    <polyline
                      :points="line(metric.points)"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    />
                  </svg>
                  <div class="country-series" v-if="metric.points.length">
                    <span v-for="point in metric.points" :key="point.year"
                      >{{ point.year }}
                      <b>{{
                        metricText(
                          point.value,
                          metricDefinitions[metric.key].unit,
                        )
                      }}</b></span
                    >
                  </div>
                  <a
                    :href="
                      'https://data.worldbank.org/indicator/' +
                      metricDefinitions[metric.key].indicator +
                      '?locations=' +
                      profile.alpha2
                    "
                    target="_blank"
                    rel="noopener noreferrer"
                    >Consultar série <ExternalLink :size="12"
                  /></a>
                </article></div
            ></template>
            <template v-if="tab === 'activity'"
              ><section class="country-section">
                <h3>Instabilidade recente: evidências primeiro</h3>
                <p>
                  O índice composto ainda não é publicado: notícias relacionadas
                  não comprovam incidentes no território. Faltam fontes
                  operacionais independentes e uma série contínua validada.
                </p>
                <div class="country-status-pill">
                  Cobertura disponível: noticiário indexado
                </div>
              </section>
              <div class="country-activity-grid">
                <div>
                  <strong>{{ activity.conflict }}</strong
                  ><span>conflito / violência</span>
                </div>
                <div>
                  <strong>{{ activity.tension }}</strong
                  ><span>tensão / coerção</span>
                </div>
                <div>
                  <strong>{{ activity.diplomacy }}</strong
                  ><span>diplomacia</span>
                </div>
                <div>
                  <strong>{{ activity.economy }}</strong
                  ><span>sinais econômicos</span>
                </div>
              </div>
              <section class="country-section">
                <h3>
                  {{
                    basis === "collected"
                      ? "Histórias por entrada no feed"
                      : "Histórias por data de referência"
                  }}
                </h3>
                <div
                  class="country-daily-bars"
                  role="img"
                  :aria-label="
                    activity.stories + ' histórias no período selecionado'
                  "
                >
                  <div
                    v-for="day in daily"
                    :key="day.day"
                    :title="day.day + ': ' + day.count + ' histórias'"
                  >
                    <i
                      :style="{ height: (day.count / maxDaily) * 100 + '%' }"
                    />
                  </div>
                </div>
                <p class="country-explanation">
                  Dias sem relatos podem refletir lacunas de coleta.
                  {{
                    basis === "collected"
                      ? "O gráfico usa a entrada no feed."
                      : "O gráfico usa publicação ou indexação da notícia."
                  }}
                </p>
              </section>
              <section v-if="response?.history.length" class="country-section">
                <h3>Observações persistentes</h3>
                <p>
                  Janela móvel de sete dias observada pelo coletor; não é
                  contagem de incidentes.
                </p>
                <ol class="country-observations">
                  <li
                    v-for="point in response.history.slice(-7).reverse()"
                    :key="point.day"
                  >
                    <span>{{ point.day }}</span
                    ><b>{{ point.stories }} histórias</b
                    ><small
                      >{{ Math.round(point.coverage * 100) }}% dos lotes de
                      contexto de 7 dias</small
                    >
                  </li>
                </ol>
              </section>
              <p v-else class="country-explanation">
                {{
                  response?.historyState === "unavailable"
                    ? "Histórico temporariamente indisponível."
                    : response?.historyState === "ready"
                      ? "Ainda não há observações diárias deste país."
                      : "O histórico diário começa quando a coleta persistente é ativada. Não há observações retroativas inventadas."
                }}
              </p>
              <section class="country-section" v-if="stability">
                <h3>Contexto institucional · {{ stability.year }}</h3>
                <svg
                  viewBox="0 0 200 56"
                  role="img"
                  aria-label="Série anual de estabilidade política"
                >
                  <polyline
                    :points="
                      line(
                        profile.metrics.find(
                          (metric) => metric.key === 'stability',
                        )!.points,
                        true,
                      )
                    "
                    fill="none"
                    stroke="#8ec5bb"
                    stroke-width="2"
                  />
                </svg></section
            ></template>
            <template v-if="tab === 'news'"
              ><section class="country-section">
                <h3>O país nas fontes</h3>
                <p>
                  Publicações e coberturas relacionadas ao país no período
                  selecionado.
                </p>
              </section>
              <p v-if="!recent.length" class="country-empty">
                Sem relatos disponíveis neste recorte.
              </p>
              <article
                v-for="event in recent"
                :key="event.id"
                class="country-news-item"
              >
                <small>{{ event.source }} · {{ event.eventDate }}</small>
                <h3>{{ event.title }}</h3>
                <span v-if="event.reportCount && event.reportCount > 1"
                  >{{ event.reportCount }} publicações relacionadas</span
                ><a
                  v-if="!event.demo"
                  :href="event.sourceUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  >Ler fonte <ArrowUpRight :size="14"
                /></a></article
            ></template>
            <template v-if="tab === 'compare'"
              ><label class="country-compare-picker"
                >Comparar com<select
                  v-model="compareCode"
                  aria-label="País para comparação"
                >
                  <option
                    v-for="country in catalog?.countries.filter(
                      (country) => country.code !== profileCountry,
                    )"
                    :key="country.code"
                    :value="country.code"
                  >
                    {{ country.name }}
                  </option>
                </select></label
              >
              <p v-if="comparisonStatus === 'pending'" role="status">
                Carregando comparação…
              </p>
              <p v-if="comparisonError" role="alert">
                Não foi possível carregar a comparação.
                <button @click="refreshComparison()">Tentar novamente</button>
              </p>
              <table
                v-if="comparison?.profile.code === compareCode"
                class="country-comparison"
              >
                <caption>
                  Últimas observações disponíveis; confira o ano em cada célula.
                </caption>
                <thead>
                  <tr>
                    <th>Indicador</th>
                    <th>{{ profile.name }}</th>
                    <th>{{ comparison.profile.name }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(definition, key) in metricDefinitions" :key="key">
                    <th>{{ definition.label }}</th>
                    <td>
                      {{
                        metricValue(key)
                          ? metricText(metricValue(key)!.value, definition.unit)
                          : "Não informado"
                      }}<small>{{ metricValue(key)?.year }}</small>
                    </td>
                    <td>
                      {{
                        metricValue(key, comparison.profile)
                          ? metricText(
                              metricValue(key, comparison.profile)!.value,
                              definition.unit,
                            )
                          : "Não informado"
                      }}<small>{{
                        metricValue(key, comparison.profile)?.year
                      }}</small>
                    </td>
                  </tr>
                </tbody>
              </table></template
            >
            <footer class="country-data-source">
              <a
                href="https://www.worldbank.org/en/publication/worldwide-governance-indicators"
                target="_blank"
                rel="noopener noreferrer"
                >Banco Mundial · WDI e WGI <ExternalLink :size="12" /></a
              ><small
                >Dados da fonte: {{ response?.sourceUpdatedAt }} · obtidos em
                {{ response ? time(response.retrievedAt) : "—" }}. Cada série
                preserva seu ano de referência. Ausência de valor não equivale a
                zero.</small
              >
            </footer>
          </template>
        </div>
        <footer class="country-drawer-action">
          <button @click="emit('filter', profileCountry)">
            Ver país no mapa e na linha do tempo <ChevronRight :size="17" />
          </button>
        </footer>
      </section></div
  ></Teleport>
</template>
