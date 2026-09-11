import { geoNaturalEarth1, geoPath, geoGraticule10 } from "d3-geo";
import { feature } from "topojson-client";
import topo from "world-atlas/countries-110m.json";
import type { FeatureCollection, Geometry } from "geojson";
import { BY_CCA2, BY_CCN3, CONTINENT_TOTALS, TOTAL_COUNTRIES, TOTAL_LAND_AREA } from "./countries";
import type { AppState, Status } from "./store";

export async function createMapImage(state: AppState, tr: (key: string) => string): Promise<Blob> {
  await Promise.all([
    document.fonts.load('48px "Instrument Serif"'),
    document.fonts.load('24px "DM Sans"'),
    document.fonts.ready,
  ]);
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 1500;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not export the image. Try again.");
  const css = getComputedStyle(document.documentElement);
  const color = (name: string) => css.getPropertyValue(name).trim();
  const text = (
    value: string,
    x: number,
    y: number,
    size = 24,
    tone = "--foreground",
    serif = false,
  ) => {
    ctx.fillStyle = color(tone);
    ctx.font = `${size}px "${serif ? "Instrument Serif" : "DM Sans"}", ${serif ? "serif" : "sans-serif"}`;
    ctx.fillText(value, x, y);
  };
  const box = (x: number, y: number, w: number, h: number, tone = "--card", radius = 24) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fillStyle = color(tone);
    ctx.fill();
  };
  const statuses: Record<string, Status> = {};
  state.places.forEach((p) => {
    if (p.kind === "country") statuses[p.country] = p.status;
  });
  const explored = Object.keys(statuses).filter((code) => statuses[code] !== "wish");
  const lived = Object.values(statuses).filter((s) => s === "lived").length;
  const wish = Object.values(statuses).filter((s) => s === "wish").length;
  const area = explored.reduce((total, code) => total + (BY_CCA2[code]?.area ?? 0), 0);
  box(0, 0, 1600, 1500, "--background", 0);
  text("Scratchlas", 80, 100, 66, "--foreground", true);
  text(tr("Your world, one scratch at a time"), 82, 146, 25, "--muted-foreground");
  box(80, 190, 1440, 670);
  const collection = feature(
    topo as never,
    (topo as unknown as { objects: { countries: never } }).objects.countries,
  ) as unknown as FeatureCollection<Geometry>;
  const projection = geoNaturalEarth1().fitExtent(
    [
      [115, 220],
      [1485, 825],
    ],
    { type: "Sphere" },
  );
  const draw = geoPath(projection, ctx);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(80, 190, 1440, 670, 24);
  ctx.clip();
  ctx.beginPath();
  draw({ type: "Sphere" });
  ctx.fillStyle = color("--map-ocean");
  ctx.fill();
  ctx.beginPath();
  draw(geoGraticule10());
  ctx.strokeStyle = color("--map-grid");
  ctx.lineWidth = 1;
  ctx.stroke();
  for (const country of collection.features) {
    const code = BY_CCN3[String(country.id).padStart(3, "0")]?.cca2;
    ctx.beginPath();
    draw(country);
    ctx.fillStyle = color(code && statuses[code] ? `--map-${statuses[code]}` : "--map-land");
    ctx.fill();
    ctx.strokeStyle = color("--map-stroke");
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }
  const rendered = new Set(collection.features.map((f) => String(f.id).padStart(3, "0")));
  for (const [code, status] of Object.entries(statuses)) {
    const country = BY_CCA2[code];
    if (!country || rendered.has(country.ccn3)) continue;
    const point = projection([country.latlng[1], country.latlng[0]]);
    if (!point) continue;
    ctx.beginPath();
    ctx.arc(point[0], point[1], 3, 0, Math.PI * 2);
    ctx.fillStyle = color(`--map-${status}`);
    ctx.fill();
  }
  ctx.restore();
  text(tr("World explored"), 80, 925, 30, "--foreground", true);
  text(
    `${explored.length} / ${TOTAL_COUNTRIES}  ·  ${((explored.length / TOTAL_COUNTRIES) * 100).toFixed(1)}%`,
    80,
    985,
    48,
    "--map-visited",
    true,
  );
  text(
    `${((area / TOTAL_LAND_AREA) * 100).toFixed(1)}% · ${tr("Land area")}`,
    1000,
    976,
    28,
    "--muted-foreground",
  );
  const cards = [
    [tr("Visited"), explored.length - lived, "--map-visited"],
    [tr("Lived"), lived, "--map-lived"],
    [tr("Wish list"), wish, "--map-wish"],
    [tr("Trips"), state.trips.length, "--foreground"],
  ] as const;
  cards.forEach(([label, value, tone], i) => {
    const x = 80 + i * 366;
    box(x, 1025, 342, 138);
    text(String(value), x + 24, 1090, 48, tone, true);
    text(label, x + 24, 1136, 24, "--muted-foreground");
  });
  Object.entries(CONTINENT_TOTALS)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([continent, total], i) => {
      const x = 80 + (i % 3) * 490,
        y = 1225 + Math.floor(i / 3) * 100;
      const count = explored.filter((code) => BY_CCA2[code]?.region === continent).length;
      text(tr(continent), x, y, 24);
      text(`${count}/${total}`, x + 360, y, 22, "--muted-foreground");
      box(x, y + 18, 450, 8, "--muted", 4);
      if (count) box(x, y + 18, (450 * count) / total, 8, "--map-visited", 4);
    });
  text("Scratchlas", 80, 1450, 28, "--muted-foreground", true);
  text(
    `${tr("Places")}: ${state.places.filter((p) => p.kind !== "country").length}`,
    1250,
    1450,
    24,
    "--muted-foreground",
  );
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Could not export the image. Try again.")),
      "image/png",
    ),
  );
}
