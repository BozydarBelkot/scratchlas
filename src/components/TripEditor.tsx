import { useI18n } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { COUNTRIES, BY_CCA2 } from "@/lib/countries";
import { loadCountryGeo, type CountryGeo } from "@/lib/geo-data";
import type { Trip, TripDestination, TripStop } from "@/lib/store";
import { CountryFlag } from "./CountryFlag";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

export const STOP_LABELS = { city: "City", region: "Region", attraction: "Attraction" };
function move<T>(items: T[], index: number, direction: number) {
  const next = [...items];
  [next[index], next[index + direction]] = [next[index + direction], next[index]];
  return next;
}

function OrderButtons({
  name,
  index,
  length,
  onMove,
  onRemove,
}: {
  name: string;
  index: number;
  length: number;
  onMove: (direction: number) => void;
  onRemove: () => void;
}) {
  const { tr } = useI18n();

  return (
    <div className="flex shrink-0 gap-1">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label={tr("Move up: {0}", { 0: name })}
        disabled={index === 0}
        onClick={() => onMove(-1)}
      >
        <ArrowUp className="size-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label={tr("Move down: {0}", { 0: name })}
        disabled={index === length - 1}
        onClick={() => onMove(1)}
      >
        <ArrowDown className="size-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label={tr("Remove from route: {0}", { 0: name })}
        onClick={onRemove}
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}

function DestinationEditor({
  destination,
  onChange,
}: {
  destination: TripDestination;
  onChange: (stops: TripStop[]) => void;
}) {
  const { tr } = useI18n();

  const [geo, setGeo] = useState<CountryGeo | null>(null);
  const [failed, setFailed] = useState(false);
  const [kind, setKind] = useState<TripStop["kind"]>("city");
  const [search, setSearch] = useState("");
  useEffect(() => {
    let cancelled = false;
    setGeo(null);
    setFailed(false);
    loadCountryGeo(destination.country)
      .then((data) => {
        if (!cancelled) setGeo(data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [destination.country]);
  const entries = geo
    ? kind === "city"
      ? geo.cities
      : kind === "region"
        ? geo.regions
        : geo.attractions
    : [];
  return (
    <div className="space-y-3 border-t border-border pt-3">
      <div role="group" aria-label={tr("Place type")} className="grid grid-cols-3 gap-1">
        {(["city", "region", "attraction"] as const).map((k) => (
          <Button
            type="button"
            key={k}
            variant={kind === k ? "default" : "outline"}
            aria-pressed={kind === k}
            onClick={() => {
              setKind(k);
              setSearch("");
            }}
          >
            {k === "city" ? tr("Cities") : k === "region" ? tr("Regions") : tr("Attractions")}
          </Button>
        ))}
      </div>
      <Input
        aria-label={tr("Search places: {0}", { 0: BY_CCA2[destination.country]?.name })}
        placeholder={tr("Search places…")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="max-h-44 overflow-y-auto rounded-lg border border-border">
        {!geo ? (
          <p className="p-3 text-sm text-muted-foreground">
            {failed ? tr("Could not load places.") : tr("Loading places…")}
          </p>
        ) : (
          <>
            {entries
              .filter((e) => e.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
              .map((entry) => {
                const index = destination.stops.findIndex(
                  (s) => s.kind === kind && s.name === entry.name,
                );
                return (
                  <label
                    key={entry.name}
                    className="flex cursor-pointer items-center gap-3 border-b border-border p-3 text-sm last:border-0 hover:bg-accent"
                  >
                    <input
                      type="checkbox"
                      aria-label={entry.name}
                      checked={index >= 0}
                      onChange={() =>
                        onChange(
                          index >= 0
                            ? destination.stops.filter((_, i) => i !== index)
                            : [...destination.stops, { ...entry, kind }],
                        )
                      }
                    />
                    <span className="flex-1">{entry.name}</span>
                    {index >= 0 && (
                      <span className="text-xs text-muted-foreground">#{index + 1}</span>
                    )}
                  </label>
                );
              })}
            {!entries.some((e) =>
              e.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
            ) && <p className="p-3 text-sm text-muted-foreground">{tr("No matching places.")}</p>}
          </>
        )}
      </div>
      <h4 className="text-sm font-medium">
        {tr("Stop order ({0})", { 0: destination.stops.length })}
      </h4>
      {destination.stops.length === 0 && (
        <p className="text-xs text-muted-foreground">
          {tr("Choose places above. You can also save just the country.")}
        </p>
      )}
      <ol className="space-y-1">
        {destination.stops.map((stop, index) => (
          <li
            key={`${stop.kind}:${stop.name}`}
            className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-2 py-1"
          >
            <div className="min-w-0 text-sm">
              <span className="mr-2 text-muted-foreground">{index + 1}.</span>
              {stop.name}
              <span className="block text-xs text-muted-foreground">
                {tr(STOP_LABELS[stop.kind])}
              </span>
            </div>
            <OrderButtons
              name={stop.name}
              index={index}
              length={destination.stops.length}
              onMove={(direction) => onChange(move(destination.stops, index, direction))}
              onRemove={() => onChange(destination.stops.filter((_, i) => i !== index))}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}

export function TripEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Trip;
  onSave: (trip: Omit<Trip, "id">) => void;
  onCancel: () => void;
}) {
  const { tr } = useI18n();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [start, setStart] = useState(initial?.start ?? "");
  const [end, setEnd] = useState(initial?.end ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [itinerary, setItinerary] = useState<TripDestination[]>(initial?.itinerary ?? []);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState(initial?.itinerary?.[0]?.country ?? "");
  const [error, setError] = useState("");
  return (
    <form
      className="card-surface space-y-5 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!itinerary.length) {
          setError("Choose at least one country.");
          return;
        }
        if (end && end < start) {
          setError("The end date cannot be before the start date.");
          return;
        }
        onSave({
          title: title.trim(),
          start,
          end: end || undefined,
          notes: notes.trim() || undefined,
          itinerary,
        });
      }}
    >
      <h3 className="font-display text-xl">{initial ? tr("Edit trip") : tr("New trip")}</h3>
      <label className="block space-y-1 text-sm">
        {tr("Trip name")}
        <Input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={tr("e.g. Summer in Europe")}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1 text-sm">
          {tr("Start date")}
          <Input required type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          {tr("End date (optional)")}
          <Input type="date" min={start} value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
      </div>
      <div className="space-y-2">
        <h4 className="font-medium">{tr("Trip countries")}</h4>
        <p className="text-xs text-muted-foreground">
          {tr("Select one or more countries. Use the arrows to order countries and places.")}
        </p>
        <Input
          aria-label={tr("Search trip countries")}
          placeholder={tr("Search countries…")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="grid max-h-48 grid-cols-1 gap-1.5 overflow-y-auto rounded-xl border border-border p-2 sm:grid-cols-2">
          {COUNTRIES.filter(
            (c) =>
              c.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()) ||
              c.cca2.toLowerCase() === search.toLowerCase(),
          ).map((c) => (
            <button
              key={c.cca2}
              type="button"
              aria-label={c.name}
              aria-pressed={itinerary.some((d) => d.country === c.cca2)}
              className={`flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${itinerary.some((d) => d.country === c.cca2) ? "border-primary bg-accent font-medium text-accent-foreground" : "border-transparent hover:border-border hover:bg-accent/60"}`}
              onClick={() => {
                if (itinerary.some((d) => d.country === c.cca2))
                  setItinerary(itinerary.filter((d) => d.country !== c.cca2));
                else {
                  setItinerary([...itinerary, { country: c.cca2, stops: [] }]);
                  setActive(c.cca2);
                  setError("");
                }
              }}
            >
              <CountryFlag code={c.cca2} className="h-5 w-7" />
              <span className="flex-1">{c.name}</span>
              {itinerary.some((d) => d.country === c.cca2) && (
                <span className="text-xs tabular-nums text-muted-foreground" aria-hidden="true">
                  {itinerary.findIndex((d) => d.country === c.cca2) + 1}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      <ol className="space-y-3">
        {itinerary.map((destination, index) => {
          const name = BY_CCA2[destination.country]?.name ?? destination.country;
          return (
            <li key={destination.country} className="space-y-3 rounded-xl border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  aria-expanded={active === destination.country}
                  onClick={() =>
                    setActive(active === destination.country ? "" : destination.country)
                  }
                  className="min-w-0 text-left text-sm font-medium"
                >
                  <span className="mr-2">{index + 1}.</span>
                  <CountryFlag code={destination.country} className="mr-2 h-4 w-6" />
                  {name}
                  <span className="block pt-1 text-xs text-muted-foreground">
                    {tr("Places: {0}", { 0: destination.stops.length })} ·{" "}
                    {active === destination.country ? tr("Collapse") : tr("Choose places")}
                  </span>
                </button>
                <OrderButtons
                  name={name}
                  index={index}
                  length={itinerary.length}
                  onMove={(direction) => setItinerary(move(itinerary, index, direction))}
                  onRemove={() => setItinerary(itinerary.filter((_, i) => i !== index))}
                />
              </div>
              {active === destination.country && (
                <DestinationEditor
                  destination={destination}
                  onChange={(stops) =>
                    setItinerary(
                      itinerary.map((d) =>
                        d.country === destination.country ? { ...d, stops } : d,
                      ),
                    )
                  }
                />
              )}
            </li>
          );
        })}
      </ol>
      <label className="block space-y-1 text-sm">
        {tr("Notes")}
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={tr("Plans, memories, useful information…")}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {tr(error)}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={!title.trim()}>
          {initial ? tr("Save changes") : tr("Create trip")}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {tr("Cancel")}
        </Button>
      </div>
    </form>
  );
}
