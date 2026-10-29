<script setup lang="ts">
import {
  Globe2,
  Radio,
  Search,
  SlidersHorizontal,
  ArrowUpRight,
  Crosshair,
  ShieldCheck,
  X,
  RefreshCw,
  ExternalLink,
  Info,
  Clock3,
  ArrowRight,
  Pause,
  Play,
  Check,
  Layers,
  Handshake,
  ChevronLeft,
  ChevronRight,
  History,
  Map as MapIcon,
  Landmark,
} from "@lucide/vue";
import {
  regions,
  actorRoleLabels,
  kindLabels,
  type EventKind,
  type EventFeed,
  type Region,
} from "#shared/types/conflict";
import { filterEvents } from "#shared/utils/events";
import { economicSectors, economicStageLabels } from "#shared/utils/economy";
import { eventsInView, type MapBounds } from "#shared/utils/map";
import {
  calendarDays,
  sortTimeline,
  timelineDays,
} from "#shared/utils/timeline";

const route = useRoute();
const roleLabel = (role: string) => actorRoleLabels[role] ?? "Outro papel";
const router = useRouter();
const demo = ref(route.query.demo === "true");
const search = ref(
  typeof route.query.q === "string" ? route.query.q.slice(0, 200) : "",
);
const region = ref<Region>("Todas as regiões");
const country = ref(
  typeof route.query.country === "string" ? route.query.country : "",
);
const pair = ref(typeof route.query.pair === "string" ? route.query.pair : "");
const interstateOnly = ref(false);
const stateOnly = ref(false);
const kinds = ref<EventKind[]>(
  route.query.focus === "conflicts"
    ? ["armed", "violence"]
    : ["armed", "violence", "tension", "diplomacy"],
);
const conflictFocus = computed(
  () =>
    kinds.value.length === 2 &&
    kinds.value.includes("armed") &&
    kinds.value.includes("violence"),
);
const basis = ref<"event" | "collected">("event");
const order = ref<"asc" | "desc">("desc");
const now = ref(Date.now());
const today = () => new Date().toISOString().slice(0, 10);
const weekStart = (end: string) =>
  new Date(Date.parse(`${end}T12:00:00Z`) - 6 * 86400000)
    .toISOString()
    .slice(0, 10);
const from = ref(weekStart(today()));
const to = ref(today());
const cursor = ref(6);
const playing = ref(false);
const paused = ref(false);
const heatmap = ref(false);
const windowHours = ref(168);
const onlyNew = ref(false);
const previousVisit = ref<string | null>(null);
const dossier = ref("");
const referenceOnly = computed(() =>
  (feed.value?.events ?? []).every(
    (item) => item.locationPrecision === "country",
  ),
);
const newEvents = computed(() =>
  (feed.value?.events ?? []).filter(
    (item) =>
      previousVisit.value &&
      Date.parse(item.lastSeenAt ?? item.firstSeenAt ?? item.reportedAt) >
        Date.parse(previousVisit.value!),
  ),
);
function setWindow(hours: number) {
  basis.value = "collected";
  windowHours.value = hours;
  to.value = today();
  from.value = new Date(Date.now() - hours * 3600000)
    .toISOString()
    .slice(0, 10);
  resetCursor();
}
const dossiers = computed(() => [
  ...new Map(
    (feed.value?.events ?? [])
      .filter((item) => item.dossier)
      .map((item) => [item.dossier!.id, item.dossier!]),
  ).values(),
]);
const showFilters = ref(false);
const showAbout = ref(false);
const mobileMap = ref(true);
const onlyInView = ref(false);
const economicOnly = ref(route.query.economy === "true");
const mapBounds = shallowRef<MapBounds | null>(null);
const selected = ref<string | null>(null);
const aboutPanel = ref<HTMLDialogElement>();
const {
  data: feed,
  status,
  error,
  refresh,
} = await useFetch<EventFeed>("/api/events", {
  query: {
    demo,
    scope: computed(() =>
      interstateOnly.value ? (stateOnly.value ? "state" : "bilateral") : "all",
    ),
  },
  timeout: 65000,
  lazy: true,
  server: false,
});
const loading = computed(
  () =>
    status.value === "pending" ||
    (status.value === "idle" && !feed.value && !error.value),
);
const isDemo = computed(() => feed.value?.mode === "demo");
const days = computed(() => calendarDays(from.value, to.value));
const cutoff = computed(
  () => days.value[Math.min(cursor.value, days.value.length - 1)] ?? "",
);
const atPresent = computed(() => cursor.value === days.value.length - 1);
const baseEvents = computed(() =>
  filterEvents(
    (feed.value?.events ?? []).filter(
      (item) =>
        (!dossier.value || item.dossier?.id === dossier.value) &&
        (!onlyNew.value ||
          (previousVisit.value &&
            Date.parse(item.lastSeenAt ?? item.firstSeenAt ?? item.reportedAt) >
              Date.parse(previousVisit.value))),
    ),
    {
      search: search.value,
      region: region.value,
      kinds: kinds.value,
      hours: windowHours.value,
      now: now.value,
      interstateOnly: interstateOnly.value,
      stateOnly: stateOnly.value,
      country: country.value,
      pair: pair.value,
      economicOnly: economicOnly.value,
    },
  ),
);
const inPeriod = computed(() =>
  baseEvents.value.filter((event) => {
    const date =
      basis.value === "event" ? event.eventDate : event.reportedAt.slice(0, 10);
    return days.value.length > 0 && date >= from.value && date <= to.value;
  }),
);
const events = computed(() =>
  sortTimeline(
    inPeriod.value.filter(
      (event) =>
        (basis.value === "event"
          ? event.eventDate
          : event.reportedAt.slice(0, 10)) <= cutoff.value,
    ),
    basis.value,
    order.value,
  ),
);
const timelineEvents = computed(() =>
  onlyInView.value ? eventsInView(events.value, mapBounds.value) : events.value,
);
const economicEvents = computed(() =>
  events.value.filter((event) => event.economy),
);
const economicSummary = computed(() => ({
  stages: Object.entries(economicStageLabels).map(([key, label]) => ({
    key,
    label,
    count: economicEvents.value.filter(
      (item) =>
        (item.economy?.stage ??
          (item.economy?.status === "potential" ? "risk" : "measure")) === key,
    ).length,
  })),
  reported: economicEvents.value.filter(
    (event) => event.economy?.status === "reported",
  ).length,
  potential: economicEvents.value.filter(
    (event) => event.economy?.status === "potential",
  ).length,
  sectors: Object.entries(economicSectors).map(([key, label]) => ({
    key,
    label,
    count: economicEvents.value.filter((event) => event.economy?.sector === key)
      .length,
  })),
}));
const dailyCounts = computed(
  () =>
    new Map(
      timelineDays(inPeriod.value, basis.value).map((day) => [
        day.date,
        day.count,
      ]),
    ),
);
const maxCount = computed(() => Math.max(1, ...dailyCounts.value.values()));
const active = computed(() =>
  events.value.find((event) => event.id === selected.value),
);
const countryOptions = computed(() =>
  [
    ...new Map(
      (feed.value?.events ?? [])
        .flatMap((event) => event.countries)
        .map((item) => [item.code, item]),
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
);
const relations = computed(() => {
  const index = new Map<
    string,
    { key: string; label: string; count: number }
  >();
  for (const event of feed.value?.events ?? []) {
    if (!event.countryPair || !event.countries[1]) continue;
    const current = index.get(event.countryPair);
    if (current) current.count++;
    else
      index.set(event.countryPair, {
        key: event.countryPair,
        label: [...event.countries]
          .sort((a, b) => a.code.localeCompare(b.code))
          .map((c) => c.name)
          .join(" · "),
        count: 1,
      });
  }
  return [...index.values()].sort(
    (a, b) => b.count - a.count || a.key.localeCompare(b.key),
  );
});
const pairOptions = computed(() => relations.value.slice(0, 6));
const pairLabel = computed(
  () => relations.value.find((relation) => relation.key === pair.value)?.label,
);
const counts = computed(() => ({
  combat: events.value.filter((e) => e.kind === "armed").length,
  violence: events.value.filter((e) => e.kind === "violence").length,
  armed: events.value.filter((e) => ["armed", "violence"].includes(e.kind))
    .length,
  diplomacy: events.value.filter((e) => e.kind === "diplomacy").length,
  tension: events.value.filter((e) => e.kind === "tension").length,
  pairs: new Set(events.value.map((e) => e.countryPair).filter(Boolean)).size,
}));
const modeLabel = computed(() =>
  !feed.value
    ? "Aguardando coleta"
    : feed.value.coverage?.contextStatus === "partial"
      ? "Coleta incompleta"
      : {
          live: "Feed conectado",
          stale: "Dados desatualizados",
          demo: "Demonstração",
          unavailable: "Feed indisponível",
        }[feed.value?.mode ?? "unavailable"],
);
function formatDate(value: string, time = false) {
  return (
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: "UTC",
      day: "2-digit",
      month: "short",
      year: "numeric",
      ...(time ? ({ hour: "2-digit", minute: "2-digit" } as const) : {}),
    }).format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value)) +
    (time ? " UTC" : "")
  );
}
function shortDay(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
  }).format(new Date(`${value}T12:00:00Z`));
}
function toggleKind(kind: EventKind) {
  kinds.value = kinds.value.includes(kind)
    ? kinds.value.filter((value) => value !== kind)
    : [...kinds.value, kind];
}
function toggleConflictFocus() {
  kinds.value = conflictFocus.value
    ? ["armed", "violence", "tension", "diplomacy"]
    : ["armed", "violence"];
  mobileMap.value = true;
}
function choose(id: string) {
  selected.value = selected.value === id ? null : id;
  if (selected.value) mobileMap.value = true;
}
function setPair(key: string) {
  pair.value = pair.value === key ? "" : key;
  country.value = "";
  playing.value = false;
}
function resetCursor() {
  cursor.value = Math.max(0, days.value.length - 1);
  playing.value = false;
}
function clearFilters() {
  dossier.value = "";
  onlyNew.value = false;
  windowHours.value = 168;
  economicOnly.value = false;
  onlyInView.value = false;
  search.value = "";
  region.value = "Todas as regiões";
  country.value = "";
  pair.value = "";
  interstateOnly.value = false;
  stateOnly.value = false;
  kinds.value = ["armed", "violence", "tension", "diplomacy"];
  basis.value = "event";
  order.value = "desc";
  const end = isDemo.value ? "2024-04-06" : today();
  from.value = weekStart(end);
  to.value = end;
  resetCursor();
}
function toggleReplay() {
  if (!days.value.length) return;
  if (playing.value) playing.value = false;
  else {
    if (atPresent.value) cursor.value = 0;
    playing.value = true;
  }
}
function keyboard(event: KeyboardEvent) {
  if (event.key === "Escape") {
    selected.value = null;
    showFilters.value = false;
  }
  if (
    event.key === "/" &&
    !(
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    ) &&
    !showAbout.value
  ) {
    event.preventDefault();
    document.querySelector<HTMLInputElement>(".search-field input")?.focus();
  }
}
watch([from, to, basis], resetCursor);
watch(events, (values) => {
  if (selected.value && !values.some((event) => event.id === selected.value))
    selected.value = null;
});
watch(
  isDemo,
  (value, previous) => {
    if (previous !== undefined) {
      country.value = "";
      pair.value = "";
      search.value = "";
    }
    const end = value ? "2024-04-06" : today();
    to.value = end;
    from.value = weekStart(end);
    resetCursor();
  },
  { immediate: true },
);
watch(showAbout, (value) => {
  if (value) aboutPanel.value?.showModal();
  else aboutPanel.value?.close();
});
watch([search, country, pair, demo, economicOnly, conflictFocus], () => {
  router.replace({
    query: {
      q: search.value || undefined,
      country: country.value || undefined,
      pair: pair.value || undefined,
      demo: demo.value ? "true" : undefined,
      economy: economicOnly.value ? "true" : undefined,
      focus: conflictFocus.value ? "conflicts" : undefined,
    },
  });
});
let poller: ReturnType<typeof setInterval>;
let replay: ReturnType<typeof setInterval>;
onMounted(() => {
  try {
    previousVisit.value = localStorage.getItem("warnow:last-visit");
    localStorage.setItem("warnow:last-visit", new Date().toISOString());
  } catch {}
  document.addEventListener("keydown", keyboard);
  poller = setInterval(() => {
    now.value = Date.now();
    if (
      !paused.value &&
      !playing.value &&
      !isDemo.value &&
      !document.hidden &&
      status.value !== "pending"
    )
      refresh();
  }, 60000);
  replay = setInterval(() => {
    if (!playing.value || document.hidden) return;
    if (atPresent.value) playing.value = false;
    else cursor.value++;
  }, 1500);
});
onBeforeUnmount(() => {
  try {
    localStorage.setItem("warnow:last-visit", new Date().toISOString());
  } catch {}
  clearInterval(poller);
  clearInterval(replay);
  document.removeEventListener("keydown", keyboard);
});
</script>

<template>
  <div class="app-shell diplomatic-shell map-first-shell">
    <a href="#main-content" class="skip-link">Pular para o conteúdo</a>
    <aside class="navigation-rail" aria-label="Navegação principal">
      <a class="rail-brand" href="/" aria-label="WarNow início"
        ><img src="/brand.svg" width="36" height="36" alt="" /></a
      ><button
        class="rail-button current"
        aria-label="Ver linha do tempo"
        title="Linha do tempo"
        @click="mobileMap = false"
      >
        <History :size="21" /></button
      ><button
        class="rail-button"
        aria-label="Ver mapa"
        title="Mapa"
        @click="mobileMap = true"
      >
        <Globe2 :size="21" /></button
      ><button
        class="rail-button"
        aria-label="Abrir filtros"
        title="Filtros"
        @click="showFilters = !showFilters"
      >
        <SlidersHorizontal :size="20" />
      </button>
      <div class="rail-bottom">
        <button
          class="rail-button"
          aria-label="Sobre os dados"
          @click="showAbout = true"
        >
          <Info :size="20" /></button
        ><span class="rail-version">W/N</span>
      </div>
    </aside>
    <div class="workspace">
      <header class="topbar">
        <a class="wordmark" href="/"
          >war<span>now</span><span class="wordmark-dot">●</span
          ><small>CONFLICT & DIPLOMACY MONITOR</small></a
        >
        <nav class="header-nav" aria-label="Visualizações">
          <button :class="{ active: !mobileMap }" @click="mobileMap = false">
            <History :size="15" /> Linha do tempo</button
          ><button :class="{ active: mobileMap }" @click="mobileMap = true">
            <Globe2 :size="15" /> Mapa global
          </button>
        </nav>
        <div class="topbar-right">
          <span class="connection" :class="feed?.mode"
            ><i />{{ loading ? "Consultando feed" : modeLabel }}</span
          >
        </div>
      </header>
      <main id="main-content" class="main-content">
        <section class="page-heading">
          <div>
            <div class="eyebrow"><span /> CONFRONTOS & DIPLOMACIA</div>
            <h1>O cenário global, no mapa.</h1>
            <p>
              Acompanhe confrontos, tensões e diálogo, acontecimento por
              acontecimento.
            </p>
          </div>
          <div class="heading-meta">
            <span><Clock3 :size="14" /> ÚLTIMO LOTE</span
            ><strong>{{
              feed?.datasetAt
                ? formatDate(feed.datasetAt, true)
                : "Sem coleta ao vivo"
            }}</strong
            ><button @click="showAbout = true">
              Fontes e cobertura <ArrowUpRight :size="13" />
            </button>
          </div>
        </section>
        <section class="stats-grid" aria-label="Resumo do recorte temporal">
          <article>
            <div class="stat-icon coral"><Crosshair :size="20" /></div>
            <div>
              <span>Confrontos e violência</span
              ><strong
                >{{ counts.armed.toString().padStart(2, "0")
                }}<small>relatos no recorte</small></strong
              >
            </div>
          </article>
          <article>
            <div class="stat-icon green"><Handshake :size="20" /></div>
            <div>
              <span>Ações diplomáticas</span
              ><strong
                >{{ counts.diplomacy.toString().padStart(2, "0")
                }}<small>diálogo e cooperação</small></strong
              >
            </div>
          </article>
          <article>
            <div class="stat-icon amber"><Radio :size="20" /></div>
            <div>
              <span>Tensões e coerção</span
              ><strong
                >{{ counts.tension.toString().padStart(2, "0")
                }}<small>classificação automática</small></strong
              >
            </div>
          </article>
          <article>
            <div class="stat-icon blue"><Globe2 :size="20" /></div>
            <div>
              <span>Associações de países</span
              ><strong
                >{{ counts.pairs.toString().padStart(2, "0")
                }}<small>países citados ou associados</small></strong
              >
            </div>
          </article>
        </section>

        <section
          class="relation-strip"
          aria-label="Relações presentes no histórico"
        >
          <span>PAÍSES ASSOCIADOS</span
          ><button :class="{ active: !pair }" @click="pair = ''">Todas</button
          ><button
            v-for="relation in pairOptions"
            :key="relation.key"
            :class="{ active: pair === relation.key }"
            @click="setPair(relation.key)"
          >
            {{ relation.label }} <small>{{ relation.count }}</small>
          </button>
        </section>
        <section
          class="monitor diplomacy-monitor"
          aria-label="Monitor de confrontos e diplomacia"
        >
          <section
            class="monitor-overview"
            aria-label="Resumo de acontecimentos e publicações"
          >
            <div>
              <strong>{{
                loading ? "—" : (feed?.summary?.occurrences ?? events.length)
              }}</strong
              ><span>acontecimentos no arquivo</span>
            </div>
            <div>
              <strong>{{
                loading ? "—" : (feed?.summary?.reports ?? events.length)
              }}</strong
              ><span>publicações de origem</span>
            </div>
            <small>{{
              !feed
                ? "Consultando cobertura"
                : feed.operation?.ingestion === "on-demand"
                  ? "Coleta sob demanda"
                  : "Histórico persistente"
            }}</small>
          </section>
          <section
            class="conflict-spotlight"
            :class="{ focused: conflictFocus }"
            aria-label="Conflitos em destaque"
          >
            <div class="conflict-emblem"><Crosshair :size="24" /></div>
            <div class="conflict-heading">
              <span>MONITOR DE CONFLITOS</span>
              <h2>Conflitos em destaque</h2>
              <p>
                {{
                  loading
                    ? "Consultando relatos do recorte…"
                    : counts.armed
                      ? "Confrontos e violência relatados neste recorte."
                      : "Sem relatos de confronto ou violência neste recorte."
                }}
              </p>
            </div>
            <div class="conflict-metrics">
              <div>
                <strong>{{ loading ? "—" : counts.combat }}</strong
                ><span>{{
                  counts.combat === 1
                    ? "relato de confronto"
                    : "relatos de confronto"
                }}</span>
              </div>
              <div>
                <strong>{{ loading ? "—" : counts.violence }}</strong
                ><span>{{
                  counts.violence === 1
                    ? "relato de violência"
                    : "relatos de violência"
                }}</span>
              </div>
            </div>
            <button
              class="conflict-focus-button"
              :aria-pressed="conflictFocus"
              @click="toggleConflictFocus"
            >
              <Crosshair :size="15" />{{
                conflictFocus ? "Ver todas as categorias" : "Focar conflitos"
              }}<ArrowRight :size="15" />
            </button>
          </section>
          <div class="monitor-toolbar">
            <div class="view-title">
              <span class="live-dot" /><strong>{{
                pairLabel || "Confrontos e diplomacia"
              }}</strong
              ><span class="toolbar-divider" /><span class="muted"
                >{{ events.length }}
                {{
                  events.length === 1 ? "acontecimento" : "acontecimentos"
                }}</span
              >
            </div>
            <div class="toolbar-actions">
              <label class="search-field"
                ><Search :size="16" /><input
                  v-model="search"
                  type="search"
                  maxlength="200"
                  aria-label="Buscar país, local ou ator"
                  placeholder="Buscar país, local ou ator…"
                /><kbd>/</kbd></label
              ><button
                class="filter-button"
                :class="{ toggled: showFilters }"
                :aria-expanded="showFilters"
                @click="showFilters = !showFilters"
              >
                <SlidersHorizontal :size="15" /> Filtros</button
              ><button
                class="icon-button"
                aria-label="Fontes e metodologia"
                @click="showAbout = true"
              >
                <Info :size="17" />
              </button>
            </div>
          </div>
          <div
            class="diplomacy-categories"
            aria-label="Categorias de acontecimentos"
          >
            <button
              v-for="(label, kind) in kindLabels"
              :key="kind"
              :class="[kind, { active: kinds.includes(kind) }]"
              :aria-pressed="kinds.includes(kind)"
              :aria-label="label"
              @click="toggleKind(kind)"
            >
              <i /><Check v-if="kinds.includes(kind)" :size="12" /><span
                class="category-full"
                >{{ label }}</span
              ><span class="category-short">{{
                kind === "armed"
                  ? "Confronto"
                  : kind === "tension"
                    ? "Tensão"
                    : label
              }}</span></button
            ><span>{{
              interstateOnly
                ? "Afiliações nacionais distintas; não identifica agressores ou alvos."
                : "Inclui conflitos internos. Países são menções ou afiliações; não indicam agressor ou alvo."
            }}</span>
          </div>
          <section
            class="quick-windows"
            aria-label="Recorte rápido e novidades"
          >
            <span>Entradas</span
            ><button
              v-for="window in [
                { h: 6, label: '6 h' },
                { h: 24, label: '24 h' },
                { h: 168, label: '7 dias' },
                { h: 720, label: '30 dias' },
              ]"
              :key="window.h"
              :class="{ active: windowHours === window.h }"
              @click="setWindow(window.h)"
            >
              {{ window.label }}
            </button>
            <button
              v-if="previousVisit"
              :class="{ active: onlyNew }"
              @click="onlyNew = !onlyNew"
            >
              {{ newEvents.length }} novos/atualizados desde a última visita
            </button>
            <select v-model="dossier" aria-label="Contexto por países citados">
              <option value="">Todos os contextos</option>
              <option v-for="item in dossiers" :key="item.id" :value="item.id">
                {{ item.label }}
              </option>
            </select>
          </section>
          <details v-if="feed?.quality" class="quality-summary">
            <summary>
              <SlidersHorizontal :size="13" /> Triagem de conflitos ·
              {{ feed.quality.selected }}
              {{
                feed.quality.selected === 1
                  ? "publicação selecionada"
                  : "publicações selecionadas"
              }}
              no arquivo
            </summary>
            <p>
              {{ feed.quality.rejected }} de
              {{ feed.quality.evaluated }} extrações ficaram fora por falta de
              sinais específicos. {{ feed.quality.withContext }} selecionados
              têm contexto temático do mesmo artigo. Sem manchete e temas, novos
              relatos ficam fora da seleção. A triagem não confirma fatos,
              autoria de ataques ou a localização exata.
            </p>
          </details>
          <section
            class="economy-strip"
            aria-label="Principais sinais econômicos no recorte"
          >
            <button
              class="economy-toggle"
              :class="{ active: economicOnly }"
              :aria-pressed="economicOnly"
              @click="economicOnly = !economicOnly"
            >
              <Landmark :size="17" /><span
                >Economia<small>{{
                  economicOnly
                    ? "Ver todos os relatos"
                    : "Filtrar sinais econômicos"
                }}</small></span
              ><Check v-if="economicOnly" :size="14" />
            </button>
            <div class="economy-totals">
              <strong v-for="stage in economicSummary.stages" :key="stage.key"
                >{{ stage.count }}<small>{{ stage.label }}</small></strong
              >
            </div>
            <div class="economy-sectors">
              <span v-for="sector in economicSummary.sectors" :key="sector.key"
                >{{ sector.label }} <b>{{ sector.count }}</b></span
              >
            </div>
            <p>
              {{
                economicEvents.length
                  ? "Sinais do recorte · efeitos possíveis, sem estimativas de perdas ou preços."
                  : "Sem sinais econômicos classificados neste recorte; não significa ausência de impacto."
              }}
            </p>
          </section>
          <div v-if="showFilters" class="filter-panel">
            <label
              >Região<select v-model="region">
                <option v-for="item in regions" :key="item">{{ item }}</option>
              </select></label
            ><label
              >País<select v-model="country" @change="pair = ''">
                <option value="">Todos os países</option>
                <option
                  v-for="item in countryOptions"
                  :key="item.code"
                  :value="item.code"
                >
                  {{ item.name }}
                </option>
              </select></label
            ><label
              >Relação bilateral<select v-model="pair" @change="country = ''">
                <option value="">Todas as relações</option>
                <option
                  v-for="relation in relations"
                  :key="relation.key"
                  :value="relation.key"
                >
                  {{ relation.label }}
                </option>
              </select></label
            ><label class="military-filter"
              ><input v-model="interstateOnly" type="checkbox" /> Apenas países
              distintos</label
            ><label class="military-filter"
              ><input v-model="stateOnly" type="checkbox" /> Com vínculo estatal
              identificado<small
                >Papel explícito de governo ou forças armadas</small
              ></label
            ><button class="text-button" @click="clearFilters">
              Limpar filtros
            </button>
          </div>

          <div
            v-if="
              error ||
              (feed &&
                (feed.mode !== 'live' ||
                  feed.coverage?.contextStatus === 'partial'))
            "
            class="feed-status-banner"
            :class="feed?.mode"
            role="status"
          >
            <Info :size="15" /><span>{{
              error
                ? "Falha ao consultar o servidor. Tente atualizar o feed."
                : feed?.message
            }}</span
            ><button v-if="!isDemo" class="text-button" @click="demo = true">
              Explorar demo <ArrowRight :size="13" /></button
            ><button v-else class="text-button" @click="demo = false">
              Consultar feed <ArrowRight :size="13" />
            </button>
          </div>

          <div
            class="diplomacy-layout"
            :class="{ 'mobile-map': mobileMap, 'map-focused': mobileMap }"
          >
            <div class="timeline-column">
              <div class="timeline-sort">
                <span>{{
                  interstateOnly
                    ? "Atores de países distintos"
                    : "Todos os atores"
                }}</span
                ><label
                  >Ordem<select v-model="order" aria-label="Ordem cronológica">
                    <option value="desc">Mais recentes</option>
                    <option value="asc">Mais antigos</option>
                  </select></label
                >
              </div>
              <EventTimeline
                :events="timelineEvents"
                :selected="selected"
                :basis="basis"
                :loading="loading"
                @select="choose"
              />
            </div>
            <div class="map-section">
              <ClientOnly
                ><LazyConflictMap
                  :events="events"
                  :selected="selected"
                  :heatmap="heatmap"
                  @country="
                    country = $event;
                    pair = '';
                    mobileMap = false;
                  "
                  @select="choose"
                  @viewport="mapBounds = $event"
                /><template #fallback
                  ><div class="map-skeleton">
                    <Globe2 :size="32" /><span>Preparando mapa global…</span>
                  </div></template
                ></ClientOnly
              >
              <div class="map-topline">
                <span
                  ><Globe2 :size="13" />MAPA GLOBAL ·
                  {{ events.length }} ACONTECIMENTOS</span
                >
                <button
                  class="area-filter"
                  :class="{ toggled: onlyInView }"
                  :aria-pressed="onlyInView"
                  @click="onlyInView = !onlyInView"
                >
                  <Crosshair :size="13" />{{
                    onlyInView
                      ? `${timelineEvents.length} relatos nesta área`
                      : "Filtrar pela área visível"
                  }}</button
                ><button
                  :disabled="referenceOnly"
                  title="Densidade de coordenadas extraídas; referências nacionais ficam nas áreas"
                  :class="{ toggled: heatmap }"
                  :aria-pressed="heatmap"
                  @click="heatmap = !heatmap"
                >
                  <Layers :size="13" /> Densidade
                </button>
              </div>
              <div class="map-coordinate">
                {{ cutoff ? `ATÉ ${cutoff}` : "SEM RECORTE" }}
                <span>•</span> WGS 84
              </div>
              <div class="map-reading-note">
                Áreas azuis: países citados · contadores: acontecimentos ·
                pontos: coordenadas extraídas, sem confirmação de ataque ·
                contagens por país não são somáveis · dourado: economia
              </div>
              <div class="map-legend">
                <span><i class="armed" />Confronto</span
                ><span><i class="diplomacy" />Diplomacia</span
                ><span><i class="tension" />Tensão</span
                ><span><i class="violence" />Violência</span
                ><span class="economy-legend"><b>$</b>Economia</span>
              </div>
              <section
                v-if="active"
                class="event-detail"
                aria-label="Detalhes do relato"
              >
                <div class="detail-top">
                  <span class="event-category" :class="active.kind">{{
                    kindLabels[active.kind]
                  }}</span
                  ><button
                    class="icon-button"
                    aria-label="Fechar detalhes"
                    @click="selected = null"
                  >
                    <X :size="17" />
                  </button>
                </div>
                <div v-if="active.countries.length" class="country-relation">
                  <small class="affiliation-label">{{
                    active.countryBasis === "headline"
                      ? "Países citados na manchete"
                      : "Afiliações dos atores indexados"
                  }}</small>
                  <template
                    v-for="(country, index) in active.countries"
                    :key="country.code"
                    ><span v-if="index" class="relation-link">·</span
                    ><span>{{ country.name }}</span></template
                  >
                </div>
                <h2>{{ active.title }}</h2>
                <p v-if="!active.demo" class="classification-note">
                  Manchete indexada da fonte · classificação automática
                  apresentada separadamente.
                  <span v-if="active.dateBasis === 'indexed'"
                    >Publicação não informada; a data indica indexação, não o
                    momento do fato.</span
                  >
                </p>
                <a
                  v-if="!active.demo"
                  :href="active.sourceUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  >Ler fonte original <ExternalLink :size="14"
                /></a>
                <OccurrenceContext :event="active" />
                <section
                  v-if="active.selection"
                  class="selection-context"
                  aria-label="Por que este relato entrou"
                >
                  <strong>{{
                    active.selection.basis === "context"
                      ? "Contexto de conflito identificado"
                      : "Contexto temático indisponível"
                  }}</strong>
                  <p v-for="reason in active.selection.reasons" :key="reason">
                    {{ reason }}
                  </p>
                  <small
                    >Triagem automática · não é verificação editorial.</small
                  >
                </section>
                <section
                  v-if="active.economy"
                  class="economic-context"
                  aria-label="Contexto econômico"
                >
                  <span class="economy-badge"
                    ><Landmark :size="13" />{{
                      economicSectors[active.economy.sector]
                    }}
                    ·
                    {{
                      economicStageLabels[
                        active.economy.stage ??
                          (active.economy.status === "potential"
                            ? "risk"
                            : "measure")
                      ]
                    }}</span
                  >
                  <h3>{{ active.economy.label }}</h3>
                  <p>{{ active.economy.context }}</p>
                  <blockquote
                    v-if="active.economy.evidence"
                    class="economic-evidence"
                  >
                    {{ active.economy.evidence }}
                  </blockquote>
                  <small
                    >{{
                      active.demo
                        ? "Cenário ilustrativo."
                        : "Classificação automática da fonte abaixo."
                    }}
                    O vínculo causal com o conflito requer leitura da
                    fonte.</small
                  >
                </section>
                <p>
                  {{
                    active.sourceType === "article"
                      ? "Países extraídos da manchete. A notícia não recebe atribuição automática de agressor ou alvo."
                      : active.demo
                        ? "Acontecimento ilustrativo, sem validade factual."
                        : active.actors.length
                          ? active.actors.join(" · ")
                          : "Atores não identificados no registro."
                  }}
                </p>
                <dl>
                  <div>
                    <dt>
                      {{
                        active.dateBasis === "publication"
                          ? "Publicação da fonte"
                          : active.dateBasis === "indexed"
                            ? "Indexação da notícia"
                            : "Data atribuída ao fato"
                      }}
                    </dt>
                    <dd>{{ formatDate(active.eventDate) }}</dd>
                  </div>
                  <div>
                    <dt>Entrada no feed</dt>
                    <dd>{{ formatDate(active.reportedAt, true) }}</dd>
                  </div>
                  <div>
                    <dt>Referência geográfica no texto</dt>
                    <dd>
                      {{ active.location
                      }}<small v-if="active.locationPrecision === 'country'"
                        >Somente referência ao país; não localiza o
                        confronto.</small
                      >
                    </dd>
                  </div>
                  <div>
                    <dt>
                      {{
                        active.sourceType === "article"
                          ? "Origem da classificação"
                          : "Classificação CAMEO"
                      }}
                    </dt>
                    <dd>
                      {{
                        active.sourceType === "article"
                          ? "Manchete e temas do mesmo artigo"
                          : active.actionCode
                      }}
                    </dd>
                  </div>
                  <div>
                    <dt>Revisão editorial</dt>
                    <dd>
                      {{ active.demo ? "Demonstração" : "Não realizada" }}
                    </dd>
                  </div>
                </dl>
                <div
                  v-if="active.participants?.length"
                  class="participant-list"
                >
                  <strong>Atores indexados na fonte</strong>
                  <p v-for="(actor, index) in active.participants" :key="index">
                    {{ actor.name }}
                    <small
                      >{{ actor.country?.name ?? "País não identificado" }} ·
                      {{
                        actor.roles.length
                          ? actor.roles.map(roleLabel).join(", ")
                          : "Sem papel identificado"
                      }}</small
                    >
                  </p>
                </div>
                <small
                  >Menções e afiliações nacionais não identificam agressores ou
                  alvos. Ponto de referência geográfica.</small
                >
              </section>
            </div>
          </div>
          <section
            class="time-explorer"
            :class="{ 'show-time-inputs': showFilters }"
            aria-label="Explorar a linha do tempo"
          >
            <div class="time-explorer-top">
              <div class="time-context">
                <History :size="16" /><strong>{{
                  atPresent
                    ? "Período completo"
                    : `Até ${cutoff ? shortDay(cutoff) : "—"}`
                }}</strong
                ><span>{{
                  basis === "event"
                    ? "Data da notícia ou relato"
                    : "Data de entrada no feed"
                }}</span>
              </div>
              <div class="time-inputs">
                <label
                  >De<input
                    v-model="from"
                    type="date"
                    aria-label="Data inicial" /></label
                ><label
                  >Até<input
                    v-model="to"
                    type="date"
                    aria-label="Data final" /></label
                ><label class="time-basis"
                  >Ordenar por<select
                    v-model="basis"
                    aria-label="Base temporal"
                  >
                    <option value="event">Data da notícia / relato</option>
                    <option value="collected">Entrada no feed</option>
                  </select></label
                >
              </div>
            </div>
            <div v-if="days.length" class="time-playback">
              <button
                class="playback-play"
                :aria-label="
                  playing
                    ? 'Pausar reprodução temporal'
                    : 'Reproduzir linha do tempo'
                "
                :aria-pressed="playing"
                @click="toggleReplay"
              >
                <Pause v-if="playing" :size="18" /><Play v-else :size="18" />
              </button>
              <div class="time-axis">
                <div class="time-bars" aria-hidden="true">
                  <span
                    v-for="(day, index) in days"
                    :key="day"
                    :class="{
                      reached: index <= cursor,
                      current: index === cursor,
                      uncovered:
                        !isDemo &&
                        !feed?.coverage?.contextBatchDates?.some(
                          (batch) => batch.slice(0, 10) === day,
                        ),
                    }"
                    :title="`${day}: ${dailyCounts.get(day) ?? 0} relatos`"
                    ><i
                      :style="{
                        height: `${((dailyCounts.get(day) ?? 0) / maxCount) * 100}%`,
                      }"
                  /></span>
                </div>
                <input
                  v-model.number="cursor"
                  type="range"
                  min="0"
                  :max="days.length - 1"
                  step="1"
                  aria-label="Navegar por dia na linha do tempo"
                  :aria-valuetext="`Até ${cutoff}`"
                  @input="playing = false"
                />
                <div class="time-axis-labels">
                  <span>{{ shortDay(from) }}</span
                  ><span
                    >{{ cutoff ? shortDay(cutoff) : "" }} · {{ events.length }}
                    {{
                      events.length === 1 ? "acontecimento" : "acontecimentos"
                    }}
                    até esta data</span
                  ><span>{{ shortDay(to) }}</span>
                </div>
              </div>
              <div class="playback-step">
                <button
                  aria-label="Dia anterior"
                  :disabled="cursor <= 0"
                  @click="
                    cursor--;
                    playing = false;
                  "
                >
                  <ChevronLeft :size="16" /></button
                ><button
                  aria-label="Próximo dia"
                  :disabled="atPresent"
                  @click="
                    cursor++;
                    playing = false;
                  "
                >
                  <ChevronRight :size="16" />
                </button>
              </div>
              <button class="text-button time-reset" @click="resetCursor">
                Ver período inteiro
              </button>
            </div>
            <p v-else class="time-range-error" role="alert">
              Selecione um período válido de até 90 dias, com a data inicial
              anterior à final.
            </p>
            <p class="coverage-note">
              <Info :size="12" /><span v-if="isDemo"
                >Simulação explícita · datas e acontecimentos ilustrativos de
                abril de 2024.</span
              ><span v-else-if="feed?.coverage"
                >{{ feed.coverage.batches }}
                {{
                  feed.coverage.batches === 1
                    ? "lote acumulado"
                    : "lotes acumulados"
                }}
                desde {{ formatDate(feed.coverage.firstCollectedAt, true) }} ·
                retenção de até {{ feed.coverage.retentionDays }} dias / 15 mil
                registros. Dias vazios podem refletir lacunas de coleta. Barras
                listradas indicam dias sem lotes de contexto registrados.
                <template v-if="feed.coverage.persistence === 'ephemeral'">
                  Histórico temporário por instância; pode reiniciar na
                  Vercel.</template
                ></span
              ><span v-else
                >Aguardando cobertura da primeira coleta. O histórico não é
                retroativo.</span
              >
            </p>
          </section>

          <div class="timeline-bar">
            <div>
              <span class="timeline-dot" /><strong>{{
                isDemo ? "SIMULAÇÃO" : "HISTÓRICO DAS COLETAS"
              }}</strong
              ><span class="timeline-caption"
                >Mapa e relatos acompanham o cursor temporal</span
              >
            </div>
            <div>
              <button
                :aria-pressed="paused"
                :aria-label="
                  paused
                    ? 'Retomar atualização automática'
                    : 'Pausar atualização automática'
                "
                @click="paused = !paused"
              >
                <Play v-if="paused" :size="13" /><Pause v-else :size="13" />{{
                  paused ? "Pausado" : "Auto"
                }}</button
              ><button :disabled="loading" @click="refresh()">
                <RefreshCw :size="13" :class="{ spinning: loading }" />Atualizar
              </button>
            </div>
          </div>
        </section>
        <footer class="page-footer">
          <span
            ><ShieldCheck :size="13" /> Relatos automáticos, com fonte e
            contexto. Não são fatos confirmados.</span
          ><button @click="showAbout = true">
            Fontes e metodologia <ArrowUpRight :size="12" />
          </button>
        </footer>
        <button class="mobile-feed-toggle" @click="mobileMap = !mobileMap">
          <History v-if="mobileMap" :size="16" /><MapIcon v-else :size="16" />{{
            mobileMap ? "Ver linha do tempo" : "Ver mapa do período"
          }}
        </button>
      </main>
    </div>
    <dialog
      ref="aboutPanel"
      class="about-modal native-methodology"
      aria-labelledby="about-title"
      @close="showAbout = false"
    >
      <button
        class="modal-close icon-button"
        aria-label="Fechar metodologia"
        @click="showAbout = false"
      >
        <X :size="20" />
      </button>
      <div class="eyebrow">FONTES E METODOLOGIA</div>
      <h2 id="about-title">Confronto e diálogo,<br />com contexto temporal.</h2>
      <p>
        Selecionamos manchetes de notícias com temas específicos no GKG. Os
        países citados na manchete são identificados por nomes e sinônimos
        explícitos; a posição é uma referência de país do próprio GKG, não o
        local exato do fato. Quando há uma extração de ação, também exigimos
        papéis e países coerentes com a manchete. Diplomacia rotineira, crimes
        comuns sem sinais de conflito e códigos genéricos não entram apenas por
        citar dois países. Sem manchete e contexto temático, novos relatos ficam
        fora da seleção. A triagem pode perder relatos relevantes e ainda conter
        erros; não é revisão editorial.
      </p>
      <h3>Países e relações</h3>
      <p>
        Nas notícias, países são menções na manchete; nas extrações de ação, são
        afiliações indexadas dos atores. O recorte bilateral exige dois países
        reconhecidos. Menção ou afiliação não prova envolvimento de governos ou
        guerra declarada. Cidades, capitais, nacionalidades e códigos nacionais
        isolados não comprovam ação estatal. O filtro estatal exige papel
        explícito de governo ou forças armadas. O padrão inclui conflitos
        internos e grupos armados.
      </p>
      <h3>Como ler a linha do tempo</h3>
      <p>
        Nas notícias, a data é a publicação quando informada; caso contrário, é
        a indexação, identificada explicitamente. Nas extrações, é a data
        atribuída ao fato, com precisão diária. A entrada no feed tem horário
        UTC e pode ocorrer depois. Troque a base temporal para investigar essa
        diferença. O cursor mostra os relatos entre o início do período e o dia
        selecionado; a reprodução avança por dia e não mostra movimentos
        militares.
      </p>
      <h3>Cobertura e limitações</h3>
      <p>
        Sem banco, a coleta é sob demanda e o histórico é temporário na Vercel.
        Com repositório persistente, o mapa lê um snapshot e a coleta é
        executada separadamente, com retenção de até 30 dias. O agendamento
        precisa ser ativado na hospedagem escolhida; configurar o banco sozinho
        não o ativa. O histórico começa na primeira coleta e não é completo ou
        retroativo. Datas vazias não provam ausência de acontecimentos.
      </p>
      <p>
        Fontes, coordenadas e categorias podem conter erros. Agrupamos URLs de
        acompanhamento e manchetes equivalentes, preservando as publicações de
        origem. Isso não comprova independência editorial ou que matérias com
        títulos diferentes descrevam fatos distintos. O modo demonstração contém
        apenas cenários ilustrativos.
      </p>
      <div class="about-links">
        <a
          href="https://data.gdeltproject.org/documentation/GDELT-Event_Codebook-V2.0.pdf"
          target="_blank"
          rel="noopener noreferrer"
          >Dicionário GDELT <ExternalLink :size="14" /></a
        ><button
          class="filter-button"
          @click="
            demo = !demo;
            showAbout = false;
          "
        >
          {{ isDemo ? "Consultar feed real" : "Explorar demonstração"
          }}<ArrowRight :size="14" />
        </button>
      </div>
    </dialog>
  </div>
</template>
