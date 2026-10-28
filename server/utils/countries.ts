import isoCountries from "i18n-iso-countries";
import type { CountryRef } from "../../shared/types/conflict";

const names = new Intl.DisplayNames(["pt-BR"], { type: "region" });
const cache = new Map<string, CountryRef | null>();
export function actorCountry(code: string): CountryRef | null {
  if (cache.has(code)) return cache.get(code)!;
  if (code === "KSV") return { code, name: "Kosovo" };
  if (!/^[A-Z]{3}$/.test(code) || !isoCountries.isValid(code)) return null;
  const alpha2 = isoCountries.alpha3ToAlpha2(code);
  const name = alpha2 ? names.of(alpha2) : null;
  const country = name ? { code, name } : null;
  cache.set(code, country);
  return country;
}
