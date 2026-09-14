import { useI18n } from "@/lib/i18n";
import { globePose } from "@/lib/globe-pose";
import { useRegionAreas } from "@/lib/region-areas";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  geoOrthographic,
  geoPath,
  geoGraticule10,
  geoCentroid,
  geoDistance,
  geoArea,
} from "d3-geo";
import { feature } from "topojson-client";
import type { FeatureCollection, Feature, Geometry } from "geojson";
import topo from "world-atlas/countries-110m.json";
import { BY_CCA2, BY_CCN3, COUNTRIES } from "@/lib/countries";
import { useStore, type Place, type Status } from "@/lib/store";

const world = feature(
  topo as never,
  (topo as unknown as { objects: { countries: never } }).objects.countries,
) as unknown as FeatureCollection<Geometry, { name: string }>;

const BASE_FEATURES = world.features;
const GRATICULE = geoGraticule10();

// Microstates (Vatican, San Marino, Monaco…) are too small for the 110m
// geometry — render them as tappable dots at their capital coordinates.

const W = 880;
const H = 470;
const MIN_ZOOM = 1;
// World mode keeps zooming shallow (country overview); Places mode allows
// much deeper zooming so dense city/attraction pins can be told apart.
const MAX_ZOOM_WORLD = 8;
const MAX_ZOOM_PLACES = 30;
// Place markers and their name labels stay hidden until the user zooms in
// close to country level, then fade in.
const PIN_ZOOM = 2.5;

export type MapMode = "world" | "places";

interface Props {
  onSelect: (cca2: string) => void;
  selected?: string | null;
  pins: Place[];
  mode: MapMode;
  decorative?: boolean;
  autoRotate?: boolean;
  preservePose?: boolean;
}

export function WorldMap({
  onSelect,
  selected,
  pins,
  mode,
  decorative = false,
  autoRotate = false,
  preservePose = false,
}: Props) {
  const { tr } = useI18n();

  const visiblePins = useMemo(
    () => (mode === "places" && selected ? pins.filter((p) => p.country === selected) : pins),
    [pins, mode, selected],
  );
  const { areas, missing } = useRegionAreas(visiblePins);
  const maxZoom = mode === "places" ? MAX_ZOOM_PLACES : MAX_ZOOM_WORLD;
  const { statusByCountry, justMarked } = useStore();
  const [rotation, setRotation] = useState<[number, number]>(() =>
    preservePose ? [...globePose.rotation] : [-10, -18],
  );
  useEffect(() => {
    if (preservePose) globePose.rotation = rotation;
  }, [rotation, preservePose]);
  const [zoom, setZoom] = useState(1);
  const FEATURES = BASE_FEATURES;
  const MICROSTATES = useMemo(() => {
    const present = new Set(FEATURES.map((f) => String(f.id).padStart(3, "0")));
    return COUNTRIES.filter((c) => !present.has(c.ccn3));
  }, [FEATURES]);
  const rotationRef = useRef(rotation);
  rotationRef.current = rotation;
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!autoRotate) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = true,
      last = 0,
      frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    if (host.current) observer.observe(host.current);
    const tick = (time: number) => {
      if (time - last >= 50) {
        const delta = Math.min(time - last, 70);
        last = time;
        if (visible && !document.hidden && !reduced.matches)
          setRotation((r) => [r[0] + delta * 0.003, r[1]]);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [autoRotate]);
  const rotationFrame = useRef<number | null>(null);
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
  const selectedOutline = useMemo(() => {
    const rings = FEATURES.filter(
      (f) => BY_CCN3[String(f.id).padStart(3, "0")]?.cca2 === selected,
    ).flatMap((f) =>
      f.geometry.type === "Polygon"
        ? f.geometry.coordinates
        : f.geometry.type === "MultiPolygon"
          ? f.geometry.coordinates.flat()
          : [],
    );
    // Project boundary lines, not polygon fills: clipping at the horizon must not
    // invent an outline along the edge of the globe.
    return rings.length ? path({ type: "MultiLineString", coordinates: rings }) : null;
  }, [selected, path, FEATURES]);

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
    [path, FEATURES],
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
  }, [justMarked, projection, FEATURES]);

  // auto-rotate globe toward a newly selected country
  useEffect(() => {
    if (!selected) return;
    const f = FEATURES.find((x) => BY_CCN3[String(x.id).padStart(3, "0")]?.cca2 === selected);
    const info = BY_CCA2[selected];
    const target = f ? geoCentroid(f) : info ? [info.latlng[1], info.latlng[0]] : null;
    if (!target) return;
    const start = rotationRef.current;
    const longitudeDelta = ((((-target[0] - start[0] + 540) % 360) + 360) % 360) - 180;
    const end: [number, number] = [start[0] + longitudeDelta, -target[1]];
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRotation(end);
      return;
    }
    const started = performance.now();
    const frame = (now: number) => {
      const progress = Math.min(1, (now - started) / 650);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next: [number, number] = [
        start[0] + (end[0] - start[0]) * eased,
        start[1] + (end[1] - start[1]) * eased,
      ];
      rotationRef.current = next;
      setRotation(next);
      rotationFrame.current = progress < 1 ? requestAnimationFrame(frame) : null;
    };
    rotationFrame.current = requestAnimationFrame(frame);
    return () => {
      if (rotationFrame.current !== null) cancelAnimationFrame(rotationFrame.current);
    };
  }, [selected]);

  // Switching back to World mode clamps any deeper Places-mode zoom.
  useEffect(() => {
    if (mode === "world") setZoom((z) => Math.min(z, MAX_ZOOM_WORLD));
  }, [mode]);

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
    if (rotationFrame.current !== null) {
      cancelAnimationFrame(rotationFrame.current);
      rotationFrame.current = null;
    }
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
      setZoom(Math.min(maxZoom, Math.max(MIN_ZOOM, next)));
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

  const globeAreas = useMemo(
    () =>
      areas.features.map((f) => {
        // D3 uses clockwise exterior rings; GeoJSON datasets may use the reverse.
        if (geoArea(f) <= 2 * Math.PI) return f;
        const geometry = structuredClone(f.geometry);
        if (geometry.type === "Polygon") geometry.coordinates.forEach((r) => r.reverse());
        if (geometry.type === "MultiPolygon")
          geometry.coordinates.forEach((p) => p.forEach((r) => r.reverse()));
        return { ...f, geometry };
      }),
    [areas],
  );
  const scaleTransform = `translate(${W / 2} ${H / 2}) scale(${zoom}) translate(${-W / 2} ${-H / 2})`;

  return (
    <div
      ref={host}
      className="world-map-host relative h-full w-full select-none overflow-hidden"
      style={{ background: decorative ? "transparent" : "var(--map-ocean)" }}
    >
      <div hidden={decorative} className="absolute left-3 top-3 z-10 flex gap-2">
        <button
          type="button"
          aria-label={tr("Zoom in")}
          className="rounded-lg border bg-background px-3 py-2 shadow"
          onClick={() => setZoom((z) => Math.min(maxZoom, z * 1.7))}
        >
          +
        </button>
        <button
          type="button"
          aria-label={tr("Zoom out")}
          className="rounded-lg border bg-background px-3 py-2 shadow"
          onClick={() => setZoom((z) => Math.max(1, z / 1.7))}
        >
          −
        </button>
      </div>
      {missing && mode === "places" && (
        <p className="absolute left-3 top-16 z-10 rounded bg-background p-2 text-xs">
          {tr("Some region boundaries are temporarily unavailable.")}
        </p>
      )}
      <div
        className="world-globe-stage"
        style={{ viewTransitionName: preservePose ? "scratchlas-globe" : "none" }}
      >
        <svg
          data-scratch-map=""
          viewBox={`${(W - H) / 2} 0 ${H} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          className="h-full w-full touch-none"
          style={{ overflow: "visible", background: "transparent" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={onPointerUp}
          onWheel={(e) =>
            setZoom((z) => Math.min(maxZoom, Math.max(MIN_ZOOM, z * Math.exp(-e.deltaY * 0.0015))))
          }
        >
          <g transform={scaleTransform}>
            <path
              d={path({ type: "Sphere" }) ?? undefined}
              fill="var(--map-ocean)"
              stroke="var(--map-stroke)"
              strokeWidth={1 / zoom}
            />
            <path
              d={path(GRATICULE) ?? undefined}
              fill="none"
              stroke="var(--map-grid)"
              strokeWidth={0.5 / zoom}
            />
            {paths.map((p) => (
              <path
                key={p.id}
                d={p.d ?? undefined}
                className="country-shape"
                role={p.cca2 ? "button" : undefined}
                aria-label={p.name}
                aria-pressed={p.cca2 ? selected === p.cca2 : undefined}
                tabIndex={p.cca2 ? 0 : undefined}
                onKeyDown={(event) => {
                  if (p.cca2 && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    onSelect(p.cca2);
                  }
                }}
                fill={statusFill(p.cca2)}
                stroke="var(--map-stroke)"
                strokeWidth={0.4 / zoom}
                onClick={() => {
                  const wasDrag = moved.current;
                  moved.current = false;
                  if (!wasDrag && p.cca2) onSelect(p.cca2);
                }}
              >
                <title>{p.name}</title>
              </path>
            ))}
            {mode === "places" &&
              globeAreas.map((area, i) => (
                <path
                  key={area.properties.name + i}
                  d={path(area) ?? undefined}
                  fill={
                    area.properties.status === "wish"
                      ? "var(--map-wish)"
                      : area.properties.status === "lived"
                        ? "var(--map-lived)"
                        : "var(--map-visited)"
                  }
                  fillOpacity={0.3}
                  stroke="var(--foreground)"
                  strokeOpacity={0.6}
                  strokeWidth={0.8 / zoom}
                  pointerEvents="none"
                >
                  <title>{area.properties.name}</title>
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
                    stroke={selected === m.cca2 ? "var(--foreground)" : "var(--map-stroke)"}
                    strokeWidth={(selected === m.cca2 ? 1.4 : 0.7) / zoom}
                  />
                  <title>{m.name}</title>
                </g>
              );
            })}
            {mode === "places" && (
              <g
                aria-hidden={zoom < PIN_ZOOM}
                style={{
                  opacity: zoom >= PIN_ZOOM ? 1 : 0,
                  transition: "opacity 200ms ease",
                  pointerEvents: "none",
                }}
              >
                {visiblePins.map((pl) => {
                  if (pl.kind === "region") return null;
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
                  // Markers and labels keep a constant on-screen size at any zoom
                  // (dimensions are divided by zoom) and use a contrasting
                  // outline/halo so they stay readable on a same-colored country.
                  const label = (r: number) => (
                    <text
                      x={xy[0]}
                      y={xy[1] + (r + 8.6) / zoom}
                      textAnchor="middle"
                      fontSize={9 / zoom}
                      fontWeight={500}
                      fill="var(--foreground)"
                      stroke="var(--card)"
                      strokeWidth={2.4 / zoom}
                      paintOrder="stroke"
                    >
                      {pl.name}
                    </text>
                  );
                  if (pl.kind === "attraction") {
                    const r = 3.6 / zoom;
                    return (
                      <g key={pl.id}>
                        <path
                          d={`M ${xy[0]} ${xy[1] - r} L ${xy[0] + r} ${xy[1]} L ${xy[0]} ${xy[1] + r} L ${xy[0] - r} ${xy[1]} Z`}
                          fill={color}
                          stroke="var(--card)"
                          strokeWidth={1.2 / zoom}
                        />
                        {label(3.6)}
                        <title>{pl.name}</title>
                      </g>
                    );
                  }

                  return (
                    <g key={pl.id}>
                      <circle
                        cx={xy[0]}
                        cy={xy[1]}
                        r={2.4 / zoom}
                        fill={color}
                        stroke="var(--card)"
                        strokeWidth={1.3 / zoom}
                      />
                      {label(2.4)}
                      <title>{pl.name}</title>
                    </g>
                  );
                })}
              </g>
            )}
            {selectedOutline && (
              <g
                data-selected-country={selected}
                pointerEvents="none"
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path
                  d={selectedOutline}
                  stroke="var(--background)"
                  strokeWidth={4}
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d={selectedOutline}
                  stroke="var(--foreground)"
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            )}
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
    </div>
  );
}
