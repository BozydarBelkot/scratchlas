import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { BY_CCA2 } from "@/lib/countries";
import { useStore, STATUS_LABEL, type Status } from "@/lib/store";

const FILTERS: { id: "all" | Status; label: string }[] = [
  { id: "all", label: "All" },
  { id: "visited", label: STATUS_LABEL.visited },
  { id: "lived", label: STATUS_LABEL.lived },
  { id: "wish", label: STATUS_LABEL.wish },
];

const colorFor = (s: Status) =>
  s === "visited" ? "var(--map-visited)" : s === "lived" ? "var(--map-lived)" : "var(--map-wish)";

export function CountriesPanel({ onSelect }: { onSelect: (code: string) => void }) {
  const { state, statusByCountry } = useStore();
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return Object.entries(statusByCountry)
      .map(([code, status]) => ({ code, status, c: BY_CCA2[code] }))
      .filter((r) => r.c)
      .filter((r) => (filter === "all" ? true : r.status === filter))
      .filter((r) => (s ? r.c.name.toLowerCase().includes(s) : true))
      .sort((a, b) => a.c.name.localeCompare(b.c.name));
  }, [statusByCountry, filter, q]);

  const placeCount = (code: string) =>
    state.places.filter((p) => p.country === code && p.kind !== "country").length;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-display">My countries</h2>

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
            {f.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search marked countries"
          className="h-9 pl-9"
        />
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing here yet — tap a country on the map to mark it.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map(({ code, status, c }) => (
            <button
              key={code}
              type="button"
              onClick={() => onSelect(code)}
              className="card-surface flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-accent"
            >
              <span aria-hidden className="text-2xl">
                {c.flag}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{c.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {c.subregion} · {placeCount(code)} place{placeCount(code) === 1 ? "" : "s"}
                </span>
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-medium text-background"
                style={{ background: colorFor(status) }}
              >
                {STATUS_LABEL[status]}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
