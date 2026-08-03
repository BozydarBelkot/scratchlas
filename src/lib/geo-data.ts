import { ATTRACTIONS_BY_COUNTRY, type Attraction } from "./attractions";

export interface GeoEntry {
  name: string;
  lat: number;
  lng: number;
}

export interface CountryGeo {
  cities: GeoEntry[];
  regions: GeoEntry[];
  attractions: GeoEntry[];
}

// Per-country files keep the initial bundle small — only the opened country's
// list of cities/regions is fetched.
const loaders = import.meta.glob<{ cities: [string, number, number][]; regions: [string, number, number][] }>(
  "../data/geo/*.json",
  { import: "default" },
);

const cache = new Map<string, Promise<CountryGeo>>();

export function loadCountryGeo(cca2: string): Promise<CountryGeo> {
  let p = cache.get(cca2);
  if (!p) {
    const load = loaders[`../data/geo/${cca2}.json`];
    p = (load ? load() : Promise.resolve({ cities: [], regions: [] })).then((raw) => ({
      cities: raw.cities.map(([name, lat, lng]) => ({ name, lat, lng })),
      regions: raw.regions.map(([name, lat, lng]) => ({ name, lat, lng })),
      attractions: (ATTRACTIONS_BY_COUNTRY[cca2] ?? []).map((a: Attraction) => ({
        name: a.n,
        lat: a.la,
        lng: a.ln,
      })),
    }));
    cache.set(cca2, p);
  }
  return p;
}
