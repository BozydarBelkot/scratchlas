import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { callerClient, check, STATUSES, type PlaceRow } from "../supabase";
import { resolveCountry } from "../countries";

const newId = () => Math.random().toString(36).slice(2, 10);

export default defineTool({
  name: "set_country_status",
  title: "Mark a country",
  description:
    "Mark a country on the traveler's scratch map as visited, wish list or lived, or clear its mark. Re-running with the same values is safe.",
  annotations: { idempotentHint: true },
  inputSchema: {
    country: z.string().min(2).describe("Country name or ISO code, e.g. 'Japan' or 'JP'"),
    status: z
      .enum([...STATUSES, "none"])
      .describe("visited, wish, lived, or none to remove the mark"),
  },
  handler: async ({ country, status }, ctx) => {
    const info = resolveCountry(country);
    const { client, userId } = callerClient(ctx);

    const existing = (check(
      await client
        .from("places")
        .select("id,name,kind,country,status,lat,lng,date,notes")
        .eq("kind", "country")
        .eq("country", info.cca2)
        .limit(1),
    )) as unknown as PlaceRow[];

    if (status === "none") {
      if (!existing.length)
        return {
          content: [{ type: "text", text: `${info.name} was not marked.` }],
          structuredContent: { country: info.name, countryCode: info.cca2, status: null },
        };
      check(await client.from("places").delete().eq("id", existing[0]!.id));
      return {
        content: [{ type: "text", text: `Removed the mark on ${info.name}.` }],
        structuredContent: { country: info.name, countryCode: info.cca2, status: null },
      };
    }

    const row = {
      id: existing[0]?.id ?? newId(),
      user_id: userId,
      name: info.name,
      kind: "country",
      country: info.cca2,
      status,
      lat: null,
      lng: null,
      date: existing[0]?.date ?? null,
      notes: existing[0]?.notes ?? null,
      created_at: Date.now(),
    };
    const saved = await client.from("places").upsert(row);
    if (saved.error) throw new ToolError(saved.error.message);

    return {
      content: [{ type: "text", text: `${info.name} is now marked as ${status}.` }],
      structuredContent: { country: info.name, countryCode: info.cca2, status },
    };
  },
});
