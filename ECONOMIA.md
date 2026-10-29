# Economia no mapa e na cronologia

Após a revisão editorial, somente relatos que passam pela triagem de conflitos entram nesta camada. Nas notícias do GKG, uma manchete sobre sanções acompanhada do tema SANCTIONS produz um sinal temático, sem inventar código CAMEO ou perdas. A fonte pode tratar de proposta, imposição, alívio ou debate; o rótulo “Sanções mencionadas na manchete” não confirma execução. Notícias rotineiras de comércio e cooperação não são incluídas só para preencher indicadores. Ver `docs/QUALIDADE.md`.

Economia é um atributo dos relatos, preservando sua categoria original e evitando contagem duplicada no mapa. A faixa de resumo acompanha país, relação, datas e cursor temporal. O botão Economia restringe mapa e cronologia aos relatos com esse atributo; `?economy=true` permite compartilhar o filtro. O filtro de área visível continua limitado à cronologia.

Escopo enxuto: sanções, comércio, ajuda econômica e rotas/logística. A faixa mostra a quantidade de medidas relatadas e de ameaças/intenções; esses números contam relatos, não prejuízo, gravidade, medidas únicas ou países afetados. A localização permanece a do relato, não a área de propagação do impacto.

No mapa, `$` identifica pontos com contexto econômico; um contorno dourado sinaliza agrupamentos que contêm tais relatos. O contorno não é uma quinta fatia: o anel interno continua representando as quatro categorias originais. Ao selecionar um relato, o painel apresenta medida, estado, possível efeito e fonte original. Os cenários de demonstração são explicitamente ilustrativos.

## Origem e limites

Classificação por códigos específicos do [manual CAMEO publicado pelo GDELT](https://data.gdeltproject.org/documentation/CAMEO.Manual.1.1b3.pdf):

| Tema            | Medida relatada                        | Ameaça ou intenção          |
| --------------- | -------------------------------------- | --------------------------- |
| Sanções         | 163 imposição; 085 alívio              | 1312 ameaça                 |
| Comércio        | 061 cooperação; 1211 rejeição          | 0311 intenção de cooperação |
| Ajuda econômica | 071 provisão; 1621 redução             | 0331 intenção de provisão   |
| Rotas/logística | 191 bloqueio ou restrição de movimento | 1381 ameaça de bloqueio     |

Os códigos mantêm zeros iniciais. Não são usados códigos genéricos de guerra, ameaça, ajuda militar ou sanção administrativa. Arquivos de coletas anteriores recebem o atributo ao serem lidos, inclusive no fallback desatualizado.

“Medida relatada” indica a classificação automática do texto, sem confirmação editorial. Os efeitos apresentados são mecanismos possíveis, não consequências comprovadas. Bloqueios não demonstram por si só interrupção comercial. Cooperação econômica pode ocorrer sem relação causal com o conflito; essa associação exige a leitura da fonte. Não inferimos petróleo, inflação, PIB, cotações, vítimas econômicas ou valores de perdas. O feed não fornece esses indicadores de forma suficiente para exibi-los como dados observados.

As limitações de cobertura, atualização e retenção do feed existente permanecem. Ausência de sinais econômicos classificados não significa ausência de impactos.
