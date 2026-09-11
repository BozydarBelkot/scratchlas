import { useEffect, useState } from "react";
import type { FeatureCollection, Geometry } from "geojson";
import type { Place } from "./store";

export type RegionAreas = FeatureCollection<Geometry, { name: string; status?: string }>;
const cache = new Map<string, Promise<RegionAreas>>();
export function useRegionAreas(places: Place[]) {
  const [areas, setAreas] = useState<RegionAreas>({ type: "FeatureCollection", features: [] });
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const regions = places.filter((p) => p.kind === "region");
    Promise.all(
      [...new Set(regions.map((p) => p.country))].map(async (code) => {
        if (!cache.has(code))
          cache.set(
            code,
            fetch(`/regions/${code}.json`)
              .then((r) => {
                if (!r.ok) throw new Error("Region boundaries unavailable");
                return r.json();
              })
              .catch((error) => {
                cache.delete(code);
                throw error;
              }),
          );
        try {
          return { code, data: await cache.get(code)! };
        } catch {
          return { code, data: { type: "FeatureCollection", features: [] } as RegionAreas };
        }
      }),
    ).then((groups) => {
      if (cancelled) return;
      const features = regions.flatMap((p) => {
        const f = groups
          .find((g) => g.code === p.country)
          ?.data.features.find((f) => f.properties.name === p.name);
        return f ? [{ ...f, properties: { name: p.name, status: p.status } }] : [];
      });
      setAreas({ type: "FeatureCollection", features });
      setMissing(features.length < regions.length);
    });
    return () => {
      cancelled = true;
    };
  }, [places]);
  return { areas, missing };
}
