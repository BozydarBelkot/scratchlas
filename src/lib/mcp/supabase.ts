// Server-only: builds a Supabase client that acts as the calling MCP user so
// row-level security applies exactly as it does in the app.
import { createClient } from "@supabase/supabase-js";
import { ToolError, type ToolContext } from "@lovable.dev/mcp-js";

export function callerClient(ctx: Pick<ToolContext, "getToken" | "getUserId">) {
  const token = ctx.getToken();
  const userId = ctx.getUserId();
  if (!token || !userId) throw new ToolError("Sign in to Scratchlas to use this tool.");

  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new ToolError("Scratchlas backend is not configured.");

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        headers.set("apikey", key);
        headers.set("Authorization", `Bearer ${token}`);
        return fetch(input, { ...init, headers });
      },
    },
  });

  return { client, userId };
}

export function check<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new ToolError(result.error.message);
  return result.data;
}

export const STATUSES = ["visited", "wish", "lived"] as const;
export type Status = (typeof STATUSES)[number];

export interface PlaceRow {
  id: string;
  name: string;
  kind: string;
  country: string;
  status: Status;
  lat: number | null;
  lng: number | null;
  date: string | null;
  notes: string | null;
}

export interface TripRow {
  id: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
}
