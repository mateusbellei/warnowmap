import { $fetch } from "ofetch";
import {
  configuredRepository,
  runIngestion,
} from "../server/services/ingestion";
// Mesma implementação usada pelo Nitro, executável por qualquer agendador Node.
Object.assign(globalThis, { $fetch });
const repository = await configuredRepository();
if (!repository) throw new Error("Repositório persistente não configurado.");
try {
  console.info(JSON.stringify(await runIngestion(repository)));
} finally {
  await repository.close();
}
