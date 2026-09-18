import { defineTool } from "@lovable.dev/mcp-js";
import {
  BY_CCA2,
  CONTINENT_TOTALS,
  TOTAL_COUNTRIES,
  TOTAL_LAND_AREA,
} from "@/lib/countries";
import { callerClient, check, type PlaceRow } from "../supabase";

export default defineTool({
  name: "get_travel_stats",
  title: "Get travel stats",
  description:
    "Passport stats for the signed-in traveler: countries visited, share of the world, land area covered and per-continent progress.",
  annotations: { readOnlyHint: true },
  inputSchema: {},
  handler: async (_args, ctx) => {
    const { client } = callerClient(ctx);
    const rows = (check(
      await client
        .from("places")
        .select("id,name,kind,country,status,lat,lng,date,notes")
        .limit(2000),
    )) as unknown as PlaceRow[];

    const countries = rows.filter((r) => r.kind === "country");
    const visited = countries.filter((r) => r.status === "visited");
    const lived = countries.filter((r) => r.status === "lived");
    const wish = countries.filter((r) => r.status === "wish");
    const been = [...visited, ...lived];

    const area = been.reduce((s, r) => s + (BY_CCA2[r.country]?.area ?? 0), 0);
    const continents: Record<string, { been: number; total: number }> = {};
    for (const [region, total] of Object.entries(CONTINENT_TOTALS)) {
      continents[region] = { been: 0, total };
    }
    for (const r of been) {
      const region = BY_CCA2[r.country]?.region;
      if (region && continents[region]) continents[region]!.been += 1;
    }

    const stats = {
      countriesBeen: been.length,
      totalCountries: TOTAL_COUNTRIES,
      worldPercent: Math.round((been.length / TOTAL_COUNTRIES) * 1000) / 10,
      visited: visited.length,
      lived: lived.length,
      wishList: wish.length,
      cities: rows.filter((r) => r.kind === "city").length,
      regions: rows.filter((r) => r.kind === "region").length,
      attractions: rows.filter((r) => r.kind === "attraction" || r.kind === "landmark").length,
      landAreaKm2: Math.round(area),
      landAreaPercent: Math.round((area / TOTAL_LAND_AREA) * 1000) / 10,
      continents,
    };

    return {
      content: [
        {
          type: "text",
          text: `${stats.countriesBeen} of ${stats.totalCountries} countries (${stats.worldPercent}% of the world), ${stats.landAreaPercent}% of world land area. ${stats.cities} cities, ${stats.regions} regions, ${stats.attractions} attractions, ${stats.wishList} on the wish list.`,
        },
      ],
      structuredContent: stats,
    };
  },
});
