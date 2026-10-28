# Diagnóstico e reconstrução — 28/10/2026

## Sistema encontrado

Protótipo de abril de 2024: Vue 3.4, Vite 5, JavaScript, Leaflet e Tailwind 3. Apenas uma tela de mapa, com países e conflitos fixos em arrays, sem backend ou atualização.

| Área        | Problema observado                                                       | Mudança implementada                                                     |
| ----------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Arquitetura | Roteador manual e Vuex vazio                                             | Nuxt 4, rotas por arquivo, TypeScript estrito, reatividade nativa        |
| Mapa        | Dois wrappers Leaflet; marcadores aninhados e guerras repetidas por país | Fonte GeoJSON única, clusters em worker, camadas WebGL                   |
| Dados       | Booleanos de atualidade; vítimas e inventários sem data/metodologia      | Feed GDELT, datas distintas, fontes e limites explícitos                 |
| Backend     | Ausente                                                                  | Nitro com timeouts, cache, coalescência e última coleta persistida       |
| UX          | Popups sem busca, filtros, feed ou tratamento de erro                    | Dashboard responsivo, densidade, filtros, lista e detalhes sincronizados |
| Marca       | Assets genéricos                                                         | Marca SVG própria WarNow e sistema visual consistente                    |
| Qualidade   | Sem testes/tipagem/CI; dois lockfiles                                    | npm único, testes Vitest e workflow de qualidade                         |

O enriquecimento original cruzava países com conflitos e renderizava cada guerra uma vez por participante. Isso duplicava pontos. O roteador também dependia de `process.env.BASE_URL` em Vite. Os dados legados foram retirados da aplicação; continuam recuperáveis no histórico Git.

## Referências e escopo

[Liveuamap](https://liveuamap.com/) orientou a associação entre relatos, mapa e regiões. [DeepStateMap](https://deepstatemap.live/en) é referência cartográfica; sua página depende de JavaScript e nenhuma geometria territorial foi importada. Nenhum conteúdo, marca ou API privada desses produtos foi copiado.

Cores indicam categorias automáticas de relatos, não soberania, posição política ou confirmação de fatos. O resultado é um monitor funcional com uma fonte pública, não uma operação editorial equivalente às referências.

## Decisões

1. **Nuxt 4.6.3, Vue 3.5.44, TypeScript 5.9:** shell no servidor e mapa exclusivamente no cliente. Nitro 2.13.5 vem integrado ao Nuxt e executa a API. TypeScript 5.9 foi escolhido por compatibilidade com o toolchain, embora a versão mais nova consultada fosse 7.0.2.
2. **Node 24.15:** compatível com o Nuxt atual; runtime local em `.tools/` permitiu validar sem alterar o Node global.
3. **MapLibre 6.16 e OpenFreeMap:** cartografia vetorial e fonte GeoJSON, clusters e densidade via worker local. CARTO exigiu chave na validação e foi substituído. A troca de estilo recria as camadas e preserva o feed.
4. **GDELT export 2.0:** manifesto e ZIP públicos consultados com sucesso. O antigo endpoint GEO respondeu 404. Coordenadas são ActionGeo; dados externos são texto, nunca HTML executável.
5. **Filtro de atores armados:** reduz notícias policiais/esportivas no feed amplo. É uma heurística explícita e pode ser desativada. Não valida a notícia.
6. **Desempenho:** um GeoJSON, componente de mapa separado, marcadores sem milhares de elementos DOM, mapa preservado entre filtros, timers/observadores/contexto descartados ao desmontar, cache no servidor.
7. **Falhas transparentes:** demo explícita; coleta antiga, falha sem cache e última coleta recuperada têm estados distintos. O último lote não é apresentado como cobertura completa de 24 horas.
8. **Acessibilidade:** teclado, link de salto, rótulos, estados pressionados, detalhes textuais equivalentes aos pontos, redução de movimento e alternância móvel entre mapa e lista.

## Validação e entrega

Os testes verificam parser, datas/coordenadas inválidas, URLs inseguras, extração ZIP, agrupamento, filtros, indisponibilidade sem notícias inventadas, demonstração explícita, cache, concorrência e recuperação. Typecheck e build validam o contrato compartilhado e o servidor Node.

O conector GitHub retornou erro de acesso. A branch local foi criada sem alterar configurações globais de confiança do Git. Issue e PR não foram registrados. O workflow será executado após publicação autorizada da branch.

## Evolução editorial e operacional

Para equivalência com as referências, será necessário avaliar fontes licenciadas como ACLED/UCDP, criar curadoria/revisão, entidades de conflitos/atores, ingestão independente dos visitantes, histórico geoespacial e versões de territórios com fonte e data. Também serão necessárias decisões sobre credenciais, cobertura, licenciamento e hospedagem.

Essas capacidades não foram simuladas por números ou polígonos inventados. A entrega não inclui alertas push, contas de usuários, banco histórico ou fronteiras militares verificadas.
