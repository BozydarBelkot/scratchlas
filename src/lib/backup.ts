import { z } from "zod";
import type { AppState } from "./store";
import { BY_CCA2 } from "./countries";

export const MAX_BACKUP_BYTES = 20 * 1024 * 1024;
const text = z.string().max(100_000);
const id = z.string().min(1).max(200);
const country = z.string().refine((code) => Object.hasOwn(BY_CCA2, code));
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(value);
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
  });
const kind = z.enum(["country", "city", "region", "attraction"]);
const stop = z.object({
  name: text.min(1),
  kind: z.enum(["city", "region", "attraction"]),
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
});
const schema = z.object({
  version: z.literal(1),
  mode: z.enum(["light", "dark"]),
  mapTheme: z.enum(["atlas", "ocean", "forest", "mono"]),
  language: z.enum(["en", "pl", "de", "es", "fr"]).optional(),
  trips: z.array(
    z
      .object({
        id,
        title: text.min(1),
        start: date.or(z.literal("")),
        end: date.optional(),
        notes: text.optional(),
        itinerary: z.array(z.object({ country, stops: z.array(stop) })).optional(),
      })
      .refine((trip) => !trip.end || !trip.start || trip.end >= trip.start),
  ),
  places: z.array(
    z.object({
      id,
      name: text.min(1),
      country,
      kind: z.preprocess((value) => (value === "landmark" ? "attraction" : value), kind),
      status: z.enum(["visited", "wish", "lived"]),
      lat: z.number().finite().min(-90).max(90).optional(),
      lng: z.number().finite().min(-180).max(180).optional(),
      date: date.optional(),
      tripId: id.optional(),
      notes: text.optional(),
      createdAt: z.number().finite().nonnegative(),
      media: z.array(
        z.object({
          id,
          kind: z.enum(["photo", "video"]),
          caption: text.optional(),
          url: z
            .string()
            .refine(
              (url) =>
                /^https?:\/\//i.test(url) || /^data:(image|video)\/[a-z0-9.+-]+;base64,/i.test(url),
            ),
        }),
      ),
    }),
  ),
});
export type Backup = z.infer<typeof schema>;
export function parseBackup(raw: string): Backup {
  const backup = schema.parse(JSON.parse(raw.replace(/^\uFEFF/, "")));
  const unique = (values: string[]) => new Set(values).size === values.length;
  const tripIds = new Set(backup.trips.map((trip) => trip.id));
  if (
    !unique(backup.trips.map((trip) => trip.id)) ||
    !unique(backup.places.map((place) => place.id)) ||
    !unique(backup.places.flatMap((place) => place.media.map((media) => media.id))) ||
    !unique(
      backup.places.filter((place) => place.kind === "country").map((place) => place.country),
    ) ||
    backup.places.some((place) => place.tripId && !tripIds.has(place.tripId))
  ) {
    throw new Error("Invalid backup references");
  }
  return backup;
}

// Existing records win: importing the same backup twice never duplicates them.
export function mergeBackup(current: AppState, backup: Backup) {
  const trips = backup.trips.filter((trip) => !current.trips.some((old) => old.id === trip.id));
  const places = backup.places.filter(
    (place) =>
      !current.places.some(
        (old) =>
          old.id === place.id ||
          (place.kind === "country" && old.kind === "country" && old.country === place.country),
      ),
  );
  const state: AppState = {
    mode: backup.mode,
    mapTheme: backup.mapTheme,
    trips: [...current.trips, ...trips],
    places: [...current.places, ...places],
  };
  return { state, trips, places };
}
