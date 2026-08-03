import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type Status = "visited" | "wish" | "lived";
export type PlaceKind = "country" | "region" | "city" | "attraction";

// Rows saved before the kinds were split may still say "landmark".
const normalizeKind = (k: string): PlaceKind => (k === "landmark" ? "attraction" : (k as PlaceKind));

export interface Media {
  id: string;
  url: string; // data URL
  kind: "photo" | "video";
  caption?: string;
}

export interface Place {
  id: string;
  name: string;
  kind: PlaceKind;
  country: string; // cca2
  status: Status;
  lat?: number;
  lng?: number;
  date?: string;
  tripId?: string;
  notes?: string;
  media: Media[];
  createdAt: number;
}

export interface Trip {
  id: string;
  title: string;
  start: string;
  end?: string;
  notes?: string;
}

export type MapTheme = "atlas" | "ocean" | "forest" | "mono";
export type Mode = "light" | "dark";

export interface AppState {
  places: Place[];
  trips: Trip[];
  mode: Mode;
  mapTheme: MapTheme;
}

const EMPTY: AppState = { places: [], trips: [], mode: "light", mapTheme: "atlas" };
const KEY = "scratchmap.v1";

export const uid = () => Math.random().toString(36).slice(2, 10);

// Row shapes mirror the cloud tables (snake_case columns).
interface PlaceRow {
  id: string;
  user_id: string;
  name: string;
  kind: PlaceKind;
  country: string;
  status: Status;
  lat: number | null;
  lng: number | null;
  date: string | null;
  trip_id: string | null;
  notes: string | null;
  created_at: number;
}
interface TripRow {
  id: string;
  user_id: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
}
interface MediaRow {
  id: string;
  place_id: string;
  url: string;
  kind: "photo" | "video";
  caption: string | null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// The generated Database type has no table definitions yet; go through a loose
// query builder and validate shapes in the row mappers below.
const from = (table: string): any => (supabase as any).from(table);
/* eslint-enable @typescript-eslint/no-explicit-any */

const placeFromRow = (r: PlaceRow): Place => ({
  id: r.id,
  name: r.name,
  kind: normalizeKind(r.kind),
  country: r.country,
  status: r.status,
  lat: r.lat ?? undefined,
  lng: r.lng ?? undefined,
  date: r.date ?? undefined,
  tripId: r.trip_id ?? undefined,
  notes: r.notes ?? undefined,
  media: [],
  createdAt: Number(r.created_at),
});

const placeToRow = (p: Place, userId: string) => ({
  id: p.id,
  user_id: userId,
  name: p.name,
  kind: p.kind,
  country: p.country,
  status: p.status,
  lat: p.lat ?? null,
  lng: p.lng ?? null,
  date: p.date ?? null,
  trip_id: p.tripId ?? null,
  notes: p.notes ?? null,
  created_at: p.createdAt,
});

const tripFromRow = (r: TripRow): Trip => ({
  id: r.id,
  title: r.title,
  start: r.start_date ?? "",
  end: r.end_date ?? undefined,
  notes: r.notes ?? undefined,
});

const tripToRow = (t: Trip, userId: string) => ({
  id: t.id,
  user_id: userId,
  title: t.title,
  start_date: t.start || null,
  end_date: t.end ?? null,
  notes: t.notes ?? null,
});

const logErr =
  (what: string) =>
  (r: { error?: { message: string } | null } | null) => {
    if (r?.error) console.error(`[cloud sync] ${what}:`, r.error.message);
  };

function loadLocal(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = { ...EMPTY, ...JSON.parse(raw) } as AppState;
      parsed.places = parsed.places.map((p) => ({ ...p, kind: normalizeKind(p.kind) }));
      return parsed;
    }
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    return { ...EMPTY, mode: prefersDark ? "dark" : "light" };
  } catch {
    return EMPTY;
  }
}

interface Ctx {
  state: AppState;
  ready: boolean;
  user: User | null | undefined; // undefined = session still resolving
  signOut: () => Promise<void>;
  setCountryStatus: (cca2: string, name: string, status: Status | null) => void;
  addPlace: (p: Omit<Place, "id" | "createdAt" | "media">) => Place;
  updatePlace: (id: string, patch: Partial<Place>) => void;
  removePlace: (id: string) => void;
  addMedia: (placeId: string, media: Media) => void;
  removeMedia: (placeId: string, mediaId: string) => void;
  addTrip: (t: Omit<Trip, "id">) => Trip;
  removeTrip: (id: string) => void;
  setMode: (m: Mode) => void;
  setMapTheme: (t: MapTheme) => void;
  statusByCountry: Record<string, Status>;
  justMarked: string | null;
}

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(EMPTY);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [justMarked, setJustMarked] = useState<string | null>(null);
  const userRef = useRef<User | null>(null);
  userRef.current = user ?? null;

  // Track the auth session (fires immediately with the current session).
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user ?? null;
      setUser((prev) => {
        if (prev === undefined) return next;
        // ignore token refreshes for the same user so data isn't refetched
        return (prev?.id ?? null) === (next?.id ?? null) ? prev : next;
      });
    });
    return () => subscription.unsubscribe();
  }, []);

  // Hydrate data once auth resolves, and whenever the signed-in user changes.
  useEffect(() => {
    if (user === undefined) return;
    let cancelled = false;

    if (!user) {
      setState((s) => ({ ...s, places: [], trips: [] }));
      setReady(true);
      return;
    }

    setReady(false);
    (async () => {
      const [placesRes, tripsRes, mediaRes] = await Promise.all([
        from("places").select("*").order("created_at"),
        from("trips").select("*").order("created_at"),
        from("place_media").select("*").order("created_at"),
      ]);
      if (cancelled) return;
      if (placesRes.error || tripsRes.error || mediaRes.error) {
        console.error(
          "[cloud sync] load failed:",
          placesRes.error ?? tripsRes.error ?? mediaRes.error,
        );
        setReady(true);
        return;
      }

      const places = ((placesRes.data ?? []) as PlaceRow[]).map(placeFromRow);
      for (const m of (mediaRes.data ?? []) as MediaRow[]) {
        const pl = places.find((p) => p.id === m.place_id);
        pl?.media.push({ id: m.id, url: m.url, kind: m.kind, caption: m.caption ?? undefined });
      }
      const trips = ((tripsRes.data ?? []) as TripRow[]).map(tripFromRow);

      // One-time migration: carry pre-account local data into the new account.
      const local = loadLocal();
      const migratedKey = `${KEY}.migrated.${user.id}`;
      const hasCloudData = places.length > 0 || trips.length > 0;
      const hasLocalData = local.places.length > 0 || local.trips.length > 0;
      if (!hasCloudData && hasLocalData && localStorage.getItem(migratedKey) !== "1") {
        try {
          if (local.trips.length)
            await from("trips").insert(local.trips.map((t) => tripToRow(t, user.id)));
          if (local.places.length)
            await from("places").insert(local.places.map((p) => placeToRow(p, user.id)));
          const media = local.places.flatMap((p) =>
            p.media.map((m) => ({
              id: m.id,
              place_id: p.id,
              url: m.url,
              kind: m.kind,
              caption: m.caption ?? null,
            })),
          );
          if (media.length) await from("place_media").insert(media);
          localStorage.setItem(migratedKey, "1");
        } catch (e) {
          console.error("[cloud sync] local data migration failed:", e);
        }
        if (!cancelled) setState(local);
      } else if (!cancelled) {
        setState((s) => ({ ...s, places, trips }));
      }
      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Local cache so the map opens instantly and works offline.
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* quota */
    }
  }, [state, ready]);

  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    root.classList.toggle("dark", state.mode === "dark");
    root.dataset.maptheme = state.mapTheme;
  }, [state.mode, state.mapTheme, ready]);

  const value = useMemo<Ctx>(() => {
    const statusByCountry: Record<string, Status> = {};
    for (const p of state.places) {
      if (p.kind === "country") statusByCountry[p.country] = p.status;
    }

    return {
      state,
      ready,
      user,
      signOut: async () => {
        // clear the local cache first so another account can't inherit it
        try {
          const cached = loadLocal();
          localStorage.setItem(KEY, JSON.stringify({ ...cached, places: [], trips: [] }));
        } catch {
          /* ignore */
        }
        await supabase.auth.signOut();
      },
      statusByCountry,
      justMarked,
      setCountryStatus: (cca2, name, status) => {
        const existing = state.places.find((p) => p.kind === "country" && p.country === cca2);
        const id = existing?.id ?? uid();
        const createdAt = existing?.createdAt ?? Date.now();
        setState((s) => {
          const rest = s.places.filter((p) => !(p.kind === "country" && p.country === cca2));
          if (!status) return { ...s, places: rest };
          return {
            ...s,
            places: [
              ...rest,
              {
                id,
                name,
                kind: "country",
                country: cca2,
                status,
                media: existing?.media ?? [],
                notes: existing?.notes,
                date: existing?.date,
                tripId: existing?.tripId,
                createdAt,
              },
            ],
          };
        });
        const u = userRef.current;
        if (u) {
          if (!status) {
            from("places").delete().eq("id", id).then(logErr("remove country mark"));
          } else {
            from("places")
              .upsert(
                placeToRow(
                  {
                    id,
                    name,
                    kind: "country",
                    country: cca2,
                    status,
                    media: [],
                    notes: existing?.notes,
                    date: existing?.date,
                    tripId: existing?.tripId,
                    createdAt,
                  },
                  u.id,
                ),
              )
              .then(logErr("save country mark"));
          }
        }
        if (status) {
          setJustMarked(cca2);
          window.setTimeout(() => setJustMarked(null), 900);
        }
      },
      addPlace: (p) => {
        const place: Place = { ...p, id: uid(), media: [], createdAt: Date.now() };
        setState((s) => ({ ...s, places: [...s.places, place] }));
        const u = userRef.current;
        if (u) from("places").insert(placeToRow(place, u.id)).then(logErr("add place"));
        return place;
      },
      updatePlace: (id, patch) => {
        setState((s) => ({
          ...s,
          places: s.places.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        }));
        const u = userRef.current;
        const base = state.places.find((p) => p.id === id);
        if (u && base)
          from("places")
            .upsert(placeToRow({ ...base, ...patch }, u.id))
            .then(logErr("update place"));
      },
      removePlace: (id) => {
        setState((s) => ({ ...s, places: s.places.filter((p) => p.id !== id) }));
        const u = userRef.current;
        if (u) from("places").delete().eq("id", id).then(logErr("remove place"));
      },
      addMedia: (placeId, media) => {
        setState((s) => ({
          ...s,
          places: s.places.map((p) =>
            p.id === placeId ? { ...p, media: [...p.media, media] } : p,
          ),
        }));
        const u = userRef.current;
        if (u)
          from("place_media")
            .insert({
              id: media.id,
              place_id: placeId,
              url: media.url,
              kind: media.kind,
              caption: media.caption ?? null,
            })
            .then(logErr("add media"));
      },
      removeMedia: (placeId, mediaId) => {
        setState((s) => ({
          ...s,
          places: s.places.map((p) =>
            p.id === placeId ? { ...p, media: p.media.filter((m) => m.id !== mediaId) } : p,
          ),
        }));
        const u = userRef.current;
        if (u) from("place_media").delete().eq("id", mediaId).then(logErr("remove media"));
      },
      addTrip: (t) => {
        const trip: Trip = { ...t, id: uid() };
        setState((s) => ({ ...s, trips: [...s.trips, trip] }));
        const u = userRef.current;
        if (u) from("trips").insert(tripToRow(trip, u.id)).then(logErr("add trip"));
        return trip;
      },
      removeTrip: (id) => {
        setState((s) => ({
          ...s,
          trips: s.trips.filter((t) => t.id !== id),
          places: s.places.map((p) => (p.tripId === id ? { ...p, tripId: undefined } : p)),
        }));
        const u = userRef.current;
        if (u) {
          from("places").update({ trip_id: null }).eq("trip_id", id).then(logErr("unlink trip"));
          from("trips").delete().eq("id", id).then(logErr("remove trip"));
        }
      },
      setMode: (mode) => setState((s) => ({ ...s, mode })),
      setMapTheme: (mapTheme) => setState((s) => ({ ...s, mapTheme })),
    };
  }, [state, ready, user, justMarked]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

export const STATUS_LABEL: Record<Status, string> = {
  visited: "Visited",
  wish: "Wish list",
  lived: "Lived here",
};

export const KIND_LABEL: Record<PlaceKind, string> = {
  country: "Country",
  region: "Region",
  city: "City",
  attraction: "Attraction",
};
