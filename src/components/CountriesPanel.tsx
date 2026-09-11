import { useI18n } from "@/lib/i18n";
import { CountryFlag } from "@/components/CountryFlag";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { BY_CCA2 } from "@/lib/countries";
import { useStore, STATUS_LABEL, type Status } from "@/lib/store";

const FILTERS: { id: "all" | Status; label: string }[] = [
  { id: "all", label: "All" },
  { id: "visited", label: STATUS_LABEL.visited },
  { id: "lived", label: STATUS_LABEL.lived },
];

const colorFor = (s: Status) =>
  s === "visited" ? "var(--map-visited)" : s === "lived" ? "var(--map-lived)" : "var(--map-wish)";

function CountryDetails({ code }: { code: string }) {
  const { tr } = useI18n();

  const { state } = useStore();
  const places = state.places.filter((p) => p.country === code && p.kind !== "country");
  const trips = state.trips.filter(
    (t) => t.itinerary?.some((d) => d.country === code) || places.some((p) => p.tripId === t.id),
  );
  return (
    <div className="card-surface mt-1 space-y-4 p-4">
      <h3 className="font-medium">{tr("Marked places")}</h3>
      {!places.length && (
        <p className="text-sm text-muted-foreground">
          {tr("No cities, regions or attractions marked in this country yet.")}
        </p>
      )}
      {(["city", "region", "attraction"] as const).map((kind) => {
        const group = places
          .filter((p) => p.kind === kind)
          .sort((a, b) => a.name.localeCompare(b.name));
        return (
          group.length > 0 && (
            <div key={kind}>
              <h4 className="mb-2 text-xs font-medium text-muted-foreground">
                {kind === "city"
                  ? tr("Cities")
                  : kind === "region"
                    ? tr("Regions")
                    : tr("Attractions")}{" "}
                ({group.length})
              </h4>
              <ul className="divide-y divide-border">
                {group.map((p) => (
                  <li key={p.id} className="py-2 text-sm">
                    <div className="flex justify-between gap-2">
                      <span>{p.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {tr(STATUS_LABEL[p.status])}
                      </span>
                    </div>
                    {p.notes && <p className="text-xs text-muted-foreground">{p.notes}</p>}
                    {p.date && <p className="text-xs text-muted-foreground">{p.date}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )
        );
      })}
      {!!trips.length && (
        <div className="space-y-3">
          <h3 className="font-medium">{tr("Trips in this country")}</h3>
          {trips.map((trip) => (
            <div key={trip.id} className="rounded-lg bg-muted/40 p-3">
              <p className="text-sm font-medium">{trip.title}</p>
              <p className="text-xs text-muted-foreground">
                {trip.start}
                {trip.end ? ` – ${trip.end}` : ""}
              </p>
              <ol className="mt-2 space-y-1">
                {trip.itinerary
                  ?.find((d) => d.country === code)
                  ?.stops.map((stop, index) => (
                    <li key={`${stop.kind}:${stop.name}`} className="text-sm">
                      {index + 1}. {stop.name}{" "}
                      <span className="text-xs text-muted-foreground">
                        (
                        {stop.kind === "city"
                          ? tr("City")
                          : stop.kind === "region"
                            ? tr("Region")
                            : tr("Attraction")}
                        )
                      </span>
                    </li>
                  ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CountriesPanel() {
  const { tr } = useI18n();

  const { state, statusByCountry } = useStore();
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return Object.entries(statusByCountry)
      .map(([code, status]) => ({ code, status, c: BY_CCA2[code] }))
      .filter((r) => r.c && (r.status === "visited" || r.status === "lived"))
      .filter((r) => (filter === "all" ? true : r.status === filter))
      .filter((r) => (s ? r.c.name.toLowerCase().includes(s) : true))
      .sort((a, b) => a.c.name.localeCompare(b.c.name));
  }, [statusByCountry, filter, q]);

  const placeCount = (code: string) =>
    state.places.filter((p) => p.country === code && p.kind !== "country").length;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-display">{tr("My countries")}</h2>

      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f.id
                ? "border-transparent bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-accent"
            }`}
          >
            {tr(f.label)}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={tr("Search marked countries")}
          className="h-9 pl-9"
        />
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {tr("Nothing here yet — tap a country on the map to mark it.")}
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map(({ code, status, c }) => (
            <section key={code}>
              <button
                type="button"
                aria-expanded={expanded === code}
                onClick={() => setExpanded(expanded === code ? null : code)}
                className="card-surface flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-accent"
              >
                <CountryFlag code={c.cca2} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{c.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {c.subregion} · {tr("Places: {0}", { 0: placeCount(code) })}
                  </span>
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-medium text-background"
                  style={{ background: colorFor(status) }}
                >
                  {tr(STATUS_LABEL[status])}
                </span>
              </button>
              {expanded === code && <CountryDetails code={code} />}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
