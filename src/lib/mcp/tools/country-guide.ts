import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { resolveCountry } from "../countries";

export default defineTool({
  name: "get_country_guide",
  title: "Get country travel reference",
  description:
    "Practical traveler reference for a country: emergency numbers, driving side, power plugs and voltage, tap water safety, currency, capital and dial code.",
  annotations: { readOnlyHint: true, openWorldHint: false },
  inputSchema: { country: z.string().min(2).describe("Country name or ISO code") },
  handler: async ({ country }) => {
    const c = resolveCountry(country);
    const guide = {
      name: c.name,
      officialName: c.official,
      code: c.cca2,
      flag: c.flag,
      capital: c.capital,
      region: c.region,
      subregion: c.subregion,
      currency: c.currency,
      dialCode: c.dial,
      drivingSide: c.drivingSide,
      emergency: c.extra.emergency,
      police: c.extra.police,
      ambulance: c.extra.ambulance,
      fire: c.extra.fire,
      plugTypes: c.extra.plugs,
      voltage: c.extra.voltage,
      tapWater: c.extra.tapWater,
    };

    return {
      content: [
        {
          type: "text",
          text: [
            `${guide.flag} ${guide.name} (${guide.code}) — capital ${guide.capital}`,
            `Emergency: ${guide.emergency}`,
            `Driving: ${guide.drivingSide}-hand side`,
            `Power: type ${guide.plugTypes.join("/")}, ${guide.voltage}`,
            `Tap water: ${guide.tapWater}`,
            `Currency: ${guide.currency} · Dial: ${guide.dialCode}`,
          ].join("\n"),
        },
      ],
      structuredContent: guide,
    };
  },
});
