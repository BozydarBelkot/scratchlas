import { useMemo, useState } from "react";
import { Check, Copy, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  COUNTRIES,
  CONTINENT_TOTALS,
  TOTAL_COUNTRIES,
  TOTAL_LAND_AREA,
  BY_CCA2,
} from "@/lib/countries";
import { useStore } from "@/lib/store";

const BADGES = [
  { id: "first", label: "First stamp", need: 1, hint: "Mark 1 country" },
  { id: "five", label: "Getting going", need: 5, hint: "5 countries" },
  { id: "ten", label: "Double digits", need: 10, hint: "10 countries" },
  { id: "quarter", label: "Globe trotter", need: 25, hint: "25 countries" },
  { id: "fifty", label: "Half century", need: 50, hint: "50 countries" },
  { id: "century", label: "Centurion", need: 100, hint: "100 countries" },
];

function Bar({ value, total, label }: { value: number; total: number; label: string }) {
  const pct = total ? (value / total) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span>{label}</span>
        <span className="font-mono text-xs text-muted-foreground">
          {value}/{total} · {pct.toFixed(0)}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${pct}%`, background: "var(--map-visited)" }}
        />
      </div>
    </div>
  );
}

export function StatsPanel() {
  const { statusByCountry } = useStore();
  const [copied, setCopied] = useState(false);

  const stats = useMemo(() => {
    const visited = Object.entries(statusByCountry)
      .filter(([, s]) => s === "visited" || s === "lived")
      .map(([k]) => k);
    const wish = Object.entries(statusByCountry).filter(([, s]) => s === "wish").length;
    const lived = Object.entries(statusByCountry).filter(([, s]) => s === "lived").length;
    const area = visited.reduce((s, k) => s + (BY_CCA2[k]?.area ?? 0), 0);
    const byContinent: Record<string, number> = {};
    for (const k of visited) {
      const r = BY_CCA2[k]?.region;
      if (r) byContinent[r] = (byContinent[r] ?? 0) + 1;
    }
    return { visited, wish, lived, area, byContinent };
  }, [statusByCountry]);

  const share = async () => {
    const codes = Object.entries(statusByCountry)
      .map(([k, v]) => `${k}${v[0]}`)
      .join(".");
    const url = `${window.location.origin}/?m=${btoa(codes)}`;
    try {
      if (navigator.share) await navigator.share({ title: "My scratch map", url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* dismissed */
    }
  };

  const download = () => {
    const svg = document.querySelector("svg[data-scratch-map]") as SVGSVGElement | null;
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    const cs = getComputedStyle(document.documentElement);
    const vars = [
      "--map-ocean",
      "--map-land",
      "--map-stroke",
      "--map-grid",
      "--map-visited",
      "--map-wish",
      "--map-lived",
      "--card",
      "--foreground",
    ];
    clone.setAttribute(
      "style",
      vars.map((v) => `${v}:${cs.getPropertyValue(v)}`).join(";") +
        `;background:${cs.getPropertyValue("--map-ocean")}`,
    );
    const data = new XMLSerializer().serializeToString(clone);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1760;
      canvas.height = 940;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = cs.getPropertyValue("--map-ocean") || "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = "scratch-map.png";
      a.click();
    };
    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(data)))}`;
  };

  const pct = ((stats.visited.length / TOTAL_COUNTRIES) * 100).toFixed(1);
  const areaPct = ((stats.area / TOTAL_LAND_AREA) * 100).toFixed(1);

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-display">Passport stats</h2>

      <div className="card-surface p-5 text-center">
        <div className="label-caps">World explored</div>
        <div className="font-display text-6xl leading-none" style={{ color: "var(--map-visited)" }}>
          {pct}%
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {stats.visited.length} of {TOTAL_COUNTRIES} countries · {areaPct}% of land area
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Visited", value: stats.visited.length - stats.lived, color: "--map-visited" },
          { label: "Lived", value: stats.lived, color: "--map-lived" },
          { label: "Wish list", value: stats.wish, color: "--map-wish" },
        ].map((s) => (
          <div key={s.label} className="card-surface p-3 text-center">
            <div className="font-display text-3xl" style={{ color: `var(${s.color})` }}>
              {s.value}
            </div>
            <div className="label-caps">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card-surface space-y-3 p-4">
        <span className="label-caps">Continents</span>
        {Object.keys(CONTINENT_TOTALS)
          .sort()
          .map((k) => (
            <Bar
              key={k}
              label={k}
              value={stats.byContinent[k] ?? 0}
              total={CONTINENT_TOTALS[k]}
            />
          ))}
      </div>

      <div className="card-surface space-y-3 p-4">
        <span className="label-caps">Milestones</span>
        <div className="grid grid-cols-3 gap-2">
          {BADGES.map((b) => {
            const earned = stats.visited.length >= b.need;
            return (
              <div
                key={b.id}
                className={`rounded-lg border p-2.5 text-center transition-colors ${
                  earned ? "border-transparent" : "border-dashed border-border opacity-60"
                }`}
                style={earned ? { background: "var(--map-visited)", color: "var(--card)" } : undefined}
              >
                <div className="text-xs font-medium leading-tight">{b.label}</div>
                <div className="mt-0.5 text-[10px] opacity-80">{b.hint}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" className="gap-2" onClick={download}>
          <Download className="size-4" /> Map image
        </Button>
        <Button className="gap-2" onClick={share}>
          {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
          {copied ? "Link copied" : "Share link"}
        </Button>
      </div>

      {stats.visited.length > 0 && (
        <div className="card-surface p-4">
          <span className="label-caps">Countries collected</span>
          <p className="mt-2 text-sm leading-relaxed">
            {stats.visited
              .map((k) => BY_CCA2[k])
              .filter(Boolean)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((c) => `${c.flag} ${c.name}`)
              .join("  ·  ")}
          </p>
        </div>
      )}

      <p className="pb-2 text-center text-xs text-muted-foreground">
        Reference data bundled offline for all {COUNTRIES.length} territories.
      </p>
    </div>
  );
}
