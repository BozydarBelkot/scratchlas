import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Status = "visited" | "wish" | "lived";
export type PlaceKind = "country" | "region" | "city" | "landmark";

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

interface Ctx {
  state: AppState;
  ready: boolean;
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
  const [justMarked, setJustMarked] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState({ ...EMPTY, ...JSON.parse(raw) });
      else {
        const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
        setState({ ...EMPTY, mode: prefersDark ? "dark" : "light" });
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

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
      statusByCountry,
      justMarked,
      setCountryStatus: (cca2, name, status) => {
        setState((s) => {
          const rest = s.places.filter((p) => !(p.kind === "country" && p.country === cca2));
          if (!status) return { ...s, places: rest };
          const existing = s.places.find((p) => p.kind === "country" && p.country === cca2);
          return {
            ...s,
            places: [
              ...rest,
              {
                id: existing?.id ?? uid(),
                name,
                kind: "country",
                country: cca2,
                status,
                media: existing?.media ?? [],
                notes: existing?.notes,
                date: existing?.date,
                tripId: existing?.tripId,
                createdAt: existing?.createdAt ?? Date.now(),
              },
            ],
          };
        });
        if (status) {
          setJustMarked(cca2);
          window.setTimeout(() => setJustMarked(null), 900);
        }
      },
      addPlace: (p) => {
        const place: Place = { ...p, id: uid(), media: [], createdAt: Date.now() };
        setState((s) => ({ ...s, places: [...s.places, place] }));
        return place;
      },
      updatePlace: (id, patch) =>
        setState((s) => ({
          ...s,
          places: s.places.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),
      removePlace: (id) =>
        setState((s) => ({ ...s, places: s.places.filter((p) => p.id !== id) })),
      addMedia: (placeId, media) =>
        setState((s) => ({
          ...s,
          places: s.places.map((p) =>
            p.id === placeId ? { ...p, media: [...p.media, media] } : p,
          ),
        })),
      removeMedia: (placeId, mediaId) =>
        setState((s) => ({
          ...s,
          places: s.places.map((p) =>
            p.id === placeId ? { ...p, media: p.media.filter((m) => m.id !== mediaId) } : p,
          ),
        })),
      addTrip: (t) => {
        const trip: Trip = { ...t, id: uid() };
        setState((s) => ({ ...s, trips: [...s.trips, trip] }));
        return trip;
      },
      removeTrip: (id) =>
        setState((s) => ({
          ...s,
          trips: s.trips.filter((t) => t.id !== id),
          places: s.places.map((p) => (p.tripId === id ? { ...p, tripId: undefined } : p)),
        })),
      setMode: (mode) => setState((s) => ({ ...s, mode })),
      setMapTheme: (mapTheme) => setState((s) => ({ ...s, mapTheme })),
    };
  }, [state, ready, justMarked]);

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
