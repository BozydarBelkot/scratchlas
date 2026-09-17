import type { FeatureCollection, Geometry, Position } from "geojson";
import { geoInterpolate } from "d3-geo";
import { feature } from "topojson-client";
import topo from "world-atlas/countries-110m.json";
import { BY_CCA2 } from "./countries";

const world = feature(
  topo as never,
  topo.objects.countries as never,
) as unknown as FeatureCollection;
const key = (p: Position) => `${p[0].toFixed(5)},${p[1].toFixed(5)}`;
const edge = (a: Position, b: Position) => [key(a), key(b)].sort().join("|");
const rings = (g: Geometry): Position[][] =>
  g.type === "Polygon" ? g.coordinates : g.type === "MultiPolygon" ? g.coordinates.flat() : [];
function distance(p: Position, a: Position, b: Position) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1];
  const t = Math.max(
    0,
    Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)),
  );
  return { t, d: Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy) };
}
function simplify(points: Position[]): Position[] {
  if (points.length <= 2) return points;
  let max = 0.08,
    split = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = distance(points[i], points[0], points[points.length - 1]).d;
    if (d > max) {
      max = d;
      split = i;
    }
  }
  return split
    ? [...simplify(points.slice(0, split + 1)).slice(0, -1), ...simplify(points.slice(split))]
    : [points[0], points[points.length - 1]];
}

// Prepare once per country, never during globe rotation. Shared internal arcs
// are simplified in a canonical direction; outer arcs follow the globe itself.
export function fitRegionsToGlobe<T extends FeatureCollection>(data: T, code: string): T {
  const country = world.features.find((f) => String(f.id).padStart(3, "0") === BY_CCA2[code]?.ccn3);
  if (!country) return data;
  const border = rings(country.geometry);
  const counts = new Map<string, number>();
  const owners = new Map<string, number[]>();
  for (const [fi, f] of data.features.entries())
    for (const r of rings(f.geometry))
      for (let i = 0; i < r.length - 1; i++) {
        const k = edge(r[i], r[i + 1]);
        counts.set(k, (counts.get(k) ?? 0) + 1);
        owners.set(k, [...(owners.get(k) ?? []), fi]);
      }
  const coastal = new Set<string>();
  for (const [e, c] of counts) if (c === 1) e.split("|").forEach((p) => coastal.add(p));
  function nearest(p: Position) {
    let best = { ring: -1, index: 0, t: 0, d: Infinity };
    border.forEach((r, ri) => {
      for (let i = 0; i < r.length - 1; i++) {
        // Avoid projecting across the longitude seam.
        if (Math.abs(r[i + 1][0] - r[i][0]) > 180) continue;
        const q = distance(p, r[i], r[i + 1]);
        if (q.d < best.d) best = { ring: ri, index: i, ...q };
      }
    });
    return best;
  }
  function outer(points: Position[]): Position[] {
    const projected = points.map(nearest),
      out: Position[] = [];
    for (let i = 0; i < points.length; i++) {
      const p = projected[i];
      if (p.ring < 0 || p.d > 1) {
        out.push(points[i]);
        continue;
      }
      const r = border[p.ring],
        n = r.length - 1;
      const prev = projected[i - 1];
      if (prev && prev.ring === p.ring && prev.d <= 1) {
        const from = prev.index + prev.t,
          to = p.index + p.t;
        let delta = to - from;
        if (delta > n / 2) delta -= n;
        if (delta < -n / 2) delta += n;
        if (delta > 0)
          for (let j = Math.floor(from) + 1; j < from + delta; j++) out.push(r[((j % n) + n) % n]);
        if (delta < 0)
          for (let j = Math.ceil(from) - 1; j > from + delta; j--) out.push(r[((j % n) + n) % n]);
      }
      out.push(
        geoInterpolate(r[p.index] as [number, number], r[p.index + 1] as [number, number])(p.t),
      );
    }
    return out;
  }
  function fit(r: Position[]): Position[] {
    const n = r.length - 1;
    if (n < 3) return r;
    const external = r.slice(0, -1).map((p, i) => counts.get(edge(p, r[i + 1])) === 1);
    const groups = r.slice(0, -1).map((p, i) => owners.get(edge(p, r[i + 1]))!.join(","));
    let start = groups.findIndex((v, i) => v !== groups[(i + n - 1) % n]);
    if (start < 0) start = r.slice(0,-1).reduce((best,p,i) => key(p)<key(r[best]) ? i : best,0);
    const result: Position[] = [];
    let used = 0;
    while (used < n) {
      const group = groups[(start + used) % n];
      const type = external[(start + used) % n],
        arc = [r[(start + used) % n]];
      do {
        used++;
        arc.push(r[(start + used) % n]);
      } while (used < n && groups[(start + used) % n] === group);
      if (!type) {
        for (const i of [0, arc.length - 1]) {
          if (!coastal.has(key(arc[i]))) continue;
          const q = nearest(arc[i]);
          if (q.ring >= 0 && q.d <= 1) {
            const b = border[q.ring];
            arc[i] = geoInterpolate(
              b[q.index] as [number, number],
              b[q.index + 1] as [number, number],
            )(q.t);
          }
        }
      }
      // Closed arcs need two halves so simplification cannot collapse the ring.
      const reverse = key(arc[0]) === key(arc[arc.length - 1])
        ? key(arc[1]) > key(arc[arc.length - 2])
        : key(arc[0]) > key(arc[arc.length - 1]);
      const input = reverse ? [...arc].reverse() : arc;
      let fitted: Position[];
      if (type) fitted = outer(input);
      else if (key(input[0]) === key(input[input.length - 1])) {
        const half = Math.floor(input.length / 2);
        fitted = [
          ...simplify(input.slice(0, half + 1)).slice(0, -1),
          ...simplify(input.slice(half)),
        ];
      } else fitted = simplify(input);
      if (reverse) fitted.reverse();
      result.push(...fitted.slice(0, -1));
    }
    if (result.length < 3) return r;
    result.push(result[0]);
    return result;
  }
  return {
    ...data,
    features: data.features.map((f) => ({
      ...f,
      geometry:
        f.geometry.type === "Polygon"
          ? { ...f.geometry, coordinates: f.geometry.coordinates.map(fit) }
          : f.geometry.type === "MultiPolygon"
            ? { ...f.geometry, coordinates: f.geometry.coordinates.map((p) => p.map(fit)) }
            : f.geometry,
    })),
  } as T;
}
