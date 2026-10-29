import { configuredRepository } from "../server/services/ingestion";
const repository = await configuredRepository();
if (!repository)
  throw new Error(
    "Configure DATABASE_URL ou WARNOW_SQLITE_PATH antes da migração.",
  );
try {
  await repository.migrate();
  console.info(`Migração 1 aplicada (${repository.kind}).`);
} finally {
  await repository.close();
}
