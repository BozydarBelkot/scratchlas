import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { callerClient, check, type TripRow } from "../supabase";

export default defineTool({
  name: "list_trips",
  title: "List trips",
  description: "List the signed-in traveler's logged trips, newest first.",
  annotations: { readOnlyHint: true },
  inputSchema: { limit: z.number().int().min(1).max(200).optional() },
  handler: async ({ limit }, ctx) => {
    const { client } = callerClient(ctx);
    const rows = (check(
      await client
        .from("trips")
        .select("id,title,start_date,end_date,notes")
        .order("start_date", { ascending: false })
        .limit(limit ?? 50),
    )) as unknown as TripRow[];

    const trips = rows.map((t) => ({
      id: t.id,
      title: t.title,
      start: t.start_date ?? undefined,
      end: t.end_date ?? undefined,
      notes: t.notes ?? undefined,
    }));

    return {
      content: [
        {
          type: "text",
          text: trips.length
            ? trips
                .map((t) => `${t.title} — ${t.start ?? "?"}${t.end ? ` → ${t.end}` : ""}`)
                .join("\n")
            : "No trips logged yet.",
        },
      ],
      structuredContent: { trips },
    };
  },
});
