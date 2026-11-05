import { writeFile } from "node:fs/promises";
import { fetchWorldBank } from "../server/utils/world-bank";
import { configuredRepository } from "../server/services/ingestion";
const dataset = await fetchWorldBank();
const repository = await configuredRepository();
if (repository) {
  try {
    await repository.saveCountryDataset(dataset);
  } finally {
    await repository.close();
  }
} else
  await writeFile(
    new URL("../server/data/country-statistics.json", import.meta.url),
    JSON.stringify(dataset),
  );
console.log(
  `Estatísticas oficiais atualizadas: ${dataset.countries.length} países; ${repository ? "banco persistente" : "snapshot distribuído"}.`,
);
