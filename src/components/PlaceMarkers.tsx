import { useMemo, useState } from "react";
import type { GeoProjection } from "d3-geo";
import { geoDistance } from "d3-geo";
import { layoutMarkers } from "@/lib/marker-layout";
import type { Place } from "@/lib/store";

export function PlaceMarkers({
  pins,
  projection,
  rotation,
  zoom,
  pixels,
}: {
  pins: Place[];
  projection: GeoProjection;
  rotation: [number, number];
  zoom: number;
  pixels: number;
}) {
  const [active, setActive] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const scale = zoom * pixels;
  const groups = useMemo(
    () =>
      layoutMarkers(
        pins.flatMap((p) => {
          if (
            p.kind === "region" ||
            p.lat == null ||
            p.lng == null ||
            geoDistance([-rotation[0], -rotation[1]], [p.lng, p.lat]) > Math.PI / 2
          )
            return [];
          const xy = projection([p.lng, p.lat]);
          return xy ? [{ id: p.id, name: p.name, x: xy[0] * scale, y: xy[1] * scale }] : [];
        }),
      ),
    [pins, projection, rotation, scale],
  );
  const visibleKey = hovered ?? active;
  const visibleGroup = groups.find((g) => g.points.map((p) => p.id).join("|") === visibleKey);
  return (
    <g data-place-markers="" onPointerDown={(e) => e.stopPropagation()}>
      {groups.map((g) => {
        const key = g.points.map((p) => p.id).join("|"),
          open = active === key;
        const status = pins.find((p) => p.id === g.points[0].id)?.status;
        const color =
          g.points.length > 1
            ? "var(--primary)"
            : status === "lived"
              ? "var(--map-lived)"
              : status === "wish"
                ? "var(--map-wish)"
                : "var(--map-visited)";
        return (
          <g key={key} transform={`translate(${g.x / scale} ${g.y / scale}) scale(${1 / scale})`}>
            <g
              role="button"
              tabIndex={0}
              aria-label={g.points.map((p) => p.name).join(", ")}
              aria-expanded={visibleKey === key}
              style={{ cursor: "pointer" }}
              onPointerEnter={(e) => {
                if (e.pointerType === "mouse") setHovered(key);
              }}
              onPointerLeave={() => setHovered(null)}
              onFocus={(e) => {
                if (e.currentTarget.matches(":focus-visible")) setHovered(key);
              }}
              onBlur={() => setHovered(null)}
              onClick={(e) => {
                e.stopPropagation();
                setActive(open ? null : key);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActive(open ? null : key);
                }
                if (e.key === "Escape") {
                  setActive(null);
                  setHovered(null);
                }
              }}
            >
              <circle r={21} fill="transparent" />
              <circle
                r={g.points.length > 1 ? 10 : 6}
                fill={color}
                stroke="var(--card)"
                strokeWidth={2}
              />
            </g>
          </g>
        );
      })}
      {visibleGroup && (
        <g
          pointerEvents="none"
          transform={`translate(${visibleGroup.x / scale} ${visibleGroup.y / scale}) scale(${1 / scale})`}
        >
          <text
            textAnchor="middle"
            fontSize={11}
            fontWeight={500}
            fill="var(--foreground)"
            stroke="var(--card)"
            strokeWidth={3}
            strokeLinejoin="round"
            paintOrder="stroke"
          >
            {visibleGroup.points
              .flatMap((p) => p.name.match(/.{1,30}(?:\s|$)|\S{1,30}/g) ?? [p.name])
              .map((line, index) => (
                <tspan
                  key={index}
                  x={0}
                  y={(visibleGroup.points.length > 1 ? 23 : 19) + index * 14}
                >
                  {line.trim()}
                </tspan>
              ))}
          </text>
        </g>
      )}
    </g>
  );
}
