# WarNow

Monitor global de **confrontos e diplomacia entre países**, com Nuxt 4, TypeScript, Nitro e MapLibre GL JS. O mapa é a visualização principal, com símbolos por categoria, agrupamentos proporcionais e linha do tempo sincronizada. Interface em português.

A camada **Economia** resume sanções, comércio, ajuda econômica e rotas/logística. Um filtro destaca os relatos relacionados no mapa e na cronologia, separando medidas relatadas de ameaças ou intenções. Não estima perdas nem preços. Veja o escopo e a metodologia em [ECONOMIA.md](ECONOMIA.md).

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
- Se o lote anunciado retornar 404, a coleta tenta intervalos anteriores de 15 minutos, limitados a três horas. O lote realmente obtido mantém sua data original e fica marcado como desatualizado quando ultrapassa uma hora; não há substituição por demonstrações. Consultas têm limite de tempo para caber na função Vercel.
- `scope=state` retorna apenas pares de países com vínculo estatal identificado; `scope=bilateral` retorna os pares com ou sem esse vínculo. A interface usa esses recortes para reduzir o payload, mantendo o arquivo completo no servidor. Sem `scope`, a API entrega todos os registros retidos.
- O endpoint acumula os lotes coletados, retendo até **sete dias por data de entrada / 15 mil relatos**. Cada arquivo é limitado a 5 mil extrações agrupadas. A coleta é sob demanda: não é um arquivo retroativo nem há garantia de continuidade sem visitantes. `coverage` informa o começo, a última coleta e a quantidade de lotes retidos. A tolerância de relógio é de 15 minutos.
- O parser inclui CAMEO 02–08 (apelos, intenção de cooperação, consultas, cooperação diplomática/material, ajuda e concessões), 10–13/15–17 (exigências, reprovação, rejeição, ameaças, postura militar, redução de relações e coerção), 18/20 (violência) e 19 (confronto). Os títulos descrevem classificações, não manchetes.
- O recorte padrão exige **países distintos nos dois atores** (`Actor1CountryCode` e `Actor2CountryCode`) e vínculo estatal heurístico (GOV/MIL/ELI ou ator com código nacional simples). Ambos os filtros podem ser desativados. O catálogo ISO valida os códigos, e o runtime traduz nomes para português; Kosovo usa o código CAMEO KSV. Organizações ou códigos desconhecidos não são inventados como países. Afiliação nacional não prova ação governamental ou guerra declarada.
- Use os atalhos de relações bilaterais ou os filtros por país/par. Países e pares têm origem nos atores, nunca nas coordenadas ou no país do veículo. O recorte civil/doméstico pode ser incluído desativando “Apenas países distintos”.
- A linha do tempo tem período padrão de sete dias e permite intervalos de até 90 dias **para a data atribuída ao fato**, dentro dos relatos retidos. A retenção da coleta continua sendo sete dias. As barras incluem dias vazios sem sugerir cobertura completa.
- Alterne entre data do fato (precisão diária, sem horário inventado) e entrada no feed (UTC). O cursor é cumulativo: mostra do início do período até o dia escolhido. Reprodução, anterior/próximo e ordenação antiga/recente acompanham o mesmo recorte no mapa. A consulta automática pausa durante a reprodução; dados não são transformados em trajetórias de tropas.
- O parser usa **ActionGeo**, rejeita coordenadas, URLs e datas inválidas, elimina IDs repetidos e agrupa extrações de mesma URL, coordenadas, categoria, data, ação e par de países, inclusive entre lotes. Não deduplica fatos entre fontes e não mistura pares diferentes do mesmo artigo.
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
app/components/EventTimeline.vue       Cronologia diária e carregamento em blocos
app/assets/css/main.css                Sistema visual e breakpoints
app/assets/css/diplomacy.css            Relações, eixo temporal e interface diplomática
app/assets/css/map-first.css            Mapa principal, painel de contexto e disposição móvel
app/utils/map-icons.ts                 Símbolos locais e anéis proporcionais dos agrupamentos
shared/types/conflict.ts               Contratos compartilhados
shared/utils/events.ts                 Busca, filtros e URLs
shared/utils/timeline.ts               Ordenação, grupos diários, calendário e retenção
shared/utils/map.ts                    Recorte geográfico e antimeridiano
server/api/events.get.ts               API, cache e recuperação
server/utils/gdelt.ts                  Extração ZIP e normalização
server/utils/countries.ts              Códigos nacionais dos atores
server/data/demo.ts                    Cenários ilustrativos
tests/                                Testes de dados, filtros e API
docs/ANALISE.md                        Diagnóstico e decisões
```

## Operação e limites

Na Vercel, `vercel.json` seleciona Nuxt e o build usa o preset Nitro `vercel`, com funções de até 60 segundos. O arquivo das coletas usa `/tmp/warnowmap/kv`, o diretório gravável do ambiente serverless. Esse histórico é **temporário e não compartilhado entre instâncias**: pode reiniciar após inatividade, escala ou deploy. A API informa `coverage.persistence=ephemeral` e a interface explicita a limitação. Não há banco persistente provisionado. Em servidor Node local, o arquivo continua em `.data/kv`.

O build usa o preset Node server do Nitro. Mantenha um volume gravável em `.data/kv` e HTTPS no proxy de produção. Há arquivo local limitado dos lotes coletados; não há worker independente, ingestão contínua sem usuários, banco histórico dedicado, autenticação administrativa, revisão editorial ou cache distribuído entre réplicas. A interface carrega o shell antes de consultar o feed e renderiza a cronologia em blocos de 40 itens. Tiles públicos não oferecem SLA contratado. Para escalar, adote ingestão programada, PostgreSQL/PostGIS/Redis e hospedagem de tiles adequada ao tráfego.

Não há segredos necessários. Endpoints externos são fixos, as fontes permitem somente HTTP(S), e dados do provedor nunca são renderizados como HTML.

Na auditoria da migração foram corrigidas as ocorrências de severidade alta. Restam sete de severidade baixa na cadeia Nuxt/Nitro/Rollup ligada a `deepmerge` 4.3.1, última versão disponível na consulta. Não foi aplicado o downgrade do Nuxt proposto por `audit --force`. Consulte `npm audit` para acompanhar correções upstream.

O repositório atual é [mateusbellei/warnowmap](https://github.com/mateusbellei/warnowmap); o endereço antigo redireciona para ele. A integração das evoluções e a atualização da Vercel são rastreadas pela [issue #1](https://github.com/mateusbellei/warnowmap/issues/1). Consulte `docs/MAPA.md` para a leitura visual, `docs/DIPLOMACIA.md` para o histórico e as relações bilaterais e `ECONOMIA.md` para os sinais econômicos.
