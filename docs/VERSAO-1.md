# Versão consolidada do WarNow

## Modelo e leitura

A unidade exibida é um **acontecimento agrupado automaticamente a partir de publicações**, não uma guerra confirmada. A API mantém `quality` para a triagem de publicações e `summary` para publicações, agrupamentos e contextos. Não são medidas de precisão, gravidade ou número de guerras.

O agrupamento usa URL canônica e manchete equivalente na mesma data, categoria e conjunto de países. Remove parâmetros de rastreamento conhecidos. O parâmetro `update` só é agrupado em caminhos reconhecidos de liveblog; parâmetros identificadores de matérias são preservados. Liveblogs têm agrupamento próprio: sua manchete geral não confirma o conteúdo de cada atualização. Cada publicação mantém URL, veículo, data de referência e indexação. Republicações em domínios diferentes não são tratadas como confirmação independente.

Não há agrupamento semântico amplo de matérias com títulos diferentes. Duas manchetes distintas podem descrever o mesmo fato; agrupar por país e palavras vagas produziria novas associações erradas. A identidade é determinística dentro dessas regras e os detalhes explicam a base do agrupamento.

Os contextos (`dossier`) agrupam **países citados**, com identificador derivado desse conjunto. Não representam beligerantes, teatros militares ou uma lista editorial validada de guerras. A situação distingue relato, anúncio, ameaça/intenção, contestação, negociação e acordo explicitamente mencionado. A classificação é lexical e pode errar; não há serviço de IA ou curadoria humana conectado. Artigos de opinião/análise e liveblogs recebem identificação quando seu título ou URL permite reconhecê-los.

## Geografia

Referências nacionais aparecem em áreas azuis e contadores por país. Um acontecimento pode mencionar vários países e aparecer em mais de um contador; não se somam esses números para obter o total. Pontos e densidade são reservados a coordenadas extraídas com granularidade regional/local, ainda sem confirmação de que localizem um ataque. Ausência de granularidade não é resolvida com precisão inventada.

A cartografia nacional Natural Earth 1:110m é pública e local, com 177 geometrias. Microestados e áreas sem polígono nessa escala continuam acessíveis pela cronologia e filtros. Países citados não recebem direção agressor/alvo e os polígonos não descrevem controle territorial. Fontes e atribuição em `public/data/README.md`.

## Cronologia e interface

O mapa aparece cedo no celular; resumos extensos ficam depois dele. A cronologia apresenta situação e quantidade de publicações, com acesso à lista de origens. Há janelas de entradas de 6 h, 24 h, 7 e 30 dias, filtro por contexto e comparação com a visita anterior salva apenas no navegador. Essa comparação só fica disponível quando o histórico persistente começou antes da visita anterior. No modo temporário ela permanece desativada, para que reinícios não gerem falsas novidades.

A base de publicação/extração permanece separada da entrada no feed. Primeira observação local não é a data do fato. Barras listradas indicam dias sem lotes de contexto registrados; mesmo dias com lotes têm cobertura parcial. Escolher 30 dias não cria um arquivo retroativo: só aparecem dados retidos e efetivamente coletados.

## Economia

Quatro estágios resumem os sinais: medida mencionada, interrupção relatada, efeito descrito pela fonte e risco/intenção. Manchetes sobre planos, propostas e negociação não demonstram execução. Evidência, fonte e data são preservadas. Um efeito descrito não é cotação própria, mensuração de perdas ou causalidade confirmada. Variações econômicas e logística exigem contexto explícito de conflito; a regra de sanções continua temática.

## Operação e critérios de entrega

PostgreSQL, SQLite local, migrações, leases, snapshots transacionais, ingestão protegida e saúde estão implementados. O GET com repositório configurado só lê o último snapshot e reaplica a política. O snapshot persistente guarda publicações admitidas com os contadores da última triagem, reduzindo a leitura de extrações descartadas.

**A escolha de hospedagem foi adiada pelo usuário.** A produção sem banco mantém o modo compatível sob demanda, explicitamente identificado. O workflow de coleta externa está desativado até configurar banco, segredo e variáveis de ativação. Nenhum banco externo, agendador ou alerta é apresentado como provisionado. A ativação e os comandos estão em `OPERACAO.md`.

Testes determinísticos cobrem agrupamento, fronteiras de URLs, estados narrativos, economia, referências geográficas, API sem coleta, autenticação e persistência. O CI também executa o contrato em PostgreSQL descartável real. Auditorias de rede são opt-in e não constituem avaliação de veracidade ou precisão estatística. Os resultados de CI, prévia e produção ficam documentados no PR de entrega.
