import { useMemo } from "react";
import type { GeoPath } from "d3-geo";
import type { GeoPermissibleObjects } from "d3-geo";
import { type CountryGeometry } from "@/lib/country-detail";

export function boundary(f: CountryGeometry): GeoPermissibleObjects {
  return {
    type: "MultiLineString",
    coordinates:
      f.geometry.type === "Polygon"
        ? f.geometry.coordinates
        : f.geometry.type === "MultiPolygon"
          ? f.geometry.coordinates.flat()
          : [],
  };
}
export function CountryShape({
  country,
  name,
  code,
  path,
  zoom,
  fill,
  selected,
  onSelect,
}: {
  country: CountryGeometry;
  name: string;
  code?: string;
  path: GeoPath;
  zoom: number;
  fill: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const shape = useMemo(
    () => ({
      d: path(country) ?? undefined,
      line: selected ? (path(boundary(country)) ?? undefined) : undefined,
    }),
    [country, path, selected],
  );
  return (
    <g data-country-code={code} data-country-detail="110m">
      <g pointerEvents="none">
        <path d={shape.d} fill={fill} stroke="var(--map-stroke)" strokeWidth={0.4 / zoom} />
      </g>
      <path
        d={shape.d}
        fill="transparent"
        className="country-shape"
        role={code ? "button" : undefined}
        aria-label={name}
        aria-pressed={code ? selected : undefined}
        tabIndex={code ? 0 : undefined}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (code && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onSelect();
          }
        }}
      >
        <title>{name}</title>
      </path>
    </g>
  );
}
