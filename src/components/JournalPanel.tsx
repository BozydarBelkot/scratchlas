import { useI18n } from "@/lib/i18n";
import { TripEditor, STOP_LABELS } from "./TripEditor";
import { CountryFlag } from "@/components/CountryFlag";
import { useState } from "react";
import { CalendarDays, Plus, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BY_CCA2 } from "@/lib/countries";
import { useStore, STATUS_LABEL, type Place } from "@/lib/store";

function PlaceRow({ p }: { p: Place }) {
  const { tr, language } = useI18n();

  const c = BY_CCA2[p.country];
  return (
    <div className="card-surface space-y-2 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-sm font-medium">
          <CountryFlag code={p.country} className="mr-2" />
          {p.name}
        </div>
        <span className="label-caps shrink-0">{tr(STATUS_LABEL[p.status])}</span>
      </div>
      <div className="text-xs text-muted-foreground">
        {c?.name}
        {p.date ? ` · ${new Date(p.date).toLocaleDateString(language)}` : ""}
      </div>
      {p.notes && <p className="text-xs text-muted-foreground">{p.notes}</p>}
    </div>
  );
}

export function JournalPanel() {
  const { tr, language } = useI18n();

  const { state, addTrip, removeTrip, updateTrip, setCountryStatus, statusByCountry, isPreview } =
    useStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const trips = [...state.trips].sort((a, b) => (a.start < b.start ? 1 : -1));
  const untripped = state.places
    .filter((p) => !p.tripId)
    .sort((a, b) => ((a.date ?? "") < (b.date ?? "") ? 1 : -1));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display">{tr("Travel journal")}</h2>
        <Button
          style={isPreview ? { display: "none" } : undefined}
          size="sm"
          variant="secondary"
          className="gap-1"
          onClick={() => {
            setEditing(null);
            setOpen((v) => !v);
          }}
        >
          <Plus className="size-4" /> {tr("Trip")}
        </Button>
      </div>

      {open && (
        <TripEditor
          key={editing ?? "new"}
          initial={state.trips.find((t) => t.id === editing)}
          onCancel={() => {
            setOpen(false);
            setEditing(null);
          }}
          onSave={(trip) => {
            for (const destination of trip.itinerary ?? []) {
              const country = BY_CCA2[destination.country];
              if (country && statusByCountry[destination.country] !== "lived") {
                setCountryStatus(destination.country, country.name, "visited");
              }
            }
            if (editing) updateTrip(editing, trip);
            else addTrip(trip);
            setOpen(false);
            setEditing(null);
          }}
        />
      )}
      {trips.length === 0 && untripped.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {tr("Create a trip and choose countries and places to build your timeline.")}
        </p>
      )}

      <div className="relative space-y-6 border-l border-border pl-4">
        {trips.map((t) => {
          const places = state.places.filter((p) => p.tripId === t.id);
          return (
            <section key={t.id} className="relative rise-in">
              <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-visited" />
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-display leading-tight">{t.title}</h3>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarDays className="size-3" />
                    {new Date(t.start).toLocaleDateString(language)}
                    {t.end ? ` – ${new Date(t.end).toLocaleDateString(language)}` : ""}
                    {tr("· Countries: {0} · Planned places: {1}", {
                      0: (t.itinerary ?? []).length,
                      1: (t.itinerary ?? []).reduce((sum, d) => sum + d.stops.length, 0),
                    })}
                  </p>
                </div>
                <Button
                  style={isPreview ? { display: "none" } : undefined}
                  size="icon"
                  variant="ghost"
                  aria-label={tr("Edit {0}", { 0: t.title })}
                  onClick={() => {
                    setEditing(t.id);
                    setOpen(true);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  <Pencil className="size-4" />
                </Button>
                <button
                  style={isPreview ? { display: "none" } : undefined}
                  type="button"
                  aria-label={tr("Delete {0}", { 0: t.title })}
                  onClick={() => removeTrip(t.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              {t.notes && <p className="mt-1 text-sm text-muted-foreground">{t.notes}</p>}
              {!!t.itinerary?.length && (
                <ol className="mt-3 space-y-3">
                  {t.itinerary.map((destination, index) => (
                    <li key={destination.country} className="card-surface p-3">
                      <h4 className="text-sm font-medium">
                        <span className="mr-2 text-muted-foreground">{index + 1}.</span>
                        <CountryFlag code={destination.country} className="mr-2 h-4 w-6" />
                        {BY_CCA2[destination.country]?.name ?? destination.country}
                      </h4>
                      <ol className="mt-2 space-y-1 border-l border-border pl-3">
                        {destination.stops.map((stop, i) => (
                          <li key={`${stop.kind}:${stop.name}`} className="text-sm">
                            <span className="mr-2 text-muted-foreground">
                              {index + 1}.{i + 1}
                            </span>
                            {stop.name}
                            <span className="ml-2 text-xs text-muted-foreground">
                              {tr(STOP_LABELS[stop.kind])}
                            </span>
                          </li>
                        ))}
                      </ol>
                      {!destination.stops.length && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {tr("No additional stops")}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
              <div className="mt-3 space-y-2">
                {places.length === 0 && !t.itinerary?.length ? (
                  <p className="text-xs text-muted-foreground">
                    {tr("Places assigned to this trip on the map will appear here.")}
                  </p>
                ) : (
                  places.map((p) => <PlaceRow key={p.id} p={p} />)
                )}
              </div>
            </section>
          );
        })}

        {untripped.length > 0 && (
          <section className="relative">
            <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-muted-foreground" />
            <h3 className="text-lg font-display leading-tight">{tr("Unsorted marks")}</h3>
            <div className="mt-3 space-y-2">
              {untripped.map((p) => (
                <PlaceRow key={p.id} p={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
