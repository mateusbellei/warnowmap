# Operação do monitor

## Persistência e ingestão

O PostgreSQL é opcional e configurado exclusivamente no servidor por `DATABASE_URL`. Nenhum provedor foi contratado nesta entrega. A decisão de hospedagem foi adiada pelo usuário. O modo compatível sem banco continua sob demanda, com histórico temporário na Vercel; isso aparece em `operation` e `/api/health`.

Para testar a mesma operação local com persistência real, use Node 24.15+, configure `WARNOW_SQLITE_PATH=.data/monitor.sqlite` no `.env`, execute `npm run db:migrate`, `npm run ingest` e `npm run dev`. SQLite sobrevive a reinícios locais, mas não é permitido como persistência na Vercel. PostgreSQL usa `DATABASE_URL` em vez dessa variável. Credenciais nunca pertencem ao `app/`, a variáveis públicas ou ao Git.

As migrações são explícitas e idempotentes. `npm run db:migrate` cria snapshots, relatórios de origem, leases e execuções, sem apagar estruturas anteriores. Antes de migrar uma instalação existente, mantenha backup do banco e teste a versão em um ambiente de prévia. O GET não executa DDL nem coleta quando um repositório está configurado.

`npm run ingest` ou `POST /api/admin/ingest` executam a coleta. O POST exige `Authorization: Bearer <WARNOW_INGEST_SECRET>`, com segredo de pelo menos 32 caracteres; segredo ausente nunca libera acesso. A coleta usa um lease de dois minutos compartilhado no banco. A gravação do snapshot, dos relatórios e da execução é transacional e exige que o lease ainda pertença ao escritor. Falhas preservam o snapshot anterior. Metadados e relatórios são retidos por até 30 dias, com limite atual de 15 mil registros no snapshot.

O coletor continua consumindo GDELT, com recuperação inicial de oito lotes recentes. Não promete reconstruir 30 dias anteriores ao início da instalação. A consulta recebe o último snapshot; se ele estiver antigo ou faltar contexto, o modo é degradado. Os campos de tempo distinguem indexação do provedor, primeira observação local e data de referência da notícia.

## Agendamento independente

O workflow `Scheduled ingestion` está **desativado por padrão**. Depois de escolher e configurar a hospedagem:

1. Migrar o banco de destino e configurar `DATABASE_URL` e `WARNOW_INGEST_SECRET` no servidor.
2. Executar uma primeira ingestão e verificar `/api/events` e `/api/health`.
3. No GitHub, configurar a variável `WARNOW_INGEST_URL` com o HTTPS completo de `/api/admin/ingest`, o segredo `WARNOW_INGEST_SECRET` e a variável `WARNOW_INGEST_ENABLED=true`.
4. Executar manualmente o workflow e conferir a execução registrada no banco. Só então considerar a coleta independente ativada.

O agendamento consulta a cada 15 minutos, fora da virada do lote. GitHub Actions pode atrasar ou suspender agendamentos conforme suas regras; não é um SLA de atualização. Um worker externo também pode executar `npm run ingest` com o banco configurado. Não é necessário contratar Vercel Pro para usar esse worker separado.

`GET /api/health` informa armazenamento, cobertura de contexto, último lote e última execução. Responde 503 quando um repositório persistente está inacessível, sem snapshot ou desatualizado; o modo sem banco informa `limited`. Não retorna credenciais, connection strings ou SQL. Ainda não há serviço externo de alertas provisionado.

## Validação

O CI executa o contrato do repositório em PostgreSQL real com um serviço descartável e em SQLite. Testes cobrem migração idempotente, exclusão de escritores concorrentes, lease perdido, preservação do snapshot em falhas, autenticação e reabertura do banco local. O banco de teste é separado do ambiente de produção.
