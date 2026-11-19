<script setup lang="ts">
defineProps<{ updating: boolean }>();
</script>

<template>
  <div class="map-news-loading" role="status" aria-live="polite">
    <div class="map-news-loading-card">
      <span class="map-news-spinner" aria-hidden="true" />
      <span>{{
        updating ? "Atualizando notícias…" : "Carregando notícias…"
      }}</span>
    </div>
  </div>
</template>

<style scoped>
.map-news-loading {
  position: absolute;
  inset: 0;
  z-index: 4;
  display: grid;
  place-items: center;
  padding: 20px;
  pointer-events: none;
}
.map-news-loading-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border: 1px solid #657f8c;
  border-radius: 10px;
  background: #15232bf2;
  color: #f2f7f9;
  box-shadow: 0 8px 28px #0006;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
}
.map-news-spinner {
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  border: 3px solid #71879366;
  border-top-color: #fa926e;
  border-radius: 50%;
  animation: news-spin 0.9s linear infinite;
}
@keyframes news-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .map-news-spinner {
    animation: none;
  }
}
</style>
