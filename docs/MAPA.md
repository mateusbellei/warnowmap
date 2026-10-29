# Leitura do mapa

O mapa é a visualização principal de acontecimentos agrupados, sincronizada com a cronologia e seus filtros.

- **Áreas azuis e contadores nacionais:** países citados em notícias sem localização mais específica. Contagens por país podem incluir o mesmo acontecimento e não devem ser somadas. Clique para filtrar a cronologia.
- **Símbolos pontuais e anéis:** coordenadas regionais/locais extraídas do provedor. Categorias distinguem confronto, violência, tensão e diplomacia. Coordenada extraída não confirma o local de ataque.
- **Densidade:** disponível apenas para pontos com granularidade além do país; não mede vítimas, intensidade ou controle territorial.
- **Dourado:** sinal econômico relatado ou potencial. Os detalhes distinguem estágio, evidência e limites.

Selecionar um acontecimento com referências nacionais destaca os países mencionados. A visualização não cria setas de agressor para alvo. A camada nacional usa Natural Earth em domínio público, escala 1:110m, incluída no projeto. Áreas pequenas podem não ter geometria; a lista mantém os registros. A cartografia de fundo é OpenFreeMap/OpenMapTiles/OpenStreetMap, com atribuição.

Filtros, busca, cronologia e seleção têm alternativa textual. O mapa suporta teclado, zoom, ajuste aos registros, mudança de estilo, orientação e movimento reduzido. Falhas WebGL mantêm a cronologia utilizável. A lista carrega em blocos de 40 entradas. O worker MapLibre é um asset local.

Não há delimitação de frentes, posições de tropas ou territórios controlados. Esses dados exigem fontes e revisão próprias. Limites metodológicos e operação: `VERSAO-1.md`, `QUALIDADE.md`, `OPERACAO.md`.
