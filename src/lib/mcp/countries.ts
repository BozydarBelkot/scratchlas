import { BY_CCA2, COUNTRIES, type CountryInfo } from "@/lib/countries";
import { ToolError } from "@lovable.dev/mcp-js";

/** Accepts an ISO code (US / USA) or a country name, common or official. */
export function resolveCountry(input: string): CountryInfo {
  const q = input.trim();
  const upper = q.toUpperCase();
  const byCode =
    BY_CCA2[upper] ?? COUNTRIES.find((c) => c.cca3 === upper || c.ccn3 === upper);
  if (byCode) return byCode;

  const lower = q.toLowerCase();
  const exact = COUNTRIES.find(
    (c) => c.name.toLowerCase() === lower || c.official.toLowerCase() === lower,
  );
  if (exact) return exact;

  const partial = COUNTRIES.filter(
    (c) => c.name.toLowerCase().includes(lower) || c.official.toLowerCase().includes(lower),
  );
  if (partial.length === 1) return partial[0]!;
  if (partial.length > 1)
    throw new ToolError(
      `"${input}" matches several countries: ${partial
        .slice(0, 8)
        .map((c) => `${c.name} (${c.cca2})`)
        .join(", ")}. Use an ISO code.`,
    );
  throw new ToolError(`Unknown country: "${input}".`);
}
