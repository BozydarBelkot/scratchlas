import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listMarkedPlaces from "./tools/list-places";
import setCountryStatus from "./tools/set-country-status";
import addPlace from "./tools/add-place";
import listTrips from "./tools/list-trips";
import addTrip from "./tools/add-trip";
import travelStats from "./tools/travel-stats";
import countryGuide from "./tools/country-guide";

const supabaseUrl = (
  process.env["SUPABASE_URL"] ?? "https://supabase.invalid"
).replace(/\/+$/, "");

export default defineMcp({
  name: "scratchlas",
  title: "Scratchlas",
  version: "0.1.0",
  instructions:
    "Scratchlas is a scratch-map travel tracker. Use these tools to read and update the signed-in traveler's visited countries, cities, regions and attractions, log trips, read passport stats, and look up offline country reference data (emergency numbers, plugs, driving side, tap water).",
  auth: auth.oauth.issuer({
    issuer: `${supabaseUrl}/auth/v1`,
    acceptedAudiences: "authenticated",
    jwksUri: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
  }),
  tools: [
    listMarkedPlaces,
    setCountryStatus,
    addPlace,
    listTrips,
    addTrip,
    travelStats,
    countryGuide,
  ],
});
