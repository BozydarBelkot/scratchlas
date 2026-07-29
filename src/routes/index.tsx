import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  BookOpen,
  Globe2,
  Map as MapIcon,
  Moon,
  Sun,
  Trophy,
  LifeBuoy,
  Flag,
} from "lucide-react";
import { StoreProvider, useStore, type MapTheme } from "@/lib/store";
import { WorldMap } from "@/components/WorldMap";
import { CountrySheet } from "@/components/CountrySheet";
import { CountriesPanel } from "@/components/CountriesPanel";
import { JournalPanel } from "@/components/JournalPanel";
import { StatsPanel } from "@/components/StatsPanel";
import { GuidePanel } from "@/components/GuidePanel";
import { Button } from "@/components/ui/button";



export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Scratchlas — Interactive Scratch Map & Travel Journal" },
      {
        name: "description",
        content:
          "Scratch off countries on a 2D map or 3D globe, log trips with photos, track passport stats and carry offline country reference data.",
      },
      { property: "og:title", content: "Scratchlas — Interactive Scratch Map & Travel Journal" },
      {
        property: "og:description",
        content:
          "Mark countries, cities and landmarks as visited, lived or wish list. Trip timeline, passport stats and offline traveler data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <StoreProvider>
      <App />
    </StoreProvider>
  ),
});

type Tab = "map" | "countries" | "journal" | "stats" | "guide";

const TABS: { id: Tab; label: string; icon: typeof MapIcon }[] = [
  { id: "map", label: "Map", icon: MapIcon },
  { id: "countries", label: "Countries", icon: Flag },
  { id: "journal", label: "Journal", icon: BookOpen },
  { id: "stats", label: "Stats", icon: Trophy },
  { id: "guide", label: "Guide", icon: LifeBuoy },
];


const MAP_THEMES: MapTheme[] = ["atlas", "ocean", "forest", "mono"];

function App() {
  const { state, setMode, setMapTheme, ready } = useStore();
  const [tab, setTab] = useState<Tab>("map");
  const [view, setView] = useState<"flat" | "globe">("flat");
  const [selected, setSelected] = useState<string | null>(null);

  const pins = useMemo(
    () => state.places.filter((p) => p.kind !== "country" && p.lat != null),
    [state.places],
  );

  const isMap = tab === "map";

  return (
    <div className="min-h-screen bg-background">
      {isMap ? (
        <main className="fixed inset-0 bottom-[58px]">
          {ready && <WorldMap view={view} onSelect={setSelected} selected={selected} pins={pins} />}
          <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-end p-3">
            <div className="pointer-events-auto flex rounded-full border border-border bg-background/85 p-1 backdrop-blur">
              <button
                type="button"
                onClick={() => setView("flat")}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === "flat" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                <MapIcon className="size-3.5" /> Flat
              </button>
              <button
                type="button"
                onClick={() => setView("globe")}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === "globe" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                <Globe2 className="size-3.5" /> Globe
              </button>
            </div>
          </div>
        </main>
      ) : (
        <>
          <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
            <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
              <div>
                <h1 className="text-xl font-display leading-none">Scratchlas</h1>
                <p className="text-[11px] text-muted-foreground">
                  Your world, one scratch at a time
                </p>
              </div>
              <div className="flex items-center gap-1">
                <div className="flex gap-1 rounded-full border border-border p-1">
                  {MAP_THEMES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      aria-label={`${t} map theme`}
                      onClick={() => setMapTheme(t)}
                      data-maptheme={t}
                      className={`size-4 rounded-full transition-transform ${
                        state.mapTheme === t
                          ? "scale-110 ring-2 ring-ring ring-offset-1 ring-offset-background"
                          : ""
                      }`}
                      style={{ background: "var(--map-visited)" }}
                    />
                  ))}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Toggle dark mode"
                  onClick={() => setMode(state.mode === "dark" ? "light" : "dark")}
                >
                  {state.mode === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
                </Button>
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-3xl px-4 py-4 pb-24">
            {tab === "countries" && <CountriesPanel onSelect={setSelected} />}
            {tab === "journal" && <JournalPanel />}
            {tab === "stats" && <StatsPanel />}
            {tab === "guide" && <GuidePanel />}
          </main>
        </>
      )}

      <CountrySheet code={selected} onClose={() => setSelected(null)} />

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] transition-colors ${
                tab === t.id ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <t.icon className="size-5" strokeWidth={tab === t.id ? 2.2 : 1.6} />
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

