import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { callerClient, STATUSES } from "../supabase";
import { resolveCountry } from "../countries";

const newId = () => Math.random().toString(36).slice(2, 10);

export default defineTool({
  name: "add_place",
  title: "Add a city, region or attraction",
  description:
    "Add a city, region or attraction to the traveler's map inside a given country, with a status and optional date and notes.",
  inputSchema: {
    name: z.string().min(1),
    kind: z.enum(["city", "region", "attraction"]),
    country: z.string().min(2).describe("Country name or ISO code"),
    status: z.enum(STATUSES).describe("visited, wish or lived"),
    date: z.string().optional().describe("ISO date, e.g. 2026-04-18"),
    notes: z.string().max(2000).optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
  },
  handler: async ({ name, kind, country, status, date, notes, lat, lng }, ctx) => {
    const info = resolveCountry(country);
    const { client, userId } = callerClient(ctx);

    const id = newId();
    const result = await client.from("places").insert({
      id,
      user_id: userId,
      name,
      kind,
      country: info.cca2,
      status,
      lat: lat ?? null,
      lng: lng ?? null,
      date: date ?? null,
      notes: notes ?? null,
      created_at: Date.now(),
    });
    if (result.error) throw new ToolError(result.error.message);

    return {
      content: [
        { type: "text", text: `Added ${name} (${kind}) in ${info.name} as ${status}.` },
      ],
      structuredContent: { id, name, kind, country: info.name, countryCode: info.cca2, status },
    };
  },
});
