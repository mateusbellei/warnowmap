# Mapa como visualização principal

O mapa passa a ser o ponto de entrada em desktop e celular. A cronologia ocupa um painel de contexto à direita no desktop; o controle temporal fica abaixo do mapa. Indicadores numéricos ficam depois do monitor para preservar a área cartográfica no primeiro carregamento. No celular, o botão de alternância abre a linha do tempo e a seleção de um relato retorna ao mapa.

## Leitura visual

- Confronto: losango com alvo; violência: triângulo com alerta; tensão: hexágono com raio; diplomacia: balões de diálogo. Os ícones são desenhados localmente e não dependem só da cor.
- Os agrupamentos usam anéis proporcionais às quatro categorias. O número central é o **total de relatos**, não a quantidade de confrontos. O hover mostra a composição numérica, e o clique amplia o agrupamento.
- O relato selecionado recebe uma camada independente de destaque, permanecendo visível mesmo quando sua posição pertence a um agrupamento.
- “Ajustar mapa aos relatos” enquadra os registros filtrados. “Visão global” restaura a visão mundial. A navegação temporal continua determinando quais dados aparecem no mapa.
- “Filtrar pela área visível” limita a cronologia às coordenadas atualmente enquadradas. O mapa preserva a fonte global do recorte temporal, permitindo continuar navegando. A função trata o antimeridiano e longitudes não normalizadas do motor cartográfico.
- Densidade usa uma escala fria e representa concentração de relatos, não intensidade militar. Os pontos e anéis não representam controle territorial ou deslocamento de tropas.

## Desempenho e validação

Marcadores e agrupamentos continuam em camadas WebGL. Os anéis são gerados sob demanda pelo resolvedor de imagens do MapLibre 6, reutilizados por composição e limitados a 256 texturas. A seleção atualiza apenas uma fonte com um ponto, evitando reconstruir e reagrupar todo o GeoJSON a cada clique.

Os testes de geometria verificam limites inclusivos, antimeridiano, coordenadas inválidas, áreas globais e preservação da lista original. O conjunto passou com 30 testes. TypeScript, build e verificações visuais complementam a validação de símbolos, estilos, zoom, seleção e integração com a cronologia.
