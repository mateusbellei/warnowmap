# Confrontos e diplomacia em uma linha do tempo

Esta evolução muda a unidade principal de navegação de pontos isolados para **acontecimentos e relações bilaterais ao longo do tempo**. O mapa mostra o recorte da cronologia, inclusive durante a reprodução.

## Contrato e classificação

`ConflictEvent` preserva `countries`, `countryPair`, `stateLinked` e `actionCode`. O par é canônico (códigos ordenados), permitindo filtrar A↔B independentemente da direção do relato. Os países vêm dos campos de afiliação dos atores, não de ActionGeo. Organizações não são convertidas em países. Atores de países distintos não equivalem a Estados em guerra; `stateLinked` é uma heurística opcional.

O parser passou a aceitar ações diplomáticas antes descartadas: CAMEO 02–08. Ações 10–13 e 15–17 entram como tensão; 18/20 como violência e 19 como confronto. Os rótulos explicitam intenção, consulta, ajuda ou cooperação quando apropriado, sem promover propostas a acordos confirmados. Os dados continuam sem revisão editorial.

Referências primárias: [dicionário GDELT 2.0](https://data.gdeltproject.org/documentation/GDELT-Event_Codebook-V2.0.pdf), [manual CAMEO](https://data.gdeltproject.org/documentation/CAMEO.Manual.1.1b3.pdf).

## Histórico e precisão

O storage `events:v3:last` isola o novo contrato da versão anterior. O endpoint mescla coletas, elimina IDs repetidos e agrupa extrações do mesmo artigo, coordenadas, data, ação, categoria e par. Pares diferentes são preservados. A retenção usa a data de entrada no feed, até sete dias / 15 mil registros. A data atribuída ao fato pode ser mais antiga.

A cobertura registra início, última coleta e datas únicas dos lotes retidos. Não há backfill, coleta autônoma ou garantia de continuidade. Dias sem registros não confirmam ausência de acontecimentos. O histórico começa nesta versão; os arquivos antigos não são apresentados como diplomacia retroativa.

## Experiência e desempenho

- Cronologia com cabeçalhos diários e 40 itens por carregamento, ordenável nas duas direções.
- Datas inicial/final, calendário UTC de até 90 dias e barras de volume por dia, incluindo lacunas.
- Cursor cumulativo inclusivo, reprodução por dia, pausa e passos anterior/próximo; filtros e mapa usam os mesmos registros.
- Base temporal selecionável: fato com precisão diária ou entrada no feed com horário UTC.
- Filtros por região, categoria, país, par de países e vínculo estatal, mais busca sem acentos.
- Categorias diplomáticas em verde e clusters neutros; conjuntos de pontos não são rotulados como confrontos.
- Shell sem bloquear na rede do provedor, caches existentes preservados e consultas concorrentes compartilhadas.
- A API mantém o arquivo completo em cache, mas permite `scope=state` e `scope=bilateral` para reduzir o payload antes da serialização. A interface usa o recorte estatal bilateral por padrão; filtros locais e de região não multiplicam downloads do provedor.
- Diálogo nativo de metodologia com foco modal, rótulos de controles e navegação móvel entre cronologia/mapa.

## Validação

Testes cobrem diplomacia sem ator militar, países ausentes/desconhecidos, pares iguais/distintos, agrupamento sem misturar relações, datas impossíveis, calendário bissexto, ordenação e agrupamento por bases distintas, retenção pela coleta, mesclagem entre lotes, filtro bilateral/estatal e cobertura persistida. TypeScript e build de produção complementam a validação no navegador.

Na validação local desta entrega, os 27 testes passaram, assim como TypeScript, build de produção, formatação e auditoria no limiar de severidade alta. Os sete alertas baixos já documentados na migração continuam presentes. O carregamento do motor do mapa foi separado do código da cronologia.

A medição de 28/10/2026 comparou o mesmo arquivo retido em `scope=all` e `scope=state`: 2.061 registros / 1.170.781 bytes contra 344 registros / 209.375 bytes, aproximadamente 82% menos dados na resposta. É uma amostra do feed, não um benchmark geral de latência.

No navegador foram verificados país, relação bilateral, ordem cronológica, troca de base temporal, detalhes e fonte, intervalo inválido, cursor cumulativo, reprodução diária e layout móvel. Um aviso de hidratação no estado inicial foi corrigido; a recarga de desenvolvimento posterior não apresentou novos avisos ou erros. A ingestão real e a simulação permanecem visualmente distintas.
