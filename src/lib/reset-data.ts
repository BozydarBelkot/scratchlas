import type { AppState } from "./store";
export type ResetScope = "trips" | "places" | "all";
export function resetData(state: AppState, scope: ResetScope): AppState {
  if (scope === "all") return { trips: [], places: [], mode: "light", mapTheme: "atlas" };
  if (scope === "places") return { ...state, places: [] };
  return {
    ...state,
    trips: [],
    places: state.places.map((place) => ({ ...place, tripId: undefined })),
  };
}
