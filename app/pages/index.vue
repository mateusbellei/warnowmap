<script setup lang="ts">
import {
  Globe2,
  Radio,
  Search,
  SlidersHorizontal,
  ArrowUpRight,
  ChevronDown,
  Crosshair,
  ShieldCheck,
  X,
  RefreshCw,
  ExternalLink,
  Radar,
  Map,
  Info,
  Clock3,
  ArrowRight,
  Pause,
  Play,
  Activity,
  PanelRightClose,
  PanelRightOpen,
  Check,
  Menu,
  Layers,
} from "@lucide/vue";
import {
  regions,
  kindLabels,
  type EventKind,
  type EventFeed,
  type Region,
} from "#shared/types/conflict";
import { filterEvents } from "#shared/utils/events";

const route = useRoute();
const router = useRouter();
const demo = ref(route.query.demo === "true");
const search = ref(
  typeof route.query.q === "string" ? route.query.q.slice(0, 200) : "",
);
const region = ref<Region>(
  regions.includes(route.query.region as Region)
    ? (route.query.region as Region)
    : "Todas as regiões",
);
const kinds = ref<EventKind[]>(["armed", "violence", "tension"]);
const hours = ref(24);
const militaryOnly = ref(true);
const visibleCount = ref(60);
const heatmap = ref(false);
const paused = ref(false);
const showFilters = ref(false);
const showAbout = ref(false);
const sidebar = ref(true);
const mobileFeed = ref(false);
const selected = ref<string | null>(null);
const aboutPanel = ref<HTMLElement>();
let previousFocus: HTMLElement | null = null;
const now = ref(Date.now());
const {
  data: feed,
  status,
  error,
  refresh,
} = await useFetch<EventFeed>("/api/events", {
  query: { demo },
  timeout: 65000,
  lazy: true,
});
const events = computed(() =>
  filterEvents(feed.value?.events ?? [], {
    search: search.value,
    region: region.value,
    kinds: kinds.value,
    hours: hours.value,
    now: now.value,
    militaryOnly: militaryOnly.value,
  }),
);
const active = computed(() =>
  events.value.find((event) => event.id === selected.value),
);
const listEvents = computed(() => events.value.slice(0, visibleCount.value));
watch([search, region, kinds, hours, militaryOnly], () => {
  visibleCount.value = 60;
});
const counts = computed(() => ({
  armed: events.value.filter((e) => e.kind === "armed").length,
  violence: events.value.filter((e) => e.kind === "violence").length,
  tension: events.value.filter((e) => e.kind === "tension").length,
}));
const sourceCount = computed(
  () => new Set(events.value.filter((e) => !e.demo).map((e) => e.source)).size,
);
const regionCount = computed(
  () => new Set(events.value.map((e) => e.region)).size,
);
const modeLabel = computed(
  () =>
    ({
      live: "Feed conectado",
      stale: "Dados desatualizados",
      demo: "Demonstração",
      unavailable: "Feed indisponível",
    })[feed.value?.mode ?? "unavailable"],
);
const isDemo = computed(() => feed.value?.mode === "demo");
const lastUpdate = computed(() =>
  feed.value?.datasetAt
    ? formatDate(feed.value.datasetAt)
    : "Sem coleta ao vivo",
);
function formatDate(date: string) {
  return (
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: "UTC",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date)) + " UTC"
  );
}
function eventTime(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}
function toggleKind(kind: EventKind) {
  kinds.value = kinds.value.includes(kind)
    ? kinds.value.filter((k) => k !== kind)
    : [...kinds.value, kind];
}
function clearFilters() {
  search.value = "";
  region.value = "Todas as regiões";
  kinds.value = ["armed", "violence", "tension"];
  hours.value = 24;
  militaryOnly.value = true;
}
function choose(id: string) {
  selected.value = selected.value === id ? null : id;
  mobileFeed.value = false;
}
function closeOverlays(event: KeyboardEvent) {
  if (event.key === "Escape") {
    showAbout.value = false;
    showFilters.value = false;
    selected.value = null;
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
  if (event.key === "Tab" && showAbout.value) {
    const controls =
      aboutPanel.value?.querySelectorAll<HTMLElement>("button,a[href]");
    if (!controls?.length) return;
    const first = controls[0]!;
    const last = controls[controls.length - 1]!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
watch(showAbout, async (open) => {
  if (open) {
    previousFocus = document.activeElement as HTMLElement;
    await nextTick();
    aboutPanel.value?.querySelector<HTMLButtonElement>("button")?.focus();
  } else previousFocus?.focus();
});
watch(events, (value) => {
  if (selected.value && !value.some((event) => event.id === selected.value))
    selected.value = null;
});
watch([search, region, demo], () => {
  router.replace({
    query: {
      ...route.query,
      q: search.value || undefined,
      region: region.value === "Todas as regiões" ? undefined : region.value,
      demo: demo.value ? "true" : undefined,
    },
  });
});
let timer: ReturnType<typeof setInterval>;
onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now();
    if (
      !paused.value &&
      !isDemo.value &&
      !document.hidden &&
      status.value !== "pending"
    )
      refresh();
  }, 60000);
  document.addEventListener("keydown", closeOverlays);
});
onBeforeUnmount(() => {
  clearInterval(timer);
  document.removeEventListener("keydown", closeOverlays);
});
</script>

<template>
  <div class="app-shell">
    <a href="#main-content" class="skip-link">Pular para o conteúdo</a>
    <aside
      :inert="showAbout"
      class="navigation-rail"
      aria-label="Navegação principal"
    >
      <a class="rail-brand" href="/" aria-label="WarNow início"
        ><img src="/brand.svg" alt="" width="36" height="36"
      /></a>
      <button
        class="rail-button current"
        title="Mapa global"
        aria-label="Mapa global"
        @click="mobileFeed = false"
      >
        <Globe2 :size="21" />
      </button>
      <button
        class="rail-button"
        title="Relatos"
        aria-label="Abrir relatos"
        @click="
          sidebar = true;
          mobileFeed = true;
        "
      >
        <Radio :size="21" />
      </button>
      <button
        class="rail-button"
        title="Filtros"
        aria-label="Abrir filtros"
        @click="showFilters = !showFilters"
      >
        <SlidersHorizontal :size="20" />
      </button>
      <div class="rail-bottom">
        <button
          class="rail-button"
          title="Sobre os dados"
          aria-label="Sobre os dados"
          @click="showAbout = true"
        >
          <Info :size="20" /></button
        ><span class="rail-version">W/N</span>
      </div>
    </aside>

    <div :inert="showAbout" class="workspace">
      <header class="topbar">
        <a href="/" class="wordmark"
          >war<span>now</span><span class="wordmark-dot">●</span
          ><small>GLOBAL CONFLICT MONITOR</small></a
        >
        <nav class="header-nav" aria-label="Visualizações">
          <button class="active" @click="mobileFeed = false">
            <Map :size="15" /> Mapa global</button
          ><button @click="showAbout = true">
            Fontes e metodologia <ArrowUpRight :size="14" />
          </button>
        </nav>
        <div class="topbar-right">
          <span class="connection" :class="feed?.mode"
            ><i />{{
              status === "pending" ? "Consultando feed" : modeLabel
            }}</span
          ><button
            class="icon-button mobile-menu"
            aria-label="Alternar relatos"
            @click="mobileFeed = !mobileFeed"
          >
            <Menu :size="20" />
          </button>
        </div>
      </header>

      <main id="main-content" class="main-content">
        <section class="page-heading">
          <div>
            <div class="eyebrow"><span /> OBSERVATÓRIO GLOBAL</div>
            <h1>O mundo, em perspectiva.</h1>
            <p>Acompanhe relatos de conflitos e tensões em um só mapa.</p>
          </div>
          <div class="heading-meta">
            <span><Clock3 :size="14" /> ÚLTIMO LOTE</span
            ><strong>{{ lastUpdate }}</strong
            ><button @click="showAbout = true">
              Entenda a cobertura <ArrowUpRight :size="13" />
            </button>
          </div>
        </section>

        <section class="stats-grid" aria-label="Resumo dos relatos filtrados">
          <article>
            <div class="stat-icon coral"><Crosshair :size="19" /></div>
            <div>
              <span>{{ isDemo ? "Cenários no mapa" : "Relatos no mapa" }}</span
              ><strong
                >{{ events.length.toString().padStart(2, "0")
                }}<small>{{
                  isDemo ? "ilustrativos" : "último lote"
                }}</small></strong
              >
            </div>
            <Activity class="stat-decoration" :size="50" />
          </article>
          <article>
            <div class="stat-icon amber"><Radar :size="20" /></div>
            <div>
              <span>Confrontos armados</span
              ><strong
                >{{ counts.armed.toString().padStart(2, "0")
                }}<small>relatos classificados</small></strong
              >
            </div>
          </article>
          <article>
            <div class="stat-icon blue"><Globe2 :size="20" /></div>
            <div>
              <span>Regiões com relatos</span
              ><strong
                >{{ regionCount.toString().padStart(2, "0")
                }}<small>neste recorte</small></strong
              >
            </div>
          </article>
          <article>
            <div class="stat-icon green"><Radio :size="20" /></div>
            <div>
              <span>Fontes de notícias</span
              ><strong
                >{{ sourceCount.toString().padStart(2, "0")
                }}<small>{{
                  isDemo ? "modo demonstração" : "domínios distintos"
                }}</small></strong
              >
            </div>
          </article>
        </section>

        <section class="monitor" aria-label="Monitor de conflitos">
          <div class="monitor-toolbar">
            <div class="view-title">
              <span class="live-dot" /><strong>Visão global</strong
              ><span class="toolbar-divider" /><span class="muted"
                >{{ events.length }} {{ isDemo ? "cenários" : "relatos" }}</span
              >
            </div>
            <div class="toolbar-actions">
              <label class="search-field"
                ><Search :size="16" /><input
                  v-model="search"
                  type="search"
                  placeholder="Buscar local ou ator…"
                  aria-label="Buscar local ou ator"
                  maxlength="200"
                /><kbd>/</kbd></label
              ><button
                class="filter-button"
                :class="{ toggled: showFilters }"
                :aria-expanded="showFilters"
                @click="showFilters = !showFilters"
              >
                <SlidersHorizontal :size="15" /><span>Filtros</span></button
              ><button
                class="icon-button panel-toggle"
                :aria-label="sidebar ? 'Ocultar lista' : 'Mostrar lista'"
                @click="sidebar = !sidebar"
              >
                <PanelRightClose v-if="sidebar" :size="19" /><PanelRightOpen
                  v-else
                  :size="19"
                />
              </button>
            </div>
          </div>

          <div v-if="showFilters" class="filter-panel">
            <label
              >Região<select v-model="region">
                <option v-for="item in regions" :key="item">{{ item }}</option>
              </select></label
            >
            <label
              >Coleta nas últimas<select v-model.number="hours">
                <option :value="1">1 hora</option>
                <option :value="6">6 horas</option>
                <option :value="24">24 horas</option>
              </select></label
            >
            <div class="kind-filters">
              <button
                v-for="(label, kind) in kindLabels"
                :key="kind"
                :class="{ toggled: kinds.includes(kind) }"
                :aria-pressed="kinds.includes(kind)"
                @click="toggleKind(kind)"
              >
                <Check v-if="kinds.includes(kind)" :size="13" />{{ label }}
              </button>
            </div>
            <label class="military-filter"
              ><input v-model="militaryOnly" type="checkbox" /> Priorizar atores
              armados
              <small
                >Filtro automático MIL / REB / INS / SEP / UAF</small
              ></label
            >
            <button class="text-button" @click="clearFilters">
              Limpar filtros
            </button>
          </div>

          <div
            class="monitor-body"
            :class="{
              'without-sidebar': !sidebar,
              'mobile-feed-open': mobileFeed,
            }"
          >
            <div class="map-section">
              <ClientOnly
                ><ConflictMap
                  :events="events"
                  :selected="selected"
                  :heatmap="heatmap"
                  @select="choose"
                /><template #fallback
                  ><div class="map-skeleton">
                    <Globe2 :size="32" /><span>Preparando mapa global…</span>
                  </div></template
                ></ClientOnly
              >
              <div class="map-topline">
                <span
                  ><Globe2 :size="13" />
                  {{
                    region === "Todas as regiões"
                      ? "MUNDO"
                      : region.toUpperCase()
                  }}<ChevronDown :size="12" /></span
                ><button
                  :class="{ toggled: heatmap }"
                  :aria-pressed="heatmap"
                  @click="heatmap = !heatmap"
                >
                  <Layers :size="13" /> Densidade de relatos
                </button>
              </div>
              <div
                v-if="feed?.mode !== 'live' || error"
                class="map-status"
                :class="{ demo: isDemo }"
              >
                <Info :size="15" /><span>{{
                  error
                    ? "Falha na conexão com o servidor. Tente atualizar."
                    : feed?.message || "Consultando a fonte de dados…"
                }}</span
                ><button
                  v-if="!isDemo && status !== 'pending'"
                  @click="demo = true"
                >
                  Explorar demo <ArrowRight :size="13" /></button
                ><button v-if="isDemo" @click="demo = false">
                  Consultar feed <ArrowRight :size="13" />
                </button>
              </div>
              <div class="map-coordinate">
                GLOBAL VIEW <span>•</span> WGS 84
              </div>
              <div class="map-legend">
                <span><i class="armed" />Confronto armado</span
                ><span><i class="violence" />Violência</span
                ><span><i class="tension" />Coerção / tensão</span
                ><span class="legend-note">Localizações aproximadas</span>
              </div>
              <div
                v-if="active"
                class="event-detail"
                role="region"
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
                <h2>{{ active.title }}</h2>
                <p>
                  {{
                    active.actors.length
                      ? active.actors.join(" · ")
                      : "Cenário ilustrativo para explorar os recursos do mapa."
                  }}
                </p>
                <dl>
                  <div>
                    <dt>Data do evento</dt>
                    <dd>{{ active.eventDate }}</dd>
                  </div>
                  <div>
                    <dt>Entrada no feed</dt>
                    <dd>{{ formatDate(active.reportedAt) }}</dd>
                  </div>
                  <div>
                    <dt>Verificação</dt>
                    <dd>
                      {{
                        active.demo ? "Demonstração" : "Sem revisão editorial"
                      }}
                    </dd>
                  </div>
                </dl>
                <a
                  v-if="!active.demo"
                  :href="active.sourceUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  >Ler fonte original <ExternalLink :size="14" /></a
                ><small
                  >A classificação automática e as coordenadas podem conter
                  erros.</small
                >
              </div>
            </div>

            <aside
              v-if="sidebar"
              class="feed-panel"
              aria-label="Lista de relatos"
            >
              <div class="feed-heading">
                <div>
                  <Radio :size="17" />
                  <h2>
                    {{ isDemo ? "Cenários ilustrativos" : "Últimos relatos" }}
                  </h2>
                </div>
                <span>{{ events.length }}</span>
              </div>
              <div class="feed-subheading">
                <span>{{
                  isDemo
                    ? "Explore o modo demonstração"
                    : "Ordenados por entrada no feed"
                }}</span
                ><button
                  :disabled="status === 'pending'"
                  title="Atualizar relatos"
                  aria-label="Atualizar relatos"
                  @click="refresh()"
                >
                  <RefreshCw
                    :size="13"
                    :class="{ spinning: status === 'pending' }"
                  />
                </button>
              </div>
              <div
                class="events-list"
                aria-live="polite"
                :aria-busy="status === 'pending'"
              >
                <div v-if="status === 'pending' && !feed" class="empty-state">
                  <Radar class="spinning" :size="30" /><strong
                    >Consultando o mundo</strong
                  >
                  <p>Carregando o último lote de relatos.</p>
                </div>
                <template v-else-if="events.length"
                  ><button
                    v-for="event in listEvents"
                    :key="event.id"
                    class="event-card"
                    :class="{ selected: selected === event.id }"
                    :aria-pressed="selected === event.id"
                    @click="choose(event.id)"
                  >
                    <div class="event-meta">
                      <span class="event-category" :class="event.kind"
                        ><i />{{ kindLabels[event.kind] }}</span
                      ><time :datetime="event.reportedAt">{{
                        event.demo ? "DEMO" : eventTime(event.reportedAt)
                      }}</time>
                    </div>
                    <h3>{{ event.title }}</h3>
                    <p>
                      {{
                        event.actors.length
                          ? event.actors.join(" · ")
                          : "Exemplo de visualização, sem validade factual."
                      }}
                    </p>
                    <div class="event-footer">
                      <span><span class="source-dot" />{{ event.source }}</span
                      ><ArrowUpRight :size="14" />
                    </div></button
                ></template>
                <div v-else class="empty-state">
                  <Search :size="29" /><strong>{{
                    feed?.mode === "unavailable" || error
                      ? "Fonte indisponível"
                      : "Nenhum relato neste recorte"
                  }}</strong>
                  <p>
                    {{
                      feed?.mode === "unavailable" || error
                        ? "Tente uma nova coleta ou conheça a interface no modo demonstração."
                        : "A ausência de relatos neste lote não significa ausência de conflitos."
                    }}
                  </p>
                  <button
                    class="filter-button"
                    @click="
                      feed?.mode === 'unavailable' || error
                        ? (demo = true)
                        : clearFilters()
                    "
                  >
                    {{
                      feed?.mode === "unavailable" || error
                        ? "Explorar demonstração"
                        : "Limpar filtros"
                    }}
                  </button>
                </div>
                <button
                  v-if="events.length > visibleCount"
                  class="load-more filter-button"
                  @click="visibleCount += 60"
                >
                  Mostrar mais relatos ({{ events.length - visibleCount }})
                </button>
              </div>
              <button class="feed-methodology" @click="showAbout = true">
                <ShieldCheck :size="16" /><span
                  >Transparência em cada relato<small
                    >Conheça as fontes e limitações</small
                  ></span
                ><ArrowUpRight :size="15" />
              </button>
            </aside>
          </div>

          <div class="timeline-bar">
            <div>
              <span class="timeline-dot" /><strong>{{
                isDemo ? "MODO DEMONSTRAÇÃO" : "ÚLTIMO LOTE DISPONÍVEL"
              }}</strong
              ><span class="timeline-caption">{{
                isDemo
                  ? "Cenários ilustrativos · sem dados ao vivo"
                  : "GDELT publica lotes a cada 15 minutos"
              }}</span>
            </div>
            <div>
              <button
                :aria-label="
                  paused
                    ? 'Retomar atualização automática'
                    : 'Pausar atualização automática'
                "
                :aria-pressed="paused"
                @click="paused = !paused"
              >
                <Play v-if="paused" :size="13" /><Pause v-else :size="13" />{{
                  paused ? "Pausado" : "Auto"
                }}</button
              ><button :disabled="status === 'pending'" @click="refresh()">
                <RefreshCw
                  :size="13"
                  :class="{ spinning: status === 'pending' }"
                />Atualizar
              </button>
            </div>
          </div>
        </section>
        <footer class="page-footer">
          <span
            ><ShieldCheck :size="13" /> Informação com contexto. Relatos não
            equivalem a fatos verificados.</span
          ><button @click="showAbout = true">
            Sobre o WarNow <ArrowUpRight :size="12" />
          </button>
        </footer>
        <button
          class="mobile-feed-toggle"
          @click="
            mobileFeed = !mobileFeed;
            sidebar = true;
          "
        >
          <Map v-if="mobileFeed" :size="16" /><Radio v-else :size="16" />{{
            mobileFeed ? "Ver mapa" : `Ver ${events.length} relatos`
          }}
        </button>
      </main>
    </div>

    <div
      v-if="showAbout"
      class="modal-backdrop"
      @click.self="showAbout = false"
    >
      <section
        ref="aboutPanel"
        class="about-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
      >
        <button
          class="modal-close icon-button"
          aria-label="Fechar metodologia"
          autofocus
          @click="showAbout = false"
        >
          <X :size="20" />
        </button>
        <div class="eyebrow">FONTES E METODOLOGIA</div>
        <h2 id="about-title">
          Um mapa para investigar.<br />Uma fonte para cada relato.
        </h2>
        <p>
          O WarNow mostra eventos classificados automaticamente pelo
          <a
            href="https://www.gdeltproject.org/"
            target="_blank"
            rel="noopener noreferrer"
            >GDELT 2.0</a
          >, extraídos de notícias públicas. Cada ponto leva à publicação
          original.
        </p>
        <h3>Como o feed funciona</h3>
        <p>
          Consultamos o último arquivo global de eventos a cada minuto, com
          cache de cinco minutos no servidor. O GDELT publica um lote a cada 15
          minutos. Por padrão, priorizamos atores armados identificados pelo
          GDELT (MIL, REB, INS, SEP e UAF) e relatos de violência em massa. Você
          pode ampliar o recorte nos filtros. Agrupamos extrações do mesmo
          artigo, local, tipo e data. Exibimos códigos CAMEO 17 a 20: coerção,
          violência, confronto e violência em massa. Não são alertas
          instantâneos, contagem de guerras ou cobertura completa das últimas 24
          horas.
        </p>
        <h3>O que o mapa pode afirmar</h3>
        <p>
          As coordenadas são os locais citados nas notícias, com precisão
          variável. A classificação, os atores e a data do evento podem estar
          incorretos. As regiões são agrupamentos geográficos aproximados.
          Relatos podem se referir ao mesmo fato; o número de pontos não mede
          intensidade ou vítimas. Não desenhamos territórios controlados sem uma
          fonte validada.
        </p>
        <h3>Atualidade e demonstração</h3>
        <p>
          Um lote com mais de uma hora é sinalizado como desatualizado. Em
          falhas, mostramos a última coleta com aviso. O modo demonstração usa
          apenas cenários ilustrativos datados de 2024, sem representar notícias
          ou a situação atual.
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
      </section>
    </div>
  </div>
</template>
