# Inteligência por país · WarNow 1.2

O mapa passa a abrir perfis de países e territórios, independentemente de haver notícia no recorte. A interface reúne cinco séries oficiais do Banco Mundial: população, PIB por habitante em US$ correntes, crescimento real do PIB, inflação anual e estabilidade política WGI (governance score, 0–100). Cada valor conserva ano, unidade e fonte. O indicador WGI é uma estimativa institucional anual baseada em percepções, não uma previsão de guerra ou leitura militar atual.

## Dados e cobertura

`server/data/country-statistics.json` contém o snapshot oficial distribuído com a aplicação, obtido em novembro de 2026, com a data de atualização informada pelo provedor e séries de 2020 a 2025. O catálogo contém 250 códigos de países e territórios; cobertura efetiva varia por série. Agregados como WLD são excluídos, ausências ficam nulas e valores zero/inflação negativa são preservados. O código de Kosovo é conciliado entre a biblioteca, o Banco Mundial e a cartografia.

`GET /api/countries` entrega catálogo e a última observação recente de estabilidade. `GET /api/countries/BRA` entrega séries e observações diárias quando disponíveis. O GET não coleta, não migra e não escreve no banco. Com estatísticas persistidas, elas são usadas; na ausência delas ou indisponibilidade do armazenamento, o snapshot distribuído continua acessível. `historyState` distingue histórico disponível, não configurado e indisponível.

As cores da camada Estabilidade política são faixas de visualização próprias, com limites 30/45/60/75. Não são categorias oficiais de risco do Banco Mundial. Observações com mais de três anos não colorem a camada. Cada país expõe o ano ao abrir o perfil. Regiões cartográficas sem série nacional própria ficam neutras; não herdam a pontuação de um vizinho. A camada Atividade no noticiário usa histórias relacionadas no período, sem medir violência territorial.

Fontes: [API do Banco Mundial](https://datahelpdesk.worldbank.org/knowledgebase/articles/889392), [WGI](https://www.worldbank.org/en/publication/worldwide-governance-indicators), [estabilidade política](https://data.worldbank.org/indicator/GOV_WGI_PV_SC).

## Persistência e atualização

A migração 2 adiciona `warnow_country_observations` nos dois repositórios, preservando as tabelas existentes. Execute `npm run db:migrate` antes de usar a nova coleta com banco configurado. O dataset de estatísticas usa uma chave separada em `warnow_snapshots`; a gravação não substitui o snapshot do noticiário.

`npm run stats:refresh` consulta o provedor e valida paginação/cobertura antes de substituir dados. Com banco configurado, grava o dataset persistente. Sem banco, atualiza o arquivo distribuído para o próximo build. `POST /api/admin/countries` oferece a mesma atualização protegida por `WARNOW_INGEST_SECRET` e exige banco persistente; o GET nunca dispara refresh por visitante.

O workflow Country statistics está desativado até `WARNOW_STATS_ENABLED=true`, `WARNOW_STATS_URL=https://DOMINIO/api/admin/countries` e o segredo já usado na ingestão. Seu agendamento semanal é independente do feed de notícias. Nenhum fornecedor ou banco externo foi contratado; a escolha de hospedagem permanece adiada conforme instrução do usuário. O snapshot distribuído funciona em produção durante essa etapa.

Cada commit de ingestão com banco também registra uma observação diária por país presente, na mesma transação e sob o mesmo lease. Ela contabiliza publicações e histórias relacionadas numa janela móvel de sete dias, com categorias e sinais econômicos. A cobertura representa a fração dos 672 lotes de contexto esperados nesse período; não é probabilidade de veracidade. Retém até 90 dias, sem preencher dias não coletados. Não se atribuem incidentes a um país simplesmente por ele ter sido citado.

O índice composto de instabilidade dinâmica permanece indisponível até integrar fontes operacionais independentes e validar uma série contínua. A interface oferece os sinais observados e a série institucional em separado, sem fabricar uma nota a partir do volume de manchetes.

## Histórias e novidades

O modo Histórias e atualizações preserva todas as publicações, acessíveis também no modo individual. Agrupa URLs canônicas/manchetes equivalentes e coberturas com a mesma sequência de termos centrais, países, categoria, data e números. Variações de atribuição editorial são ignoradas; lugares, números e ações diferentes não são fundidos por mera semelhança. Liveblogs continuam agrupados pela URL, com o limite de que a manchete geral não descreve cada atualização. O vínculo é editorial e não confirma identidade factual de incidentes. Veículos diferentes não comprovam fontes independentes.

Uma história preserva identidade pela primeira URL indexada, lista de publicações e horário da última fonte. Não há resumo gerado de fatos não lidos nem tradução automática apresentada como original. O coletor continua sujeito às condições e à cadência do GDELT.

A consulta automática busca um novo snapshot em segundo plano e oferece Ver atualizações quando o conteúdo muda. A aplicação espera o clique para substituir o recorte, mantendo leitura e viewport. Mudanças de filtros descartam uma atualização pendente de outro recorte. Falhas preservam os dados anteriores. Favoritos são guardados somente no navegador, sem contas ou notificações externas.

## Validação

Testes determinísticos cobrem agregados, ausências, zero, deflação, anos, códigos cartográficos, origem das contagens, lacunas de coleta, persistência, identidade de histórias e mudanças incrementais. O contrato de repositório roda com SQLite e no PostgreSQL real do CI. A seleção de país, comparação, séries e camadas são verificadas em desktop e celular antes da publicação.
