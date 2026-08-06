import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Building2,
  Check,
  Landmark,
  MapPin,
  MapPinned,
  Search,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ReferenceCard } from "@/components/ReferenceCard";
import { BY_CCA2 } from "@/lib/countries";
import { BY_CCA2 } from "@/lib/countries";
import { loadCountryGeo, type CountryGeo, type GeoEntry } from "@/lib/geo-data";
import { useStore, STATUS_LABEL, KIND_LABEL, type PlaceKind, type Status } from "@/lib/store";

const STATUSES: Status[] = ["visited", "wish", "lived"];

type SubKind = Exclude<PlaceKind, "country">;
type SheetTab = "places" | "guide";

const CATEGORIES: { id: SubKind; label: string; icon: typeof Building2 }[] = [
  { id: "city", label: "Cities", icon: Building2 },
  { id: "region", label: "Regions", icon: MapPinned },
  { id: "attraction", label: "Attractions", icon: Landmark },
];

const statusColor = (s: Status) =>
  s === "visited" ? "var(--map-visited)" : s === "wish" ? "var(--map-wish)" : "var(--map-lived)";

export function CountrySheet({ code, onClose }: { code: string | null; onClose: () => void }) {
  const { state, statusByCountry, setCountryStatus, addPlace, removePlace } = useStore();
  const [sheetTab, setSheetTab] = useState<SheetTab>("places");
  const [tab, setTab] = useState<SubKind>("city");
  const [addStatus, setAddStatus] = useState<Status>("visited");
  const [q, setQ] = useState("");
  const [geo, setGeo] = useState<CountryGeo | null>(null);

  // Reset the picker whenever another country is opened.
  useEffect(() => {
    setSheetTab("places");
    setTab("city");
    setQ("");
    setGeo(null);
    if (!code) return;
    let cancelled = false;
    loadCountryGeo(code).then((g) => {
      if (!cancelled) setGeo(g);
    });
    return () => {
      cancelled = true;
    };
  }, [code]);

  const c = code ? BY_CCA2[code] : null;

  const sub = useMemo(
    () => (c ? state.places.filter((p) => p.country === c.cca2 && p.kind !== "country") : []),
    [state.places, c],
  );

  const entries: GeoEntry[] = useMemo(() => {
    if (!geo) return [];
    const list = tab === "city" ? geo.cities : tab === "region" ? geo.regions : geo.attractions;
    const s = q.trim().toLowerCase();
    return s ? list.filter((e) => e.name.toLowerCase().includes(s)) : list;
  }, [geo, tab, q]);

  if (!c) return <Sheet open={false} onOpenChange={onClose} />;

  const current = statusByCountry[c.cca2];
  const countryPlace = state.places.find((p) => p.country === c.cca2 && p.kind === "country");

  const addedFor = (entry: GeoEntry) =>
    sub.find((p) => p.kind === tab && p.name.toLowerCase() === entry.name.toLowerCase());

  const toggleEntry = (entry: GeoEntry) => {
    const existing = addedFor(entry);
    if (existing) {
      removePlace(existing.id);
    } else {
      addPlace({
        name: entry.name,
        kind: tab,
        country: c.cca2,
        status: addStatus,
        lat: entry.lat,
        lng: entry.lng,
      });
    }
  };

  return (
    <Sheet open={!!code} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="max-h-[88vh] overflow-y-auto rounded-t-2xl px-4 pb-8 sm:max-w-xl sm:mx-auto"
      >
        <SheetHeader className="px-0">
          <SheetTitle className="flex items-center gap-2 text-2xl font-display">
            <span aria-hidden>{c.flag}</span> {c.name}
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            {c.subregion} · {c.area.toLocaleString()} km²
          </p>
        </SheetHeader>

        <div className="mt-2 grid grid-cols-3 gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setCountryStatus(c.cca2, c.name, current === s ? null : s)}
              className={`rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors ${
                current === s
                  ? "border-transparent text-background"
                  : "border-border bg-card text-foreground hover:bg-accent"
              }`}
              style={current === s ? { background: statusColor(s) } : undefined}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        {countryPlace && (
          <div className="mt-4">
            <MediaStrip place={countryPlace} />
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-1 rounded-full border border-border p-1">
          {(
            [
              { id: "places", label: "Places", icon: MapPin },
              { id: "guide", label: "Guide", icon: BookOpen },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSheetTab(t.id)}
              className={`flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-colors ${
                sheetTab === t.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              <t.icon className="size-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {sheetTab === "guide" ? (
          <div className="mt-4 space-y-2">
            <span className="label-caps">Offline country guide</span>
            <ReferenceCard c={c} />
            <p className="text-xs text-muted-foreground">
              Works with no signal — stored on your device.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <span className="label-caps">Places in {c.name}</span>

            <div className="flex gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setTab(cat.id);
                    setQ("");
                  }}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-full border px-2 py-2 text-xs font-medium transition-colors ${
                    tab === cat.id
                      ? "border-transparent bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <cat.icon className="size-3.5" />
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="shrink-0 text-xs text-muted-foreground">Add as</span>
              <div className="flex gap-1">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setAddStatus(s)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      addStatus === s
                        ? "border-transparent text-background"
                        : "border-border text-muted-foreground hover:bg-accent"
                    }`}
                    style={addStatus === s ? { background: statusColor(s) } : undefined}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={`Search ${CATEGORIES.find((x) => x.id === tab)?.label.toLowerCase()} in ${c.name}`}
                className="h-9 pl-9"
              />
            </div>

            {!geo ? (
              <p className="py-4 text-center text-xs text-muted-foreground">Loading places…</p>
            ) : entries.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                {q ? `No match for “${q}”.` : `No ${tab}s listed for ${c.name} yet.`}
              </p>
            ) : (
              <div className="card-surface max-h-56 divide-y divide-border overflow-y-auto">
                {entries.map((e) => {
                  const added = addedFor(e);
                  return (
                    <button
                      key={e.name}
                      type="button"
                      onClick={() => toggleEntry(e)}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
                    >
                      <span
                        className={`flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                          added ? "border-transparent text-background" : "border-border"
                        }`}
                        style={added ? { background: statusColor(added.status) } : undefined}
                      >
                        {added && <Check className="size-3" />}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{e.name}</span>
                      {added && (
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {STATUS_LABEL[added.status]}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {sub.length > 0 && (
              <div className="space-y-2 pt-1">
                {sub.map((p) => (
                  <div key={p.id} className="card-surface space-y-2 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {KIND_LABEL[p.kind]} · {STATUS_LABEL[p.status]}
                          {p.date ? ` · ${p.date}` : ""}
                        </div>
                        {p.notes && <p className="mt-1 text-xs text-muted-foreground">{p.notes}</p>}
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove ${p.name}`}
                        onClick={() => removePlace(p.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                    <MediaStrip place={p} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
