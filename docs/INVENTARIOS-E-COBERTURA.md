# Inventários militares, leitura e cobertura · 1.3

## Exército e Forças Armadas

O perfil nacional tem a aba Exército, com cinco categorias do inventário anual público Global Firepower: militares na ativa, reservistas, tanques, caças/interceptadores e aviões dedicados ao ataque. A base inicial contém 145 países com as cinco categorias conciliadas com códigos ISO; os demais perfis mostram a ausência de cobertura. Valores zero publicados são preservados. Cada cartão tem edição e link da fonte.

As categorias não são somadas. Ativos não são apenas o Exército terrestre; incluem as Forças Armadas segundo o provedor. Tanques incluem modelos principais, médios e leves. Inventário não é prontidão operacional. Caças e aviões de ataque são categorias distintas de asa fixa; não se utiliza o total de aeronaves como se fossem aviões de combate. As contagens podem ser estimativas. Drones ficam como Não disponível porque a base integrada exclui UAVs; não se deduz ausência de drones nem se usa produção/entregas como estoque operacional.

Fontes: [efetivo ativo](https://www.globalfirepower.com/active-military-manpower.php), [reservas](https://www.globalfirepower.com/active-reserve-military-manpower.php), [tanques](https://www.globalfirepower.com/armor-tanks-total.php), [caças](https://www.globalfirepower.com/aircraft-total-fighters.php), [ataque](https://www.globalfirepower.com/aircraft-total-attack-types.php), [definições e exemplo de perfil](https://www.globalfirepower.com/country-military-strength-detail.php?country_id=brazil).

`GET /api/countries/BRA/military` entrega somente o perfil solicitado. Não importa o dataset inteiro para o cliente. Os dados são distribuídos com o build; após sete dias a primeira consulta tenta atualizar as cinco tabelas, com cache e uma atualização em andamento por instância. Falhas preservam o snapshot, com nova tentativa após uma hora e sinalização de atraso após 14 dias. Cache temporário da Vercel não substitui banco persistente. Não há coleta por visitante enquanto o snapshot está recente. Não há novo banco, assinatura ou serviço contratado.

`npm run military:refresh` faz a mesma coleta para o próximo build, gravando o arquivo somente depois de validar edição, países, categorias e inteiros não negativos. A coleta usa cinco páginas fixas do provedor, sem executar scripts do site. Respostas bloqueadas ou mudanças de HTML falham sem apagar dados existentes. Edições diferentes e atualizações parciais são rejeitadas. A base é uma referência anual, não monitoramento de perdas, deslocamentos ou disponibilidade atual de equipamentos. Um campo sem fonte confiável permanece ausente.

## Relatos e tooltips

Os detalhes priorizam a manchete realmente coletada, local/referência geográfica, data com sua origem e fonte original. Sem corpo de artigo verificado, o produto não gera resumo factual nem apresenta classificação como descrição do acontecimento. País citado não é um local confirmado: referências nacionais mostram explicitamente que o local do fato não foi confirmado. Publicação, indexação e data atribuída ao fato conservam rótulos distintos.

Razões de seleção, situação inferida, explicações econômicas, atores e critérios ficam no bloco expansível Como este relato foi classificado. Tooltips do mapa incluem a manchete, fonte e data. Não foi alterada a política de classificação nesta entrega; os problemas de categorias, conciliação de localidades e agrupamento entre datas continuam itens separados da revisão anterior.

## Coleta e lacunas

A interface substitui Feed conectado por um estado relacionado à coleta. O cartão de cobertura destaca a última coleta registrada, horário UTC e idade, junto das lacunas do período solicitado. O relógio é sincronizado quando o feed chega e acompanha o temporizador da página; tolera até um minuto de desvio no horário registrado, mas não inclui lotes futuros na cobertura. Mais de uma hora sem coleta indica desatualização, mesmo se o snapshot ainda estiver rotulado live. Falha na consulta automática mantém os dados e é sinalizada.

Lotes com contexto são contados por janelas únicas de 15 minutos dentro do recorte e até o horário atual; dias com algum registro não são apresentados como dias completos. A completude do contexto do lote atual não implica cobertura histórica de todo o mês. O detalhamento mostra janelas esperadas e registradas. Ausência de lotes não indica ausência de conflitos. Persistência temporária recebe aviso próprio. Nenhuma observação retroativa é inventada e nenhum banco é provisionado.
