export default defineNuxtConfig({
  compatibilityDate: "2026-10-28",
  devtools: { enabled: false },
  css: ["~/assets/css/main.css"],
  typescript: { strict: true },
  runtimeConfig: { gdeltEnabled: true },
  app: {
    head: {
      htmlAttrs: { lang: "pt-BR" },
      title: "WarNow — Monitor global de conflitos",
      meta: [
        {
          name: "description",
          content:
            "Explore relatos geolocalizados de conflitos em um mapa global. Fontes, contexto e transparência em uma só visão.",
        },
        { name: "theme-color", content: "#101416" },
      ],
      link: [{ rel: "icon", type: "image/svg+xml", href: "/brand.svg" }],
    },
  },
  nitro: {
    preset: "node-server",
    compressPublicAssets: true,
    storage: { data: { driver: "fs", base: "./.data/kv" } },
  },
  vite: { optimizeDeps: { include: ["@lucide/vue", "maplibre-gl"] } },
});
