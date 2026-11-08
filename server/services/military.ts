import bundled from "../data/military.json";
import type { MilitaryDataset } from "../../shared/types/military";
import { fetchMilitaryDataset } from "../utils/military-provider";
let current = bundled as MilitaryDataset;
let retryAfter = 0;
let pending: Promise<MilitaryDataset> | null = null;
export function militaryDataset(): Promise<MilitaryDataset> {
  if (
    Date.now() - Date.parse(current.retrievedAt) < 7 * 86400000 ||
    Date.now() < retryAfter
  )
    return Promise.resolve(current);
  if (pending) return pending;
  pending = (async () => {
    try {
      const saved =
        await useStorage("data").getItem<MilitaryDataset>("military-v1");
      if (
        saved?.version === 1 &&
        saved.countries.length >= 130 &&
        Date.parse(saved.retrievedAt) > Date.parse(current.retrievedAt)
      )
        current = saved;
      if (Date.now() - Date.parse(current.retrievedAt) >= 7 * 86400000) {
        const next = await fetchMilitaryDataset();
        current = next;
        await useStorage("data").setItem("military-v1", next);
      }
    } catch {
      retryAfter = Date.now() + 3600000;
    } finally {
      pending = null;
    }
    return current;
  })();
  return pending;
}
