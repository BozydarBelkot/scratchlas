import { useI18n } from "@/lib/i18n";
import { CountryFlag } from "@/components/CountryFlag";
import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, Check, Landmark, MapPinned, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { BY_CCA2 } from "@/lib/countries";
import { loadCountryGeo, type CountryGeo, type GeoEntry } from "@/lib/geo-data";
import { useStore, STATUS_LABEL, KIND_LABEL, type PlaceKind, type Status } from "@/lib/store";

const STATUSES: Status[] = ["visited", "wish", "lived"];

type SubKind = Exclude<PlaceKind, "country">;

const CATEGORIES: { id: SubKind; label: string; icon: typeof Building2 }[] = [
  { id: "city", label: "Cities", icon: Building2 },
  { id: "region", label: "Regions", icon: MapPinned },
  { id: "attraction", label: "Attractions", icon: Landmark },
];

const statusColor = (s: Status) =>
  s === "visited" ? "var(--map-visited)" : s === "wish" ? "var(--map-wish)" : "var(--map-lived)";

export function CountrySheet({ code, onClose }: { code: string | null; onClose: () => void }) {
  const { tr, language } = useI18n();

  const { state, statusByCountry, setCountryStatus, addPlace, removePlace, isPreview } = useStore();
  const [tab, setTab] = useState<SubKind>("city");
  const [addStatus, setAddStatus] = useState<Status>("visited");
  const [q, setQ] = useState("");
  const [geo, setGeo] = useState<CountryGeo | null>(null);
  const [lastCode, setLastCode] = useState(code);
  const [expanded, setExpanded] = useState(false);
  const scrollPanel = useRef<HTMLDivElement>(null);
  const touchStart = useRef<number | null>(null);
  const atTop = (target: EventTarget) => {
    let element = target as HTMLElement;
    while (element && scrollPanel.current?.contains(element)) {
      if (element.scrollTop > 1) return false;
      if (element === scrollPanel.current) break;
      element = element.parentElement!;
    }
    return true;
  };
  useEffect(() => {
    if (!code) return;
    setExpanded(false);
    scrollPanel.current?.scrollTo({ top: 0 });
  }, [code]);

  // Reset the picker whenever another country is opened.
  useEffect(() => {
    if (!code) return;
    setLastCode(code);
    setTab("city");
    setQ("");
    setGeo(null);
    let cancelled = false;
    loadCountryGeo(code).then((g) => {
      if (!cancelled) setGeo(g);
    });
    return () => {
      cancelled = true;
    };
  }, [code]);

  // Keep the last country's content mounted while Radix plays the exit animation.
  const displayCode = code ?? lastCode;
  const c = displayCode ? BY_CCA2[displayCode] : null;

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

  // Non-modal + no overlay: the map stays fully visible and interactive
  // while the menu is open.
  return (
    <Sheet open={!!code} onOpenChange={(o) => !o && onClose()} modal={false}>
      <SheetContent
        side="bottom"
        hideOverlay
        onInteractOutside={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        aria-describedby={undefined}
        className="country-menu overflow-visible rounded-t-2xl p-0 sm:mx-auto sm:max-w-xl"
      >
        <div
          ref={scrollPanel}
          data-expanded={expanded}
          className="country-menu-scroll max-h-[calc(100dvh-6rem)] overflow-y-auto overscroll-contain px-4 pt-6 pb-8"
          onWheel={(event) => {
            if (event.deltaY > 0) setExpanded(true);
            else if (event.deltaY < 0 && atTop(event.target)) setExpanded(false);
          }}
          onTouchStart={(event) => {
            touchStart.current = event.touches[0].clientY;
          }}
          onTouchMove={(event) => {
            const delta =
              event.touches[0].clientY - (touchStart.current ?? event.touches[0].clientY);
            if (delta < -20) setExpanded(true);
            if (delta > 30 && atTop(event.target)) {
              setExpanded(false);
              touchStart.current = null;
            }
          }}
          onKeyDown={(event) => {
            if (["ArrowDown", "PageDown"].includes(event.key)) setExpanded(true);
            if (event.key === "ArrowUp" && atTop(event.target)) setExpanded(false);
          }}
        >
          <button
            type="button"
            aria-label={tr(expanded ? "Collapse" : "Expand")}
            aria-expanded={expanded}
            onClick={() => {
              setExpanded(!expanded);
              scrollPanel.current?.scrollTo({ top: 0 });
            }}
            className="mx-auto mb-3 flex h-4 w-16 items-center justify-center"
          >
            <span className="h-1 w-10 rounded-full bg-muted-foreground/40" />
          </button>
          <SheetHeader className="px-0 pr-6">
            <SheetTitle className="flex items-center gap-2 text-2xl font-display">
              <CountryFlag code={c.cca2} /> {c.name}
            </SheetTitle>
            <p className="text-xs text-muted-foreground">
              {c.subregion} · {c.area.toLocaleString(language)} {" km²"}
            </p>
          </SheetHeader>

          <div className="mt-2 grid grid-cols-3 gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setCountryStatus(c.cca2, c.name, current === s ? null : s)}
                disabled={isPreview}
                className={`rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors ${
                  current === s
                    ? "border-transparent text-background"
                    : "border-border bg-card text-foreground hover:bg-accent"
                }`}
                style={current === s ? { background: statusColor(s) } : undefined}
              >
                {tr(STATUS_LABEL[s])}
              </button>
            ))}
          </div>

          <div className="country-places" data-expanded={true}>
            <div className="min-h-0 overflow-hidden">
              <div className="mt-4 space-y-3">
                <span className="label-caps">{tr("Places in {0}", { 0: c.name })}</span>

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
                      {tr(cat.label)}
                    </button>
                  ))}
                </div>

                <div
                  className="flex items-center gap-2"
                  style={isPreview ? { display: "none" } : undefined}
                >
                  <span className="shrink-0 text-xs text-muted-foreground">{tr("Add as")}</span>
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
                        {tr(STATUS_LABEL[s])}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={tr("Search places in {0}", { 0: c.name })}
                    className="h-9 pl-9"
                  />
                </div>

                {!geo ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    {tr("Loading places…")}
                  </p>
                ) : entries.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    {q
                      ? tr("No match for “{0}”.", { 0: q })
                      : tr("No places listed for {0} yet.", { 0: c.name })}
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
                          disabled={isPreview}
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
                              {tr(STATUS_LABEL[added.status])}
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
                              {tr(KIND_LABEL[p.kind])} · {tr(STATUS_LABEL[p.status])}
                              {p.date ? ` · ${p.date}` : ""}
                            </div>
                            {p.notes && (
                              <p className="mt-1 text-xs text-muted-foreground">{p.notes}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            aria-label={tr("Remove {0}", { 0: p.name })}
                            onClick={() => removePlace(p.id)}
                            style={isPreview ? { display: "none" } : undefined}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
