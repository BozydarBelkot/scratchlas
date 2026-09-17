import type { Feature, Geometry } from "geojson";
export type CountryGeometry = Feature<Geometry, { name: string }>;
const cache = new Map<string, CountryGeometry>();
const MAX_CACHED = 48;
export async function loadCountryDetail(id: string, level: "50m" | "10m", signal: AbortSignal) {
  const key = `${level}/${id}`;
  const existing = cache.get(key);
  if (existing) {
    cache.delete(key);
    cache.set(key, existing);
    return existing;
  }
  const response = await fetch(`/geo/countries/${key}.json`, { signal });
  if (!response.ok) throw Error("Country detail unavailable");
  const value: CountryGeometry = await response.json();
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
  cache.set(key, value);
  while (cache.size > MAX_CACHED) cache.delete(cache.keys().next().value!);
  return value;
}

export function intersectsView(
  bounds: [[number, number], [number, number]],
  view: [[number, number], [number, number]],
) {
  return (
    bounds.flat().every(Number.isFinite) &&
    bounds[0][0] <= view[1][0] &&
    bounds[1][0] >= view[0][0] &&
    bounds[0][1] <= view[1][1] &&
    bounds[1][1] >= view[0][1]
  );
}
export const detailWeight = (zoom: number, start: number, end: number) => {
  const t = Math.max(0, Math.min(1, (zoom - start) / (end - start)));
  return t * t * (3 - 2 * t);
};
