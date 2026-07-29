import { useEffect, useMemo, useRef, useState } from "react";
import { geoEquirectangular, geoOrthographic, geoPath, geoGraticule10, geoCentroid, geoDistance } from "d3-geo";
import { feature } from "topojson-client";
import type { FeatureCollection, Feature, Geometry } from "geojson";
import topo from "world-atlas/countries-110m.json";
import { BY_CCN3 } from "@/lib/countries";
import { useStore, type Place, type Status } from "@/lib/store";

const world = feature(
  topo as never,
  (topo as unknown as { objects: { countries: never } }).objects.countries,
) as unknown as FeatureCollection<Geometry, { name: string }>;

const FEATURES = world.features;
const GRATICULE = geoGraticule10();

const W = 880;
const H = 470;

interface Props {
  view: "flat" | "globe";
  onSelect: (cca2: string) => void;
  selected?: string | null;
  pins: Place[];
}

export function WorldMap({ view, onSelect, selected, pins }: Props) {
  const { statusByCountry, justMarked } = useStore();
  const [rotation, setRotation] = useState<[number, number]>([-10, -18]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<[number, number]>([0, 0]);
  const drag = useRef<{ x: number; y: number; r: [number, number]; p: [number, number] } | null>(
    null,
  );
  const svgRef = useRef<SVGSVGElement>(null);

  const size = view === "globe" ? Math.min(W, H) : W;

  const projection = useMemo(() => {
    if (view === "globe") {
      return geoOrthographic()
        .rotate([rotation[0], rotation[1]])
        .fitExtent(
          [
            [24, 18],
            [W - 24, H - 18],
          ],
          { type: "Sphere" },
        )
        .clipAngle(90);
    }
    return geoEquirectangular().fitExtent(
      [
        [8, 8],
        [W - 8, H - 8],
      ],
      { type: "Sphere" },
    );
  }, [view, rotation, size]);

  const path = useMemo(() => geoPath(projection), [projection]);

  const paths = useMemo(
    () =>
      FEATURES.map((f: Feature<Geometry, { name: string }>, i: number) => {
        const info = BY_CCN3[String(f.id).padStart(3, "0")];
        return { id: `${f.id}-${i}`, cca2: info?.cca2, name: info?.name ?? f.properties?.name, d: path(f) };
      }).filter((p) => p.d),
    [path],
  );

  const burst = useMemo(() => {
    if (!justMarked) return null;
    const f = FEATURES.find(
      (x) => BY_CCN3[String(x.id).padStart(3, "0")]?.cca2 === justMarked,
    );
    if (!f) return null;
    const c = projection(geoCentroid(f) as [number, number]);
    return c ? { x: c[0], y: c[1] } : null;
  }, [justMarked, projection]);

  // auto-rotate globe toward a newly selected country
  useEffect(() => {
    if (view !== "globe" || !selected) return;
    const f = FEATURES.find((x) => BY_CCN3[String(x.id).padStart(3, "0")]?.cca2 === selected);
    if (!f) return;
    const [lon, lat] = geoCentroid(f);
    setRotation([-lon, -lat]);
  }, [selected, view]);

  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
      drag.current = null;
      return;
    }
    drag.current = { x: e.clientX, y: e.clientY, r: rotation, p: pan };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (pointers.current.has(e.pointerId))
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const next = pinch.current.zoom * (d / (pinch.current.dist || 1));
      setZoom(Math.min(8, Math.max(1, next)));
      return;
    }
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) < 3) return;
    if (view === "globe") {
      setRotation([d.r[0] + dx * 0.32, Math.max(-90, Math.min(90, d.r[1] - dy * 0.32))]);
    } else {
      setPan([d.p[0] + dx / zoom, d.p[1] + dy / zoom]);
    }
  }
  function onPointerUp(e?: React.PointerEvent) {
    if (e) pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    drag.current = null;
  }

  const scaleTransform = `translate(${W / 2} ${H / 2}) scale(${zoom}) translate(${-W / 2} ${-H / 2})`;

  return (
    <div className="relative h-full w-full select-none overflow-hidden">
      <svg
        ref={svgRef}
        data-scratch-map=""
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full touch-none"
        style={{ background: "var(--map-ocean)" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
        onWheel={(e) => setZoom((z) => Math.min(8, Math.max(1, z - e.deltaY * 0.002)))}
      >

        <g
          transform={
            view === "flat"
              ? `translate(${W / 2 + pan[0]} ${H / 2 + pan[1]}) scale(${zoom}) translate(${-W / 2} ${-H / 2})`
              : undefined
          }
        >
          {view === "globe" && (
            <path
              d={path({ type: "Sphere" }) ?? undefined}
              fill="var(--map-ocean)"
              stroke="var(--map-stroke)"
              strokeWidth={1}
            />
          )}
          <path
            d={path(GRATICULE) ?? undefined}
            fill="none"
            stroke="var(--map-grid)"
            strokeWidth={0.5}
          />
          {paths.map((p) => (
            <path
              key={p.id}
              d={p.d ?? undefined}
              className="country-shape"
              fill={statusFill(p.cca2)}
              stroke={selected && p.cca2 === selected ? "var(--foreground)" : "var(--map-stroke)"}
              strokeWidth={selected && p.cca2 === selected ? 1.6 : 0.4}
              onClick={() => p.cca2 && onSelect(p.cca2)}
            >
              <title>{p.name}</title>
            </path>
          ))}
          {pins.map((pl) => {
            if (pl.lat == null || pl.lng == null) return null;
            if (
              view === "globe" &&
              geoDistance([-rotation[0], -rotation[1]], [pl.lng, pl.lat]) > Math.PI / 2
            )
              return null;
            const xy = projection([pl.lng, pl.lat]);
            if (!xy) return null;
            const color =
              pl.status === "visited"
                ? "var(--map-visited)"
                : pl.status === "wish"
                  ? "var(--map-wish)"
                  : "var(--map-lived)";
            return (
              <g key={pl.id}>
                <circle cx={xy[0]} cy={xy[1]} r={4.5} fill={color} opacity={0.25} />
                <circle
                  cx={xy[0]}
                  cy={xy[1]}
                  r={2}
                  fill={color}
                  stroke="var(--card)"
                  strokeWidth={0.6}
                />
              </g>
            );
          })}
          {burst && (
            <circle
              className="scratch-burst"
              cx={burst.x}
              cy={burst.y}
              r={26}
              fill="none"
              stroke="var(--map-visited)"
              strokeWidth={6}
            />
          )}
        </g>
      </svg>
    </div>
  );
}
