import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { callerClient } from "../supabase";

const newId = () => Math.random().toString(36).slice(2, 10);

export default defineTool({
  name: "add_trip",
  title: "Log a trip",
  description: "Log a trip in the traveler's journal with a title, start date and optional end date and notes.",
  inputSchema: {
    title: z.string().min(1).max(200),
    start: z.string().describe("ISO start date, e.g. 2026-04-18"),
    end: z.string().optional().describe("ISO end date"),
    notes: z.string().max(4000).optional(),
  },
  handler: async ({ title, start, end, notes }, ctx) => {
    const { client, userId } = callerClient(ctx);
    const id = newId();
    const result = await client.from("trips").insert({
      id,
      user_id: userId,
      title,
      itinerary: [],
      start_date: start,
      end_date: end ?? null,
      notes: notes ?? null,
    });
    if (result.error) throw new ToolError(result.error.message);

    return {
      content: [{ type: "text", text: `Logged "${title}" starting ${start}.` }],
      structuredContent: { id, title, start, end },
    };
  },
});
