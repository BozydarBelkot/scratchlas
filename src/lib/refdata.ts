// Offline traveler reference data.
// Emergency numbers, plug types and tap-water safety per country (ISO alpha-2),
// with sensible regional fallbacks. Driving side / currency / dial code come
// from the bundled world-countries dataset.

export type TapWater = "safe" | "caution" | "unsafe" | "unknown";

export interface CountryExtra {
  emergency: string; // general emergency number(s)
  police?: string;
  ambulance?: string;
  fire?: string;
  plugs: string[]; // plug letter types
  voltage: string;
  tapWater: TapWater;
}

const EU112: Omit<CountryExtra, "plugs" | "voltage" | "tapWater"> = { emergency: "112" };

const T = (
  emergency: string,
  plugs: string[],
  voltage: string,
  tapWater: TapWater,
  extra?: Partial<CountryExtra>,
): CountryExtra => ({ emergency, plugs, voltage, tapWater, ...extra });

export const COUNTRY_EXTRAS: Record<string, CountryExtra> = {
  US: T("911", ["A", "B"], "120V / 60Hz", "safe"),
  CA: T("911", ["A", "B"], "120V / 60Hz", "safe"),
  MX: T("911", ["A", "B"], "127V / 60Hz", "unsafe"),
  BR: T("190 / 192", ["C", "N"], "127–220V / 60Hz", "caution"),
  AR: T("911", ["C", "I"], "220V / 50Hz", "caution"),
  CL: T("133 / 131", ["C", "L"], "220V / 50Hz", "safe"),
  PE: T("105 / 116", ["A", "B", "C"], "220V / 60Hz", "unsafe"),
  CO: T("123", ["A", "B"], "110V / 60Hz", "caution"),
  GB: T("999 / 112", ["G"], "230V / 50Hz", "safe", { ...EU112 }),
  IE: T("112 / 999", ["G"], "230V / 50Hz", "safe"),
  FR: T("112", ["C", "E"], "230V / 50Hz", "safe"),
  DE: T("112", ["C", "F"], "230V / 50Hz", "safe"),
  ES: T("112", ["C", "F"], "230V / 50Hz", "safe"),
  PT: T("112", ["C", "F"], "230V / 50Hz", "safe"),
  IT: T("112", ["C", "F", "L"], "230V / 50Hz", "caution"),
  NL: T("112", ["C", "F"], "230V / 50Hz", "safe"),
  BE: T("112", ["C", "E"], "230V / 50Hz", "safe"),
  CH: T("112", ["C", "J"], "230V / 50Hz", "safe"),
  AT: T("112", ["C", "F"], "230V / 50Hz", "safe"),
  DK: T("112", ["C", "E", "F", "K"], "230V / 50Hz", "safe"),
  SE: T("112", ["C", "F"], "230V / 50Hz", "safe"),
  NO: T("112 / 113", ["C", "F"], "230V / 50Hz", "safe"),
  FI: T("112", ["C", "F"], "230V / 50Hz", "safe"),
  IS: T("112", ["C", "F"], "230V / 50Hz", "safe"),
  PL: T("112", ["C", "E"], "230V / 50Hz", "safe"),
  CZ: T("112", ["C", "E"], "230V / 50Hz", "safe"),
  GR: T("112", ["C", "F"], "230V / 50Hz", "caution"),
  HR: T("112", ["C", "F"], "230V / 50Hz", "safe"),
  TR: T("112", ["C", "F"], "230V / 50Hz", "unsafe"),
  RU: T("112", ["C", "F"], "220V / 50Hz", "unsafe"),
  UA: T("112", ["C", "F"], "230V / 50Hz", "unsafe"),
  MA: T("19 / 15", ["C", "E"], "220V / 50Hz", "unsafe"),
  EG: T("122 / 123", ["C", "F"], "220V / 50Hz", "unsafe"),
  ZA: T("10111 / 10177", ["D", "M", "N"], "230V / 50Hz", "safe"),
  KE: T("999 / 112", ["G"], "240V / 50Hz", "unsafe"),
  TZ: T("112", ["D", "G"], "230V / 50Hz", "unsafe"),
  NG: T("112 / 767", ["D", "G"], "230V / 50Hz", "unsafe"),
  ET: T("911 / 907", ["C", "F", "L"], "220V / 50Hz", "unsafe"),
  AE: T("999 / 998", ["G"], "230V / 50Hz", "caution"),
  SA: T("911", ["G"], "230V / 60Hz", "caution"),
  IL: T("100 / 101", ["C", "H", "M"], "230V / 50Hz", "safe"),
  IN: T("112", ["C", "D", "M"], "230V / 50Hz", "unsafe"),
  NP: T("100 / 102", ["C", "D", "M"], "230V / 50Hz", "unsafe"),
  LK: T("119 / 110", ["D", "G", "M"], "230V / 50Hz", "unsafe"),
  TH: T("191 / 1669", ["A", "B", "C", "O"], "230V / 50Hz", "unsafe"),
  VN: T("113 / 115", ["A", "C", "F"], "220V / 50Hz", "unsafe"),
  KH: T("117 / 119", ["A", "C", "G"], "230V / 50Hz", "unsafe"),
  LA: T("191 / 195", ["A", "B", "C", "E", "F"], "230V / 50Hz", "unsafe"),
  MY: T("999", ["G"], "240V / 50Hz", "caution"),
  SG: T("999 / 995", ["G"], "230V / 50Hz", "safe"),
  ID: T("112", ["C", "F"], "230V / 50Hz", "unsafe"),
  PH: T("911", ["A", "B", "C"], "220V / 60Hz", "unsafe"),
  CN: T("110 / 120", ["A", "C", "I"], "220V / 50Hz", "unsafe"),
  HK: T("999", ["G"], "220V / 50Hz", "safe"),
  TW: T("110 / 119", ["A", "B"], "110V / 60Hz", "caution"),
  JP: T("110 / 119", ["A", "B"], "100V / 50–60Hz", "safe"),
  KR: T("112 / 119", ["C", "F"], "220V / 60Hz", "safe"),
  AU: T("000", ["I"], "230V / 50Hz", "safe"),
  NZ: T("111", ["I"], "230V / 50Hz", "safe"),
  FJ: T("911", ["I"], "240V / 50Hz", "caution"),
};

const REGION_FALLBACK: Record<string, CountryExtra> = {
  Europe: T("112", ["C", "F"], "230V / 50Hz", "caution"),
  Americas: T("911", ["A", "B", "C"], "110–220V", "caution"),
  Africa: T("112", ["C", "D", "G"], "230V / 50Hz", "unsafe"),
  Asia: T("112", ["A", "C", "G"], "220V / 50Hz", "unsafe"),
  Oceania: T("112", ["I"], "240V / 50Hz", "caution"),
  Antarctic: T("—", ["C", "F"], "230V / 50Hz", "unknown"),
};

export function extrasFor(cca2: string, region: string): CountryExtra {
  return (
    COUNTRY_EXTRAS[cca2] ??
    REGION_FALLBACK[region] ??
    T("112", ["C"], "230V / 50Hz", "unknown")
  );
}

export const TAP_WATER_LABEL: Record<TapWater, string> = {
  safe: "Generally safe to drink",
  caution: "Drinkable in most areas — ask locally",
  unsafe: "Not recommended — drink bottled",
  unknown: "No data available",
};
