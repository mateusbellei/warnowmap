import { writeFile, rename } from "node:fs/promises";
import { fetchMilitaryDataset } from "../server/utils/military-provider";
const data = await fetchMilitaryDataset();
const target = new URL("../server/data/military.json", import.meta.url);
const temporary = new URL("../server/data/military.json.tmp", import.meta.url);
await writeFile(temporary, JSON.stringify(data));
await rename(temporary, target);
console.log(
  `Inventários atualizados: ${data.countries.length} países, edição ${data.countries[0]?.metrics[0]?.year}.`,
);
