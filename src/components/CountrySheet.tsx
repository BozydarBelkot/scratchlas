import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ReferenceCard } from "@/components/ReferenceCard";
import { MediaStrip } from "@/components/MediaStrip";
import { BY_CCA2 } from "@/lib/countries";
import { useStore, STATUS_LABEL, type PlaceKind, type Status } from "@/lib/store";

const STATUSES: Status[] = ["visited", "wish", "lived"];
const KINDS: { value: PlaceKind; label: string }[] = [
  { value: "region", label: "State / region" },
  { value: "city", label: "City" },
  { value: "landmark", label: "Landmark / POI" },
];

export function CountrySheet({ code, onClose }: { code: string | null; onClose: () => void }) {
  const { state, statusByCountry, setCountryStatus, addPlace, removePlace } = useStore();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    name: "",
    kind: "city" as PlaceKind,
    status: "visited" as Status,
    lat: "",
    lng: "",
    date: "",
    tripId: "",
    notes: "",
  });

  const c = code ? BY_CCA2[code] : null;
  if (!c) return <Sheet open={false} onOpenChange={onClose} />;

  const current = statusByCountry[c.cca2];
  const sub = state.places.filter((p) => p.country === c.cca2 && p.kind !== "country");
  const countryPlace = state.places.find((p) => p.country === c.cca2 && p.kind === "country");

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
              style={
                current === s
                  ? {
                      background:
                        s === "visited"
                          ? "var(--map-visited)"
                          : s === "wish"
                            ? "var(--map-wish)"
                            : "var(--map-lived)",
                    }
                  : undefined
              }
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

        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="label-caps">Places in {c.name}</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => setAdding((v) => !v)}
            >
              {adding ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
              {adding ? "Cancel" : "Add"}
            </Button>
          </div>

          {adding && (
            <form
              className="card-surface space-y-2 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!form.name.trim()) return;
                addPlace({
                  name: form.name.trim(),
                  kind: form.kind,
                  country: c.cca2,
                  status: form.status,
                  lat: form.lat ? Number(form.lat) : c.latlng[0],
                  lng: form.lng ? Number(form.lng) : c.latlng[1],
                  date: form.date || undefined,
                  tripId: form.tripId || undefined,
                  notes: form.notes || undefined,
                });
                setForm({ ...form, name: "", lat: "", lng: "", notes: "" });
                setAdding(false);
              }}
            >
              <Input
                placeholder="Place name (e.g. Kyoto, Machu Picchu)"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={form.kind}
                  onValueChange={(v) => setForm({ ...form, kind: v as PlaceKind })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KINDS.map((k) => (
                      <SelectItem key={k.value} value={k.value}>
                        {k.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as Status })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Latitude"
                  inputMode="decimal"
                  value={form.lat}
                  onChange={(e) => setForm({ ...form, lat: e.target.value })}
                />
                <Input
                  placeholder="Longitude"
                  inputMode="decimal"
                  value={form.lng}
                  onChange={(e) => setForm({ ...form, lng: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
                <Select
                  value={form.tripId || "none"}
                  onValueChange={(v) => setForm({ ...form, tripId: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Trip" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No trip</SelectItem>
                    {state.trips.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                placeholder="Notes"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
              <Button type="submit" className="w-full">
                Save place
              </Button>
            </form>
          )}

          {sub.length === 0 && !adding && (
            <p className="text-xs text-muted-foreground">
              Nothing pinned yet inside this country.
            </p>
          )}

          {sub.map((p) => (
            <div key={p.id} className="card-surface space-y-2 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.kind} · {STATUS_LABEL[p.status]}
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

        <div className="mt-5 space-y-2">
          <span className="label-caps">Offline country guide</span>
          <ReferenceCard c={c} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
