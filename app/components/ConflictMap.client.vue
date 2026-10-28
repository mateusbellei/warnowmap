<script setup lang="ts">
import { Map as WorldMap, setWorkerUrl, type GeoJSONSource } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import { Plus, Minus, LocateFixed, Layers, RotateCcw } from "@lucide/vue";
import type { ConflictEvent } from "#shared/types/conflict";

const props = defineProps<{
  events: ConflictEvent[];
  selected: string | null;
  heatmap: boolean;
}>();
const emit = defineEmits<{ select: [id: string] }>();
const container = ref<HTMLDivElement>();
const failure = ref(false);
const light = ref(false);
let map: WorldMap | undefined;
let resize: ResizeObserver | undefined;
const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const geojson = () => ({
  type: "FeatureCollection" as const,
  features: props.events.map((event) => ({
    type: "Feature" as const,
    geometry: { type: "Point" as const, coordinates: event.coordinates },
    properties: {
      id: event.id,
      kind: event.kind,
      selected: event.id === props.selected,
    },
  })),
});
const style = () =>
  `https://tiles.openfreemap.org/styles/${light.value ? "positron" : "dark"}`;
function addLayers() {
  if (!map || map.getSource("events")) return;
  map.addSource("events", {
    type: "geojson",
    data: geojson(),
    cluster: true,
    clusterMaxZoom: 9,
    clusterRadius: 38,
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
        "rgba(236,112,74,0)",
        0.3,
        "#bc4c30",
        0.7,
        "#ec704a",
        1,
        "#f8c78a",
      ],
    },
    layout: { visibility: props.heatmap ? "visible" : "none" },
  });
  map.addLayer({
    id: "clusters",
    type: "circle",
    source: "events",
    filter: ["has", "point_count"],
    paint: {
      "circle-color": "#cf6041",
      "circle-radius": ["step", ["get", "point_count"], 17, 10, 22, 50, 28],
      "circle-stroke-color": "#ef997b",
      "circle-stroke-width": 1,
      "circle-opacity": 0.9,
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
    },
    paint: { "text-color": "#ffffff" },
  });
  map.addLayer({
    id: "halo",
    type: "circle",
    source: "events",
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-radius": ["case", ["get", "selected"], 23, 16],
      "circle-color": [
        "match",
        ["get", "kind"],
        "armed",
        "#ee7257",
        "violence",
        "#d8aa65",
        "#79a6ba",
      ],
      "circle-opacity": 0.13,
      "circle-stroke-width": 1,
      "circle-stroke-color": [
        "match",
        ["get", "kind"],
        "armed",
        "#ee7257",
        "violence",
        "#d8aa65",
        "#79a6ba",
      ],
      "circle-stroke-opacity": 0.3,
    },
  });
  map.addLayer({
    id: "points",
    type: "circle",
    source: "events",
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-radius": ["case", ["get", "selected"], 7, 5],
      "circle-color": [
        "match",
        ["get", "kind"],
        "armed",
        "#ee7257",
        "violence",
        "#d8aa65",
        "#79a6ba",
      ],
      "circle-stroke-color": "#111719",
      "circle-stroke-width": 2,
    },
  });
}
function updateData() {
  (map?.getSource("events") as GeoJSONSource | undefined)?.setData(geojson());
}
function reset() {
  map?.fitBounds(
    [
      [-175, -55],
      [179, 76],
    ],
    {
      padding: { top: 120, bottom: 80, left: 20, right: 20 },
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
watch(() => props.events, updateData);
watch(
  () => props.selected,
  (id) => {
    updateData();
    const event = props.events.find((event) => event.id === id);
    if (event)
      map?.flyTo({
        center: event.coordinates,
        zoom: Math.max(map.getZoom(), 4.5),
        duration: reducedMotion() ? 0 : 1000,
      });
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
  (element) => {
    if (!element || map) return;
    try {
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
      map.on("style.load", addLayers);
      map.once("load", reset);
      map.on("click", "points", (event) => {
        const id = event.features?.[0]?.properties?.id;
        if (id) emit("select", String(id));
      });
      map.on("click", "clusters", async (event) => {
        const feature = event.features?.[0];
        if (!feature || feature.geometry.type !== "Point") return;
        const zoom = await (
          map!.getSource("events") as GeoJSONSource
        ).getClusterExpansionZoom(feature.properties!.cluster_id);
        map?.easeTo({
          center: feature.geometry.coordinates as [number, number],
          zoom,
          duration: reducedMotion() ? 0 : 600,
        });
      });
      for (const layer of ["points", "clusters"]) {
        map.on("mouseenter", layer, () => {
          if (map) map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layer, () => {
          if (map) map.getCanvas().style.cursor = "";
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
      resize = new ResizeObserver(() => map?.resize());
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
  map?.remove();
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
