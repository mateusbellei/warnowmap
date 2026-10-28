export default defineNuxtConfig({
  compatibilityDate: "2026-10-28",
  devtools: { enabled: false },
  css: [
    "~/assets/css/main.css",
    "~/assets/css/diplomacy.css",
    "~/assets/css/map-first.css",
    "~/assets/css/economy.css",
  ],
  typescript: { strict: true },
  runtimeConfig: { gdeltEnabled: true },
  app: {
    head: {
      htmlAttrs: { lang: "pt-BR" },
      title: "WarNow — Confrontos e diplomacia",
      meta: [
        {
          name: "description",
          content:
            "Acompanhe confrontos e diplomacia entre países em uma linha do tempo sincronizada com o mapa global, com fontes e contexto.",
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
