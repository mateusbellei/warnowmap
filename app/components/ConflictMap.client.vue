<script setup lang="ts">
import {
  Map as WorldMap,
  Popup,
  LngLatBounds,
  setWorkerUrl,
  type GeoJSONSource,
} from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import { Plus, Minus, LocateFixed, Layers, RotateCcw, Scan } from "@lucide/vue";
import {
  kindLabels,
  type ConflictEvent,
  type EventKind,
} from "#shared/types/conflict";
import type { MapBounds } from "#shared/utils/map";
import { eventIcon, clusterRing } from "~/utils/map-icons";
import { countryReferences } from "#shared/utils/map";
import type { FeatureCollection, Geometry } from "geojson";

const props = defineProps<{
  events: ConflictEvent[];
  selected: string | null;
  heatmap: boolean;
}>();
const emit = defineEmits<{
  select: [id: string];
  viewport: [bounds: MapBounds];
  country: [code: string];
}>();
const container = ref<HTMLDivElement>();
const failure = ref(false);
const light = ref(false);
let map: WorldMap | undefined;
let resize: ResizeObserver | undefined;
let popup: Popup | undefined;
const ringImages = new Set<string>();
let boundaries: FeatureCollection<
  Geometry,
  { code: string; name: string; x: number; y: number }
> = { type: "FeatureCollection", features: [] };
const referenceData = () => {
  const counts = new Map(
    countryReferences(props.events).map((item) => [item.code, item]),
  );
  return {
    type: "FeatureCollection" as const,
    features: boundaries.features.flatMap((feature) => {
      const item = counts.get(feature.properties.code);
      return item
        ? [
            {
              type: "Feature" as const,
              geometry: {
                type: "Point" as const,
                coordinates: [feature.properties.x, feature.properties.y],
              },
              properties: {
                code: item.code,
                name: item.name,
                count: item.count,
              },
            },
          ]
        : [];
    }),
  };
};
function updateReferences() {
  if (!map?.getSource("country-references")) return;
  (map.getSource("country-counts") as GeoJSONSource).setData(referenceData());
  const codes = countryReferences(props.events).map((item) => item.code);
  map.setFilter("country-area", ["in", ["get", "code"], ["literal", codes]]);
  map.setFilter("country-border", ["in", ["get", "code"], ["literal", codes]]);
  const selected = eventIndex.value.get(props.selected ?? "");
  map.setFilter("country-selection", [
    "in",
    ["get", "code"],
    [
      "literal",
      selected?.locationPrecision === "country"
        ? selected.countries.map((c) => c.code)
        : [],
    ],
  ]);
}
const eventIndex = computed(
  () => new Map(props.events.map((event) => [event.id, event])),
);
const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const geojson = () => ({
  type: "FeatureCollection" as const,
  features: props.events
    .filter((event) => event.locationPrecision !== "country")
    .map((event) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: event.coordinates },
      properties: {
        id: event.id,
        kind: event.kind,
        economic: event.economy ? 1 : 0,
      },
    })),
});
const style = () =>
  `https://tiles.openfreemap.org/styles/${light.value ? "positron" : "dark"}`;
function addLayers() {
  if (!map || map.getSource("events")) return;
  map.addSource("country-references", { type: "geojson", data: boundaries });
  map.addLayer({
    id: "country-area",
    type: "fill",
    source: "country-references",
    paint: { "fill-color": "#80adc1", "fill-opacity": 0.16 },
  });
  map.addLayer({
    id: "country-border",
    type: "line",
    source: "country-references",
    paint: { "line-color": "#80adc1", "line-width": 1.1, "line-opacity": 0.7 },
  });
  map.addLayer({
    id: "country-selection",
    type: "line",
    source: "country-references",
    paint: { "line-color": "#edcb7b", "line-width": 2.5 },
  });
  map.addSource("country-counts", { type: "geojson", data: referenceData() });
  map.addLayer({
    id: "reference-dots",
    type: "circle",
    source: "country-counts",
    paint: {
      "circle-radius": 15,
      "circle-color": "#162a35",
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "#80adc1",
    },
  });
  map.addLayer({
    id: "reference-counts",
    type: "symbol",
    source: "country-counts",
    layout: {
      "text-field": ["to-string", ["get", "count"]],
      "text-font": ["Noto Sans Regular"],
      "text-size": 12,
      "text-allow-overlap": true,
    },
    paint: { "text-color": "#e2f0f7" },
  });
  updateReferences();
  for (const kind of [
    "armed",
    "violence",
    "tension",
    "diplomacy",
  ] as EventKind[])
    if (!map.hasImage(`event-${kind}`))
      map.addImage(`event-${kind}`, eventIcon(kind), { pixelRatio: 2 });
  map.addSource("events", {
    type: "geojson",
    data: geojson(),
    cluster: true,
    clusterMaxZoom: 9,
    clusterRadius: 38,
    clusterProperties: {
      ...Object.fromEntries(
        ["armed", "violence", "tension", "diplomacy"].map((kind) => [
          kind,
          ["+", ["case", ["==", ["get", "kind"], kind], 1, 0]],
        ]),
      ),
      economic: ["+", ["get", "economic"]],
    },
  });
  map.addLayer({
    id: "heat",
    type: "heatmap",
    source: "events",
    paint: {
      "heatmap-weight": 1,
      "heatmap-radius": 38,
      "heatmap-opacity": 0.45,
      "heatmap-color": [
        "interpolate",
        ["linear"],
        ["heatmap-density"],
        0,
        "rgba(121,166,186,0)",
        0.3,
        "#355d70",
        0.7,
        "#79a6ba",
        1,
        "#c4e6de",
      ],
    },
    layout: { visibility: props.heatmap ? "visible" : "none" },
  });
  map.addLayer({
    id: "clusters",
    type: "symbol",
    source: "events",
    filter: ["has", "point_count"],
    layout: {
      "icon-image": [
        "concat",
        "cluster-",
        ["to-string", ["get", "armed"]],
        "-",
        ["to-string", ["get", "violence"]],
        "-",
        ["to-string", ["get", "tension"]],
        "-",
        ["to-string", ["get", "diplomacy"]],
        "-",
        ["to-string", ["get", "economic"]],
      ],
      "icon-size": ["step", ["get", "point_count"], 0.75, 10, 0.9, 50, 1.1],
      "icon-allow-overlap": true,
    },
  });
  map.addLayer({
    id: "cluster-count",
    type: "symbol",
    source: "events",
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-font": ["Noto Sans Regular"],
      "text-size": 12,
      "text-allow-overlap": true,
    },
    paint: { "text-color": "#ffffff" },
  });
  map.addLayer({
    id: "halo",
    type: "circle",
    source: "events",
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-radius": [
        "match",
        ["get", "kind"],
        ["armed", "violence"],
        20,
        14,
      ],
      "circle-color": [
        "match",
        ["get", "kind"],
        "armed",
        "#ee7257",
        "violence",
        "#d8aa65",
        "diplomacy",
        "#8cbea3",
        "#79a6ba",
      ],
      "circle-opacity": [
        "match",
        ["get", "kind"],
        ["armed", "violence"],
        0.24,
        0.13,
      ],
      "circle-stroke-width": 1,
      "circle-stroke-color": [
        "match",
        ["get", "kind"],
        "armed",
        "#ee7257",
        "violence",
        "#d8aa65",
        "diplomacy",
        "#8cbea3",
        "#79a6ba",
      ],
      "circle-stroke-opacity": 0.3,
    },
  });
  map.addLayer({
    id: "points",
    type: "symbol",
    source: "events",
    filter: ["!", ["has", "point_count"]],
    layout: {
      "icon-image": ["concat", "event-", ["get", "kind"]],
      "icon-size": ["match", ["get", "kind"], ["armed", "violence"], 1.05, 0.9],
      "icon-allow-overlap": true,
    },
  });
  map.addSource("selection", { type: "geojson", data: selectionData() });
  map.addLayer({
    id: "economy-badges",
    type: "symbol",
    source: "events",
    filter: [
      "all",
      ["!", ["has", "point_count"]],
      ["==", ["get", "economic"], 1],
    ],
    layout: {
      "text-field": "$",
      "text-font": ["Noto Sans Regular"],
      "text-size": 15,
      "text-offset": [1.1, -1.1],
      "text-allow-overlap": true,
    },
    paint: {
      "text-color": "#edcb7b",
      "text-halo-color": "#18212b",
      "text-halo-width": 2,
    },
  });
  map.addLayer({
    id: "selection-ring",
    type: "circle",
    source: "selection",
    paint: {
      "circle-radius": 25,
      "circle-color": "#f0d0a0",
      "circle-opacity": 0.08,
      "circle-stroke-color": "#f0d0a0",
      "circle-stroke-width": 2,
    },
  });
  map.addLayer({
    id: "selection-icon",
    type: "symbol",
    source: "selection",
    layout: {
      "icon-image": ["concat", "event-", ["get", "kind"]],
      "icon-size": 1.15,
      "icon-allow-overlap": true,
    },
  });
}
function selectionData() {
  const event = eventIndex.value.get(props.selected ?? "");
  return {
    type: "FeatureCollection" as const,
    features:
      event && event.locationPrecision !== "country"
        ? [
            {
              type: "Feature" as const,
              geometry: {
                type: "Point" as const,
                coordinates: event.coordinates,
              },
              properties: { kind: event.kind },
            },
          ]
        : [],
  };
}
function updateData() {
  (map?.getSource("events") as GeoJSONSource | undefined)?.setData(geojson());
  updateSelection();
}
function updateSelection() {
  (map?.getSource("selection") as GeoJSONSource | undefined)?.setData(
    selectionData(),
  );
  updateReferences();
}
function reportViewport() {
  if (!container.value?.clientWidth || !container.value.clientHeight) return;
  const bounds = map?.getBounds();
  if (bounds)
    emit("viewport", [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ]);
}
function fitEvents() {
  if (!map || !props.events.length) return;
  const bounds = new LngLatBounds(
    props.events[0]!.coordinates,
    props.events[0]!.coordinates,
  );
  for (const event of props.events) bounds.extend(event.coordinates);
  referenceData().features.forEach((feature) =>
    bounds.extend(feature.geometry.coordinates as [number, number]),
  );
  map.fitBounds(bounds, {
    padding: { top: 85, bottom: 95, left: 55, right: 40 },
    maxZoom: 6,
    duration: reducedMotion() ? 0 : 800,
  });
}
function reset() {
  map?.fitBounds(
    [
      [-175, -55],
      [179, 76],
    ],
    {
      padding: { top: 80, bottom: 90, left: 20, right: 20 },
      bearing: 0,
      pitch: 0,
      duration: reducedMotion() ? 0 : 1000,
    },
  );
}
function toggleStyle() {
  light.value = !light.value;
  map?.setStyle(style());
}
function focusEvent(event: ConflictEvent) {
  if (!map) return;
  if (event.locationPrecision === "country") {
    const references = boundaries.features.filter((feature) =>
      event.countries.some(
        (country) => country.code === feature.properties.code,
      ),
    );
    if (references.length > 1) {
      const bounds = new LngLatBounds();
      references.forEach((feature) =>
        bounds.extend([feature.properties.x, feature.properties.y]),
      );
      map.fitBounds(bounds, {
        padding: { top: 90, bottom: 150, left: 40, right: 40 },
        maxZoom: 3,
        duration: reducedMotion() ? 0 : 800,
      });
      return;
    }
  }
  map.flyTo({
    center: event.coordinates,
    zoom:
      event.locationPrecision === "country"
        ? 2.5
        : Math.max(map.getZoom(), 4.5),
    duration: reducedMotion() ? 0 : 800,
  });
}
watch(() => props.events, updateData);
watch(
  () => props.selected,
  (id) => {
    updateSelection();
    const event = props.events.find((event) => event.id === id);
    if (event) focusEvent(event);
  },
);
watch(
  () => props.heatmap,
  (visible) => {
    if (map?.getLayer("heat"))
      map.setLayoutProperty("heat", "visibility", visible ? "visible" : "none");
  },
);
watch(
  container,
  async (element) => {
    if (!element || map) return;
    try {
      const response = await fetch("/data/countries.geojson");
      if (!response.ok) throw new Error("Country geometry unavailable");
      boundaries = await response.json();
      if (!element.isConnected) return;
      setWorkerUrl(workerUrl);
      map = new WorldMap({
        container: element,
        style: style(),
        center: [10, 17],
        zoom: 0.8,
        minZoom: -1,
        maxZoom: 14,
        attributionControl: { compact: true },
        renderWorldCopies: false,
      });
      map.setMissingStyleImageResolver((id) => {
        const match = /^cluster-(\d+)-(\d+)-(\d+)-(\d+)-(\d+)$/.exec(id);
        if (!match || !map || map.hasImage(id)) return;
        const counts = match.slice(1).map(Number);
        if (
          !counts.every(
            (value) => Number.isInteger(value) && value >= 0 && value <= 20000,
          ) ||
          counts.reduce((sum, value) => sum + value, 0) === 0
        )
          return;
        if (ringImages.size >= 256) {
          const oldest = ringImages.values().next().value!;
          if (map.hasImage(oldest)) map.removeImage(oldest);
          ringImages.delete(oldest);
        }
        map.addImage(id, clusterRing(counts), { pixelRatio: 2 });
        ringImages.add(id);
      });
      map.on("style.load", addLayers);
      map.once("load", () => {
        const selected = eventIndex.value.get(props.selected ?? "");
        if (selected)
          map?.jumpTo({
            center: selected.coordinates,
            zoom: selected.locationPrecision === "country" ? 3 : 5,
          });
        else reset();
        reportViewport();
      });
      map.on("moveend", reportViewport);
      for (const layer of [
        "reference-dots",
        "reference-counts",
        "country-area",
      ]) {
        map.on("click", layer, (event) => {
          const code = event.features?.[0]?.properties?.code;
          if (code) emit("country", String(code));
        });
        map.on("mouseenter", layer, (event) => {
          if (!map) return;
          map.getCanvas().style.cursor = "pointer";
          const code = event.features?.[0]?.properties?.code;
          const item = countryReferences(props.events).find(
            (item) => item.code === code,
          );
          if (!item) return;
          const content = document.createElement("div");
          content.className = "map-hover-content";
          const strong = document.createElement("strong");
          strong.textContent = `${item.name} · ${item.count} acontecimentos com menção ao país`;
          const note = document.createElement("p");
          note.textContent =
            "Referência nacional. Não localiza ataques ou controle territorial. Clique para filtrar a cronologia.";
          content.append(strong, note);
          popup?.remove();
          popup = new Popup({ closeButton: false, offset: 15 })
            .setLngLat(event.lngLat)
            .setDOMContent(content)
            .addTo(map);
        });
        map.on("mouseleave", layer, () => {
          if (map) map.getCanvas().style.cursor = "";
          popup?.remove();
        });
      }
      map.on("click", "points", (event) => {
        const id = event.features?.[0]?.properties?.id;
        if (id) emit("select", String(id));
      });
      map.on("click", "clusters", async (event) => {
        const feature = event.features?.[0];
        if (!feature || feature.geometry.type !== "Point") return;
        popup?.remove();
        const zoom = await (map!.getSource("events") as GeoJSONSource)
          .getClusterExpansionZoom(feature.properties!.cluster_id)
          .catch(() => null);
        if (zoom === null) return;
        map?.easeTo({
          center: feature.geometry.coordinates as [number, number],
          zoom,
          duration: reducedMotion() ? 0 : 600,
        });
      });
      for (const layer of ["points", "clusters"]) {
        map.on("mouseenter", layer, (event) => {
          if (map) map.getCanvas().style.cursor = "pointer";
          const feature = event.features?.[0];
          if (!feature || !map) return;
          const content = document.createElement("div");
          content.className = "map-hover-content";
          const heading = document.createElement("strong");
          content.append(heading);
          if (layer === "clusters") {
            heading.textContent = `${feature.properties?.point_count} relatos agrupados`;
            for (const kind of [
              "armed",
              "violence",
              "tension",
              "diplomacy",
            ] as EventKind[]) {
              const line = document.createElement("p");
              line.textContent = `${kindLabels[kind]}: ${feature.properties?.[kind] ?? 0}`;
              content.append(line);
            }
            const economic = document.createElement("p");
            economic.textContent = `Economia: ${feature.properties?.economic ?? 0} sinais (anel dourado)`;
            content.append(economic);
          } else {
            const item = eventIndex.value.get(String(feature.properties?.id));
            heading.textContent = item?.title || "Relato";
            const line = document.createElement("p");
            line.textContent = item?.countries.length
              ? `${item.countryBasis === "headline" ? "Citados na manchete" : "Afiliações dos atores"}: ${item.countries.map((country) => country.name).join(" · ")}`
              : "Afiliações nacionais não identificadas";
            content.append(line);
            if (item?.locationPrecision === "country") {
              const geography = document.createElement("p");
              geography.textContent =
                "Referência ao país; não é a posição exata de um ataque.";
              content.append(geography);
            }
            if (item?.economy) {
              const economic = document.createElement("p");
              economic.textContent = `$ ${item.economy.label} · ${item.economy.status === "potential" ? "Potencial" : "Medida relatada"}`;
              content.append(economic);
            }
          }
          const hint = document.createElement("small");
          hint.textContent =
            layer === "clusters"
              ? "Clique para ampliar este agrupamento."
              : "Clique para ver fonte e contexto.";
          content.append(hint);
          popup?.remove();
          popup = new Popup({
            closeButton: false,
            closeOnClick: true,
            offset: 20,
            className: "map-inspection",
          })
            .setLngLat(event.lngLat)
            .setDOMContent(content)
            .addTo(map);
        });
        map.on("mouseleave", layer, () => {
          if (map) map.getCanvas().style.cursor = "";
          popup?.remove();
        });
      }
      map.on("error", (event) => {
        if (event.error?.message?.includes("WebGL")) failure.value = true;
      });
      map
        .getCanvas()
        .setAttribute(
          "aria-label",
          "Mapa global interativo. Use as setas para navegar e os botões para alterar o zoom. Os mesmos relatos estão na lista ao lado.",
        );
      resize = new ResizeObserver(() => {
        if (element.clientWidth && element.clientHeight) map?.resize();
      });
      resize.observe(element);
    } catch (error) {
      console.warn("Map initialization failed:", error);
      failure.value = true;
    }
  },
  { flush: "post" },
);
onBeforeUnmount(() => {
  resize?.disconnect();
  popup?.remove();
  map?.remove();
  map = undefined;
});
</script>

<template>
  <div class="map-renderer">
    <div ref="container" class="map-canvas" />
    <div v-if="failure" class="map-failure">
      <strong>O mapa não pôde ser carregado</strong>
      <p>
        Verifique sua conexão e o suporte a WebGL. Os relatos continuam
        disponíveis na lista.
      </p>
    </div>
    <div class="map-controls">
      <button
        aria-label="Aumentar zoom"
        title="Aumentar zoom"
        @click="map?.zoomIn()"
      >
        <Plus :size="17" />
      </button>
      <button
        aria-label="Diminuir zoom"
        title="Diminuir zoom"
        @click="map?.zoomOut()"
      >
        <Minus :size="17" />
      </button>
      <span />
      <button aria-label="Visão global" title="Visão global" @click="reset">
        <LocateFixed :size="17" />
      </button>
      <button
        aria-label="Ajustar mapa aos relatos"
        title="Ajustar aos relatos filtrados"
        :disabled="!events.length"
        @click="fitEvents"
      >
        <Scan :size="17" />
      </button>
      <button
        aria-label="Alternar mapa claro e escuro"
        title="Alternar mapa claro e escuro"
        @click="toggleStyle"
      >
        <Layers :size="17" />
      </button>
      <button
        aria-label="Restaurar orientação"
        title="Restaurar orientação"
        @click="map?.resetNorth()"
      >
        <RotateCcw :size="16" />
      </button>
    </div>
  </div>
</template>
