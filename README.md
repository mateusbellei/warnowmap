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

- `GET /api/events` consulta o manifesto público GDELT 2.0, o `export.CSV.zip` e o `gkg.csv.zip` do lote realmente obtido, via HTTPS e sem chave. O GDELT publica lotes a cada 15 minutos. O GKG fornece manchetes, temas e referências geográficas das notícias.
- O cliente consulta a cada minuto enquanto a aba está visível. O servidor mantém cache de cinco minutos e compartilha consultas concorrentes. Falhas sem cache são retidas por um minuto.
- Se o lote anunciado retornar 404, a coleta tenta intervalos anteriores de 15 minutos, limitados a três horas. O lote realmente obtido mantém sua data original e fica marcado como desatualizado quando ultrapassa uma hora; não há substituição por demonstrações. Consultas têm limite de tempo para caber na função Vercel.
- A API sempre aplica triagem editorial de relevância, inclusive com `scope=all` ou em falhas com cache. `scope=state` acrescenta filtro por dois países e papel explícito GOV/MIL nos atores; `scope=bilateral` exige dois países reconhecidos. Notícias por manchete não recebem vínculo estatal inventado. Sem esses filtros, inclui conflitos internos e matérias com um ou mais países citados. O arquivo bruto não é exposto pela API.
- O endpoint acumula os lotes coletados, retendo até **sete dias por data de entrada / 15 mil relatos**. Cada arquivo é limitado a 5 mil extrações agrupadas. A coleta é sob demanda: não é um arquivo retroativo nem há garantia de continuidade sem visitantes. `coverage` informa o começo, a última coleta e a quantidade de lotes retidos. A tolerância de relógio é de 15 minutos.
- O parser preserva ações CAMEO para análise, mas isso não torna uma extração publicável. A seleção exige manchete e temas do mesmo artigo. Códigos genéricos de violência/combate, consultas, visitas, elogios e comércio rotineiro ficam fora. Manchetes retrospectivas/obituários são excluídas. A classificação temática das notícias é separada dos códigos de ação; não inventamos CAMEO para notícias selecionadas pelo GKG.
- O padrão inclui conflitos internos, sem exigir dois Estados. Nas notícias, países são menções explícitas da manchete por nomes e aliases, não agressores/alvos. Nas extrações, afiliações precisam corresponder à manchete e papéis são preservados. Cidades, nacionalidades e códigos nacionais isolados não comprovam ação estatal. Ver [QUALIDADE.md](docs/QUALIDADE.md) para regras e limitações linguísticas.
- Nas matérias GKG, o ponto é uma referência de país citado na manchete, com centroide do próprio GKG. Sem correspondência geográfica, data de referência válida ou contexto temático, a matéria fica fora do mapa. A admissão inicial exige publicação nas últimas 72 horas; quando a fonte não informa publicação, usa indexação recente explicitamente rotulada. Não se afirma que o fato ocorreu na hora da indexação.
- A linha do tempo tem período padrão de sete dias e permite intervalos de até 90 dias para a data de referência, dentro dos relatos retidos. Nas notícias é publicação ou indexação identificada; nas extrações é a data atribuída ao fato. A retenção da coleta continua sendo sete dias. As barras incluem dias vazios sem sugerir cobertura completa.
- Alterne entre data da notícia/relato e entrada no feed (UTC). O cursor é cumulativo: mostra do início do período até o dia escolhido. Reprodução, anterior/próximo e ordenação antiga/recente acompanham o mesmo recorte no mapa. A consulta automática pausa durante a reprodução; dados não são transformados em trajetórias de tropas.
- Extrações usam ActionGeo, sem assumir que o ponto localiza um ataque. A API selecionada tem uma entrada por URL, priorizando a notícia com países da manchete; não deduplica fatos entre fontes. URLs, coordenadas e datas inválidas são rejeitadas.
- `eventDate` é a data de referência, com `dateBasis` distinguindo publication, indexed e event; `reportedAt` é a entrada no feed. O título vem de PAGE_TITLE no GKG, no idioma da fonte. Classificações, motivo de inclusão e papéis indexados aparecem separados. Regiões são agrupamentos aproximados.
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
