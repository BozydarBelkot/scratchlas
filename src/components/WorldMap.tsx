import { useEffect, useMemo, useRef, useState } from "react";
import { geoOrthographic, geoPath, geoGraticule10, geoCentroid, geoDistance } from "d3-geo";
import { feature } from "topojson-client";
import type { FeatureCollection, Feature, Geometry } from "geojson";
import topo from "world-atlas/countries-110m.json";
import { BY_CCA2, BY_CCN3, COUNTRIES } from "@/lib/countries";
import { useStore, type Place, type Status } from "@/lib/store";

const world = feature(
  topo as never,
  (topo as unknown as { objects: { countries: never } }).objects.countries,
) as unknown as FeatureCollection<Geometry, { name: string }>;

const FEATURES = world.features;
const GRATICULE = geoGraticule10();

// Microstates (Vatican, San Marino, Monaco…) are too small for the 110m
// geometry — render them as tappable dots at their capital coordinates.
const PRESENT_CCN3 = new Set(FEATURES.map((f) => String(f.id).padStart(3, "0")));
const MICROSTATES = COUNTRIES.filter((c) => !PRESENT_CCN3.has(c.ccn3));

const W = 880;
const H = 470;
const MIN_ZOOM = 1;
const MAX_ZOOM = 8;

interface Props {
  onSelect: (cca2: string) => void;
  selected?: string | null;
  pins: Place[];
}

export function WorldMap({ onSelect, selected, pins }: Props) {
  const { statusByCountry, justMarked } = useStore();
  const [rotation, setRotation] = useState<[number, number]>([-10, -18]);
  const [zoom, setZoom] = useState(1);
  const drag = useRef<{ x: number; y: number; r: [number, number]; z: number } | null>(null);

  const projection = useMemo(
    () =>
      geoOrthographic()
        .rotate([rotation[0], rotation[1]])
        .fitExtent(
          [
            [24, 18],
            [W - 24, H - 18],
          ],
          { type: "Sphere" },
        )
        .clipAngle(90),
    [rotation],
  );

  const path = useMemo(() => geoPath(projection), [projection]);

  const paths = useMemo(
    () =>
      FEATURES.map((f: Feature<Geometry, { name: string }>, i: number) => {
        const info = BY_CCN3[String(f.id).padStart(3, "0")];
        return {
          id: `${f.id}-${i}`,
          cca2: info?.cca2,
          name: info?.name ?? f.properties?.name,
          d: path(f),
        };
      }).filter((p) => p.d),
    [path],
  );

  const burst = useMemo(() => {
    if (!justMarked) return null;
    const f = FEATURES.find((x) => BY_CCN3[String(x.id).padStart(3, "0")]?.cca2 === justMarked);
    const ll: [number, number] | null = f
      ? (geoCentroid(f) as [number, number])
      : BY_CCA2[justMarked]
        ? [BY_CCA2[justMarked].latlng[1], BY_CCA2[justMarked].latlng[0]]
        : null;
    if (!ll) return null;
    const c = projection(ll);
    return c ? { x: c[0], y: c[1] } : null;
  }, [justMarked, projection]);

  // auto-rotate globe toward a newly selected country
  useEffect(() => {
    if (!selected) return;
    const f = FEATURES.find((x) => BY_CCN3[String(x.id).padStart(3, "0")]?.cca2 === selected);
    if (f) {
      const [lon, lat] = geoCentroid(f);
      setRotation([-lon, -lat]);
    } else {
      const info = BY_CCA2[selected];
      if (info) setRotation([-info.latlng[1], -info.latlng[0]]);
    }
  }, [selected]);

  const statusFill = (cca2?: string) => {
    const s: Status | undefined = cca2 ? statusByCountry[cca2] : undefined;
    if (s === "visited") return "var(--map-visited)";
    if (s === "wish") return "var(--map-wish)";
    if (s === "lived") return "var(--map-lived)";
    return "var(--map-land)";
  };

  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());

  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  // set once a gesture turns into a drag/pinch so the trailing click event
  // doesn't accidentally open the country under the release point
  const moved = useRef(false);

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    moved.current = false;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
      drag.current = null;
      return;
    }
    drag.current = { x: e.clientX, y: e.clientY, r: rotation, z: zoom };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (pointers.current.has(e.pointerId))
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size >= 2) {
      moved.current = true;
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const next = pinch.current.zoom * (d / (pinch.current.dist || 1));
      setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next)));
      return;
    }
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) < 3) return;
    moved.current = true;
    // Keep the globe glued to the swipe: one pixel of drag covers fewer
    // degrees when zoomed in, so rotation sensitivity scales down with zoom.
    const k = 0.32 / d.z;
    setRotation([d.r[0] + dx * k, Math.max(-90, Math.min(90, d.r[1] - dy * k))]);
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
        onWheel={(e) =>
          setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * Math.exp(-e.deltaY * 0.0015))))
        }
      >
        <g transform={scaleTransform}>
          <path
            d={path({ type: "Sphere" }) ?? undefined}
            fill="var(--map-ocean)"
            stroke="var(--map-stroke)"
            strokeWidth={1}
          />
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
              onClick={() => {
                const wasDrag = moved.current;
                moved.current = false;
                if (!wasDrag && p.cca2) onSelect(p.cca2);
              }}
            >
              <title>{p.name}</title>
            </path>
          ))}
          {MICROSTATES.map((m) => {
            const [lat, lng] = m.latlng;
            if (geoDistance([-rotation[0], -rotation[1]], [lng, lat]) > Math.PI / 2) return null;
            const xy = projection([lng, lat]);
            if (!xy) return null;
            return (
              <g
                key={m.cca2}
                className="country-shape"
                style={{ cursor: "pointer" }}
                onClick={() => {
                  const wasDrag = moved.current;
                  moved.current = false;
                  if (!wasDrag) onSelect(m.cca2);
                }}
              >
                <circle cx={xy[0]} cy={xy[1]} r={9 / zoom} fill="transparent" />
                <circle
                  cx={xy[0]}
                  cy={xy[1]}
                  r={3.2 / zoom}
                  fill={statusFill(m.cca2)}
                  stroke={
                    selected === m.cca2 ? "var(--foreground)" : "var(--map-stroke)"
                  }
                  strokeWidth={(selected === m.cca2 ? 1.4 : 0.7) / zoom}
                />
                <title>{m.name}</title>
              </g>
            );
          })}
          {pins.map((pl) => {
            if (pl.lat == null || pl.lng == null) return null;
            if (geoDistance([-rotation[0], -rotation[1]], [pl.lng, pl.lat]) > Math.PI / 2)
              return null;
            const xy = projection([pl.lng, pl.lat]);
            if (!xy) return null;
            const color =
              pl.status === "visited"
                ? "var(--map-visited)"
                : pl.status === "wish"
                  ? "var(--map-wish)"
                  : "var(--map-lived)";
            // Markers keep a constant on-screen size at any zoom (radii are
            // divided by zoom) and use a contrasting outline so they stay
            // visible on top of a same-colored country fill.
            if (pl.kind === "attraction") {
              const r = 3.6 / zoom;
              return (
                <path
                  key={pl.id}
                  d={`M ${xy[0]} ${xy[1] - r} L ${xy[0] + r} ${xy[1]} L ${xy[0]} ${xy[1] + r} L ${xy[0] - r} ${xy[1]} Z`}
                  fill={color}
                  stroke="var(--card)"
                  strokeWidth={1.2 / zoom}
                >
                  <title>{pl.name}</title>
                </path>
              );
            }
            return (
              <circle
                key={pl.id}
                cx={xy[0]}
                cy={xy[1]}
                r={2.4 / zoom}
                fill={color}
                stroke="var(--card)"
                strokeWidth={1.3 / zoom}
              >
                <title>{pl.name}</title>
              </circle>
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
