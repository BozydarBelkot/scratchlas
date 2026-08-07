import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  BookOpen,
  Flag,
  Globe,
  LifeBuoy,
  LogOut,
  Map as MapIcon,
  MapPin,
  Moon,
  Sun,
  Trophy,
} from "lucide-react";
import { StoreProvider, useStore, type MapTheme } from "@/lib/store";
import { WorldMap, type MapMode } from "@/components/WorldMap";
import { CountrySheet } from "@/components/CountrySheet";
import { CountriesPanel } from "@/components/CountriesPanel";
import { JournalPanel } from "@/components/JournalPanel";
import { StatsPanel } from "@/components/StatsPanel";
import { GuidePanel } from "@/components/GuidePanel";
import { AuthScreen } from "@/components/AuthScreen";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Scratchlas — Interactive Scratch Map & Travel Journal" },
      {
        name: "description",
        content:
          "Scratch off countries on a 3D globe, log trips with photos, track passport stats and carry offline country reference data.",
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
  const { state, setMode, setMapTheme, ready, user, signOut } = useStore();
  const [tab, setTab] = useState<Tab>("map");
  const [selected, setSelected] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<MapMode>("world");

  const pins = useMemo(
    () => state.places.filter((p) => p.kind !== "country" && p.lat != null),
    [state.places],
  );

  if (user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="animate-pulse font-display text-2xl text-muted-foreground">Scratchlas</p>
      </div>
    );
  }
  if (!user) return <AuthScreen />;

  const isMap = tab === "map";

  return (
    <div className="min-h-screen bg-background">
      {isMap ? (
        <>
          <main className="fixed inset-0 bottom-[58px]">
            {ready && (
              <WorldMap onSelect={setSelected} selected={selected} pins={pins} mode={mapMode} />
            )}
          </main>

          {/* World / Places mode toggle — floats on the right, above the
              country menu (higher z-index than the sheet) so it stays usable
              while the menu is open. */}
          <div className="fixed right-3 top-1/2 z-[60] -translate-y-1/2">
            <div className="flex flex-col gap-1 rounded-full border border-border bg-background/85 p-1 shadow-lg backdrop-blur">
              {(
                [
                  { id: "world", label: "World", icon: Globe },
                  { id: "places", label: "Places", icon: MapPin },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={mapMode === m.id}
                  onClick={() => setMapMode(m.id)}
                  className={`flex flex-col items-center gap-0.5 rounded-full px-2.5 py-2 text-[10px] font-medium transition-colors ${
                    mapMode === m.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <m.icon className="size-4" />
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </>
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
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Sign out"
                  onClick={() => void signOut()}
                >
                  <LogOut className="size-4" />
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

      <CountrySheet code={selected} mode={mapMode} onClose={() => setSelected(null)} />

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
