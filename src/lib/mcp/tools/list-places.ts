import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { BY_CCA2 } from "@/lib/countries";
import { callerClient, check, STATUSES, type PlaceRow } from "../supabase";

export default defineTool({
  name: "list_marked_places",
  title: "List marked places",
  description:
    "List the signed-in traveler's marked countries, regions, cities and attractions, optionally filtered by status or kind.",
  annotations: { readOnlyHint: true },
  inputSchema: {
    status: z.enum(STATUSES).optional().describe("visited, wish (wish list) or lived"),
    kind: z.enum(["country", "region", "city", "attraction"]).optional(),
    limit: z.number().int().min(1).max(500).optional(),
  },
  handler: async ({ status, kind, limit }, ctx) => {
    const { client } = callerClient(ctx);
    let query = client
      .from("places")
      .select("id,name,kind,country,status,lat,lng,date,notes")
      .order("created_at");
    if (status) query = query.eq("status", status);
    if (kind) query = query.eq("kind", kind);
    const rows = (check(await query.limit(limit ?? 200))) as unknown as PlaceRow[];

    const places = rows.map((r) => ({
      id: r.id,
      name: r.name,
      kind: r.kind === "landmark" ? "attraction" : r.kind,
      country: BY_CCA2[r.country]?.name ?? r.country,
      countryCode: r.country,
      status: r.status,
      date: r.date ?? undefined,
      notes: r.notes ?? undefined,
    }));

    return {
      content: [
        {
          type: "text",
          text: places.length
            ? places
                .map((p) => `${p.name} (${p.kind}, ${p.country}) — ${p.status}`)
                .join("\n")
            : "No places marked yet.",
        },
      ],
      structuredContent: { places },
    };
  },
});
