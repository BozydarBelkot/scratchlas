import worldCountries from "world-countries";
import { extrasFor, LEFT_DRIVING, type CountryExtra } from "./refdata";

export interface CountryInfo {
  cca2: string;
  cca3: string;
  ccn3: string;
  name: string;
  official: string;
  flag: string;
  region: string;
  subregion: string;
  capital: string;
  latlng: [number, number];
  area: number;
  drivingSide: "left" | "right";
  currency: string;
  dial: string;
  extra: CountryExtra;
}

type RawCountry = (typeof worldCountries)[number];

function build(c: RawCountry): CountryInfo {
  const currencyEntries = Object.entries(c.currencies ?? {}) as [
    string,
    { name: string; symbol?: string },
  ][];
  const cur = currencyEntries[0];
  const dialSuffix = c.idd?.suffixes?.length === 1 ? c.idd.suffixes[0] : "";
  return {
    cca2: c.cca2,
    cca3: c.cca3,
    ccn3: c.ccn3,
    name: c.name.common,
    official: c.name.official,
    flag: c.flag,
    region: c.region,
    subregion: c.subregion || c.region,
    capital: c.capital?.[0] ?? "—",
    latlng: [c.latlng[0], c.latlng[1]],
    area: c.area,
    drivingSide: LEFT_DRIVING.has(c.cca2) ? "left" : "right",
    currency: cur ? `${cur[1].name} (${cur[0]}${cur[1].symbol ? ` ${cur[1].symbol}` : ""})` : "—",
    dial: c.idd?.root ? `${c.idd.root}${dialSuffix}` : "—",
    extra: extrasFor(c.cca2, c.region),
  };
}

export const COUNTRIES: CountryInfo[] = (worldCountries as RawCountry[])
  .map(build)
  .sort((a, b) => a.name.localeCompare(b.name));

export const BY_CCA2: Record<string, CountryInfo> = Object.fromEntries(
  COUNTRIES.map((c) => [c.cca2, c]),
);

export const BY_CCN3: Record<string, CountryInfo> = Object.fromEntries(
  COUNTRIES.map((c) => [c.ccn3, c]),
);

export const CONTINENTS = ["Africa", "Americas", "Asia", "Europe", "Oceania"] as const;
export type Continent = (typeof CONTINENTS)[number];

export const CONTINENT_TOTALS: Record<string, number> = COUNTRIES.reduce(
  (acc, c) => {
    acc[c.region] = (acc[c.region] ?? 0) + 1;
    return acc;
  },
  {} as Record<string, number>,
);

export const TOTAL_COUNTRIES = COUNTRIES.length;
export const TOTAL_LAND_AREA = COUNTRIES.reduce((s, c) => s + (c.area || 0), 0);
