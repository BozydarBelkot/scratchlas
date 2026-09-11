import { createMapImage } from "@/lib/map-image";
import { createSharedLink } from "@/lib/shared-map";
import { Input } from "./ui/input";
import { useI18n } from "@/lib/i18n";
import { CountryFlag } from "@/components/CountryFlag";
import { useEffect, useMemo, useState } from "react";
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
  const { tr } = useI18n();

  const pct = total ? (value / total) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span>{tr(label)}</span>
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
  const { tr } = useI18n();

  const { statusByCountry, state } = useStore();
  const [exporting, setExporting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [error, setError] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  useEffect(
    () => () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    },
    [imageUrl],
  );
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

  const copyLink = async (url: string) => {
    let copied = false;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        copied = true;
      }
    } catch {
      /* HTTP/local network fallback below. */
    }
    if (!copied) {
      const field = document.createElement("textarea");
      field.value = url;
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      try {
        copied = document.execCommand("copy");
      } catch {
        /* The visible link can still be copied manually. */
      }
      field.remove();
    }
    setCopied(copied);
    if (copied) setTimeout(() => setCopied(false), 2500);
  };
  const share = async () => {
    setSharing(true);
    setError("");
    try {
      const url = await createSharedLink(state, window.location.origin);
      setShareUrl(url);
      await copyLink(url);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not create the shared link. Try again.",
      );
    } finally {
      setSharing(false);
    }
  };
  const download = async () => {
    setExporting(true);
    setError("");
    try {
      const blob = await createMapImage(state, tr);
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      const url = URL.createObjectURL(blob);
      setImageUrl(url);
      const link = document.createElement("a");
      link.href = url;
      link.download = "scratchlas-map.png";
      link.click();
    } catch {
      setError("Could not export the image. Try again.");
    } finally {
      setExporting(false);
    }
  };

  const pct = ((stats.visited.length / TOTAL_COUNTRIES) * 100).toFixed(1);
  const areaPct = ((stats.area / TOTAL_LAND_AREA) * 100).toFixed(1);

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-display">{tr("Passport stats")}</h2>

      <div className="card-surface p-5 text-center">
        <div className="label-caps">{tr("World explored")}</div>
        <div className="font-display text-6xl leading-none" style={{ color: "var(--map-visited)" }}>
          {pct}%
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {tr("{0} of {1} countries · {2}% of land area", {
            0: stats.visited.length,
            1: TOTAL_COUNTRIES,
            2: areaPct,
          })}
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
            <div className="label-caps">{tr(s.label)}</div>
          </div>
        ))}
      </div>

      <div className="card-surface space-y-3 p-4">
        <span className="label-caps">{tr("Continents")}</span>
        {Object.keys(CONTINENT_TOTALS)
          .sort()
          .map((k) => (
            <Bar key={k} label={k} value={stats.byContinent[k] ?? 0} total={CONTINENT_TOTALS[k]} />
          ))}
      </div>

      <div className="card-surface space-y-3 p-4">
        <span className="label-caps">{tr("Milestones")}</span>
        <div className="grid grid-cols-3 gap-2">
          {BADGES.map((b) => {
            const earned = stats.visited.length >= b.need;
            return (
              <div
                key={b.id}
                className={`rounded-lg border p-2.5 text-center transition-colors ${
                  earned ? "border-transparent" : "border-dashed border-border opacity-60"
                }`}
                style={
                  earned ? { background: "var(--map-visited)", color: "var(--card)" } : undefined
                }
              >
                <div className="text-xs font-medium leading-tight">{tr(b.label)}</div>
                <div className="mt-0.5 text-[10px] opacity-80">{tr(b.hint)}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          className="gap-2"
          onClick={() => void download()}
          disabled={exporting}
        >
          <Download className="size-4" /> {tr(exporting ? "Please wait…" : "Map image")}
        </Button>
        <Button className="gap-2" onClick={() => void share()} disabled={sharing}>
          {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
          {tr(sharing ? "Please wait…" : copied ? "Link copied" : "Share link")}
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {tr(error)}
        </p>
      )}
      {shareUrl && (
        <div className="card-surface space-y-3 p-4">
          <p className="text-sm text-muted-foreground">
            {tr(
              "This link contains a read-only snapshot of countries, places, trips and notes, without photos or videos. Anyone with the link can view it.",
            )}
          </p>
          <Input
            aria-label={tr("Shared map link")}
            readOnly
            value={shareUrl}
            onFocus={(event) => event.currentTarget.select()}
          />
          <Button variant="outline" onClick={() => void copyLink(shareUrl)}>
            <Copy className="size-4" />
            {tr(copied ? "Link copied" : "Copy link")}
          </Button>
        </div>
      )}
      {imageUrl && (
        <img
          src={imageUrl}
          alt={tr("Map image")}
          className="w-full rounded-xl border border-border"
        />
      )}

      {stats.visited.length > 0 && (
        <div className="card-surface p-4">
          <span className="label-caps">{tr("Countries collected")}</span>
          <p className="mt-2 text-sm leading-relaxed">
            {stats.visited
              .map((k) => BY_CCA2[k])
              .filter(Boolean)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((c) => (
                <span key={c.cca2} className="mr-3 inline-flex items-center gap-1.5">
                  <CountryFlag code={c.cca2} />
                  {c.name}
                </span>
              ))}
          </p>
        </div>
      )}

      <p className="pb-2 text-center text-xs text-muted-foreground">
        {tr("Reference data available offline for {0} territories.", { 0: COUNTRIES.length })}
      </p>
    </div>
  );
}
