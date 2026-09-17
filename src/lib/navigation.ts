import { useEffect, useState } from "react";
import { BookOpen, Flag, LifeBuoy, Settings, Map as MapIcon, Trophy } from "lucide-react";
export const TABS = [
  { id: "map", label: "Map", icon: MapIcon },
  { id: "countries", label: "Countries", icon: Flag },
  { id: "journal", label: "Journal", icon: BookOpen },
  { id: "stats", label: "Stats", icon: Trophy },
  { id: "guide", label: "Guide", icon: LifeBuoy },
  { id: "settings", label: "Settings", icon: Settings },
] as const;
export type Tab = (typeof TABS)[number]["id"];
export type NavigationLayout = { order: Tab[]; hidden: Tab[] };
const defaults: NavigationLayout = { order: TABS.map((t) => t.id), hidden: [] };
export function normalizeNavigation(value: unknown): NavigationLayout {
  const v = value as Partial<NavigationLayout> | null;
  const valid = (x: unknown): x is Tab => TABS.some((t) => t.id === x);
  const order = Array.isArray(v?.order) ? [...new Set(v.order.filter(valid))] : [];
  return {
    order: [...order, ...defaults.order.filter((id) => !order.includes(id))],
    hidden: Array.isArray(v?.hidden)
      ? [...new Set(v.hidden.filter(valid))].filter((id) => id !== "settings")
      : [],
  };
}
export function useNavigationLayout() {
  const [layout, setLayout] = useState(defaults);
  useEffect(() => {
    try {
      setLayout(
        normalizeNavigation(JSON.parse(localStorage.getItem("scratchlas.navigation") ?? "null")),
      );
    } catch {}
  }, []);
  const update = (next: NavigationLayout) => {
    const value = normalizeNavigation(next);
    setLayout(value);
    try {
      localStorage.setItem("scratchlas.navigation", JSON.stringify(value));
    } catch {}
  };
  return { layout, update };
}
