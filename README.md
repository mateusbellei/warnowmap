# WarNow

Monitor global de relatos de conflitos com **Nuxt 4, TypeScript, Nitro e MapLibre GL JS**. Mapa vetorial, clusters, densidade, busca, filtros combináveis, detalhes com fontes e layout responsivo em português.

## Executar

Use **Node 24.15+**, ou uma versão compatível declarada em `package.json`. O Node global 22.18 desta máquina é anterior ao mínimo do Nuxt atual. Com nvm: `nvm install 24.15.0` e `nvm use 24.15.0`.

```sh
npm ci
npm run dev
```

Abra http://127.0.0.1:3000. Demonstração explícita: http://127.0.0.1:3000/?demo=true.

```sh
npm run typecheck
npm test
npm run build
node .output/server/index.mjs
```

`npm run check` executa os três checks. O workflow de CI repete a validação e a auditoria de severidade alta. Os testes não dependem de rede.

## Dados e atualização

- `GET /api/events` consulta o manifesto público GDELT 2.0 e o último arquivo `export.CSV.zip`, via HTTPS, sem chave. O GDELT publica lotes a cada 15 minutos.
- O cliente consulta a cada minuto enquanto a aba está visível. O servidor mantém cache de cinco minutos e compartilha consultas concorrentes. Falhas sem cache são retidas por um minuto.
- O endpoint entrega **o último lote**, limitado a 2.000 relatos agrupados. Não é um histórico completo de 24 horas. Os filtros de 1/6/24 horas restringem a idade de entrada nesse lote. A tolerância de relógio é de 15 minutos.
- CAMEO 17/18/19/20 viram coerção, violência e confronto armado. O filtro padrão prioriza atores MIL/REB/INS/SEP/UAF e código 20; pode ser desativado. É uma heurística que pode omitir conflitos e incluir falsos positivos.
- O parser usa **ActionGeo**, rejeita coordenadas, URLs e datas inválidas, elimina IDs repetidos e agrupa extrações de mesma URL, coordenadas, categoria e data. Não deduplica fatos entre fontes.
- `eventDate` é a data atribuída ao evento; `reportedAt` é a entrada no feed. O título descreve a classificação e não é a manchete original. Nomes e atores permanecem no idioma da fonte. Regiões são agrupamentos aproximados.
- `.data/kv` preserva a última coleta. Falhas retornam essa coleta com `mode: stale`. Lotes com mais de uma hora também recebem aviso. Sem coleta anterior, retorna `mode: unavailable` e lista vazia.
- `?demo=true` retorna cenários ilustrativos rotulados. A demonstração nunca substitui silenciosamente a fonte real. `.env.example` permite desativar o provedor para instalações demonstrativas.
- Cartografia: [OpenFreeMap](https://openfreemap.org/quick_start/), OpenMapTiles e OpenStreetMap, com atribuições visíveis. Requer conexão e WebGL. A lista continua utilizável se o mapa falhar. Fontes tipográficas usam Google Fonts com fallback local.

**Relatos automatizados não são fatos confirmados.** Coordenadas, atores e datas podem estar incorretos; notícias históricas podem entrar no lote atual. Pontos não medem guerras, intensidade ou vítimas. Não há fronteiras de controle militar nem confirmação editorial.

Documentação primária: [GDELT](https://www.gdeltproject.org/), [dicionário de eventos](https://data.gdeltproject.org/documentation/GDELT-Event_Codebook-V2.0.pdf), [Nuxt](https://nuxt.com/docs/4.x/getting-started/introduction).

## Organização

```text
app/pages/index.vue                    Dashboard e filtros
app/components/ConflictMap.client.vue   Ciclo de vida do mapa WebGL
app/assets/css/main.css                Sistema visual e breakpoints
shared/types/conflict.ts               Contratos compartilhados
shared/utils/events.ts                 Busca, filtros e URLs
server/api/events.get.ts               API, cache e recuperação
server/utils/gdelt.ts                  Extração ZIP e normalização
server/data/demo.ts                    Cenários ilustrativos
tests/                                Testes de dados, filtros e API
docs/ANALISE.md                        Diagnóstico e decisões
```

## Operação e limites

O build usa o preset Node server do Nitro. Mantenha um volume gravável em `.data/kv` e HTTPS no proxy de produção. A coleta é sob demanda: não há worker independente, histórico contínuo sem usuários, banco histórico, autenticação administrativa, revisão editorial ou cache distribuído entre réplicas. Tiles públicos não oferecem SLA contratado. Para escalar, adote ingestão programada, PostgreSQL/PostGIS/Redis e hospedagem de tiles adequada ao tráfego.

Não há segredos necessários. Endpoints externos são fixos, as fontes permitem somente HTTP(S), e dados do provedor nunca são renderizados como HTML.

Na auditoria da migração foram corrigidas as ocorrências de severidade alta. Restam sete de severidade baixa na cadeia Nuxt/Nitro/Rollup ligada a `deepmerge` 4.3.1, última versão disponível na consulta. Não foi aplicado o downgrade do Nuxt proposto por `audit --force`. Consulte `npm audit` para acompanhar correções upstream.

O conector GitHub não teve acesso ao remoto `m7bellei/warnowmap`. A entrega está na branch local `feat/global-conflict-monitor`; não foi publicado PR nem realizado deploy.
