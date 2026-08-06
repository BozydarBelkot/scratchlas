import { useState } from "react";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BY_CCA2 } from "@/lib/countries";
import { BY_CCA2 } from "@/lib/countries";
import { useStore, STATUS_LABEL, type Place } from "@/lib/store";

function PlaceRow({ p }: { p: Place }) {
  const c = BY_CCA2[p.country];
  return (
    <div className="card-surface space-y-2 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-sm font-medium">
          <span aria-hidden className="mr-1">
            {c?.flag}
          </span>
          {p.name}
        </div>
        <span className="label-caps shrink-0">{STATUS_LABEL[p.status]}</span>
      </div>
      <div className="text-xs text-muted-foreground">
        {c?.name}
        {p.date ? ` · ${new Date(p.date).toLocaleDateString()}` : ""}
      </div>
      {p.notes && <p className="text-xs text-muted-foreground">{p.notes}</p>}
      <MediaStrip place={p} />
    </div>
  );
}

export function JournalPanel() {
  const { state, addTrip, removeTrip } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", start: "", end: "", notes: "" });

  const trips = [...state.trips].sort((a, b) => (a.start < b.start ? 1 : -1));
  const untripped = state.places
    .filter((p) => !p.tripId)
    .sort((a, b) => (a.date ?? "") < (b.date ?? "") ? 1 : -1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display">Travel journal</h2>
        <Button size="sm" variant="secondary" className="gap-1" onClick={() => setOpen((v) => !v)}>
          <Plus className="size-4" /> Trip
        </Button>
      </div>

      {open && (
        <form
          className="card-surface space-y-2 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.title.trim() || !form.start) return;
            addTrip({
              title: form.title.trim(),
              start: form.start,
              end: form.end || undefined,
              notes: form.notes || undefined,
            });
            setForm({ title: "", start: "", end: "", notes: "" });
            setOpen(false);
          }}
        >
          <Input
            placeholder="Trip title (e.g. Southeast Asia loop)"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              value={form.start}
              onChange={(e) => setForm({ ...form, start: e.target.value })}
            />
            <Input
              type="date"
              value={form.end}
              onChange={(e) => setForm({ ...form, end: e.target.value })}
            />
          </div>
          <Textarea
            rows={2}
            placeholder="What was this trip about?"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <Button type="submit" className="w-full">
            Create trip
          </Button>
        </form>
      )}

      {trips.length === 0 && untripped.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Create a trip, then attach places from the map to build your timeline.
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
                    {new Date(t.start).toLocaleDateString()}
                    {t.end ? ` – ${new Date(t.end).toLocaleDateString()}` : ""}
                    {` · ${places.length} place${places.length === 1 ? "" : "s"}`}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Delete ${t.title}`}
                  onClick={() => removeTrip(t.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              {t.notes && <p className="mt-1 text-sm text-muted-foreground">{t.notes}</p>}
              <div className="mt-3 space-y-2">
                {places.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No places attached yet — assign this trip when adding a place on the map.
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
            <h3 className="text-lg font-display leading-tight">Unsorted marks</h3>
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
