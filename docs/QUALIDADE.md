# Seleção de notícias para o mapa de conflitos

O código CAMEO e a presença de dois países não demonstram uma guerra. O registro 1330384491 associou AMSTERDAM/BRAZIL ao código genérico 180 numa notícia judicial sobre homicídio em Diemen. As afiliações foram apresentadas como se fossem a relação principal do relato. Um cargo judicial em outra extração da mesma matéria também recebeu 190. Ambos são regressões cobertas pelos testes.

## Unidade principal e seleção

O servidor consulta Events e GKG do mesmo lote obtido para enriquecer extrações. Notícias GKG também são coletadas independentemente da existência de extrações CAMEO. Na primeira carga, recupera até oito lotes (janela de duas horas); nas seguintes busca apenas contextos pendentes nessa janela. PAGE_TITLE fornece a manchete original; temas pertencem à mesma URL. Links ou menções num artigo diferente não transferem contexto. A API não consulta páginas arbitrárias nem atribui confiança com base no nome do veículo.

Notícias do GKG precisam de combinação de manchete com assunto específico e temas como ARMEDCONFLICT, CEASEFIRE, SANCTIONS, MILITARY ou terrorismo, conforme a regra. A data de referência precisa estar nas últimas 72 horas: usa publicação quando informada, senão indexação explicitamente identificada. Pelo menos um país nomeado e referência de país correspondente no GKG são requisitos. Não são criados atores, papéis estatais, códigos CAMEO, posições de tropas ou relações agressor/alvo para essas matérias.

As extrações CAMEO mantêm uma via mais restrita: códigos específicos, papéis explícitos de militares/grupos armados ou governos, conforme a ação, tema e manchete coerentes, incluindo os países associados. Sem manchete/contexto não entram. Códigos genéricos 180/190/200, visitas, elogios, consultas rotineiras e comércio geral não bastam. Temas amplos de crime, morte, justiça ou fragilidade não provam conflito. Obituários e retrospectivas reconhecidos pela manchete são excluídos.

Há uma entrada por URL, priorizando a matéria com países da manchete em relação às extrações incidentais. Isso não deduplica fatos entre fontes, versões sindicadas ou URLs com parâmetros diferentes. A interface mostra motivo de inclusão e mantém o link original.

## Países, localização e tempo

Países da manchete vêm de nomes ISO/Intl em inglês, português, espanhol e francês e de um conjunto explícito de aliases comuns. Siglas US/UK só contam em maiúsculas. Há prevenção de sobreposição (South Sudan não acrescenta Sudan). Pessoas, governos e nacionalidades não são convertidos automaticamente em agressores ou alvos. A cobertura de idiomas e aliases é limitada; matérias sem correspondência ficam fora, em vez de ter um país inventado.

O ponto das notícias é uma **referência de país mencionado**, não posição de ataque. Só são usados centroides de país do GKG cujo nome corresponde a um país reconhecido na manchete. Uma matéria com vários países tem um ponto de referência; não representa todos os locais, frentes ou extensão de danos. As limitações aparecem no mapa e nos detalhes. Erros do próprio GKG ainda podem ocorrer.

Nas notícias, eventDate usa publicação informada pela fonte ou indexação, com dateBasis distinguindo os casos. Publicação ausente nunca é apresentada como data do acontecimento. Nas extrações, mantém a data atribuída ao fato. reportedAt é indexação/coleta, não prova de que algo acabou de acontecer. Sem publicação conhecida, não é possível garantir a idade do conteúdo; títulos retrospectivos reconhecidos são excluídos, mas outros podem passar. A retenção é de até sete dias por coleta, com 15 mil registros; na Vercel é temporária por instância. O arquivo editorial usa events:v4:last; o anterior não é apagado nem publicado novamente.

## Operação e falhas

O GKG comprimido é limitado a 10 MB, com arquivo expandido abaixo de 64 MB e timeout de seis segundos. O destino é fixo em data.gdeltproject.org e deriva do lote efetivamente obtido. Falhas de contexto não liberam o feed bruto: permanecem apenas registros já disponíveis que passam pela política. Cache, scope=all e fallback desatualizado aplicam a mesma triagem. A demonstração continua explicitamente ilustrativa.

A recuperação usa duas transferências por vez, com orçamento total de 48 segundos por coleta. Lotes incompletos não são marcados como concluídos: voltam a ser tentados após um minuto e a interface mostra “Coleta incompleta”. Sem contexto do lote atual, o modo é desatualizado ou indisponível; uma resposta HTTP bem-sucedida não basta para anunciar feed atualizado. A versão news-v3 invalida a conclusão indevida do cache anterior. Logs distinguem lote, status HTTP e erro de processamento. contextBatchDates contabiliza contextos efetivamente processados; a janela inicial não equivale a sete dias de cobertura retroativa.

Um 404 GKG recebe uma única revalidação no mesmo host, com parâmetro de cache estável por cinco minutos e dentro do mesmo orçamento. Isso permite recuperar arquivos publicados cujo 404 ficou armazenado em um ponto regional do CDN. Persistindo a falha, a cobertura continua marcada como parcial.

quality informa registros avaliados, selecionados, excluídos/deduplicados e selecionados com contexto. Esses números não são taxa de acurácia, fatos confirmados ou cobertura do noticiário mundial. Os filtros da interface podem reduzir o conjunto selecionado depois da triagem.

## Auditoria

A auditoria opt-in usa o lote 20261029001500 do exemplo e depende da disponibilidade dos dois arquivos públicos. A seleção final naquele lote produziu quatro URLs: lançamento de míssil China/Austrália, negociação com o Irã e matérias sobre embargo a Cuba. A notícia judicial e referências retrospectivas identificadas ficaram fora. Essa inspeção não valida a veracidade dessas quatro matérias nem estima precisão/recall global.

```powershell
$env:WARNOW_LIVE_AUDIT='1'
npm test -- tests/editorial-live.test.ts --reporter verbose
Remove-Item Env:WARNOW_LIVE_AUDIT
```

Os testes normais são determinísticos e não usam a rede. Há regressões para o exemplo, notícias/temas de outro artigo, códigos genéricos, correspondência de países, publicação ausente/antiga, enriquecimento no endpoint e extrações legadas. O texto é renderizado como texto, sem executar HTML do provedor.

## Limites editoriais

Esta é uma triagem conservadora e explicável, baseada em metadados e regras lexicais. Pode perder notícias relevantes e aceitar referências incorretas, metáforas ou relatos tendenciosos. Não lê semanticamente o artigo inteiro, não confirma autoria/cronologia de ataques e não substitui revisão editorial ou uma fonte especializada com curadoria. Não há nota de confiabilidade inventada, lista fixa de guerras nem inclusão de notícias apenas para preencher o mapa. Algumas coletas podem não ter nenhuma notícia elegível.

Fontes primárias: [Events 2.0](https://data.gdeltproject.org/documentation/GDELT-Event_Codebook-V2.0.pdf), [GKG 2.1](https://data.gdeltproject.org/documentation/GDELT-Global_Knowledge_Graph_Codebook-V2.1.pdf), [CAMEO](https://data.gdeltproject.org/documentation/CAMEO.Manual.1.1b3.pdf).
