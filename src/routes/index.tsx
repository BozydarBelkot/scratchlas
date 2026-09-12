import { useI18n } from "@/lib/i18n";
import { transitionScreen } from "@/lib/screen-transition";
import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Flag, LifeBuoy, Settings, Map as MapIcon, Trophy } from "lucide-react";
import { useStore } from "@/lib/store";
import { WorldMap, type MapMode } from "@/components/WorldMap";
import { CountrySheet } from "@/components/CountrySheet";
import { CountriesPanel } from "@/components/CountriesPanel";
import { JournalPanel } from "@/components/JournalPanel";
import { StatsPanel } from "@/components/StatsPanel";
import { GuidePanel } from "@/components/GuidePanel";
import { LandingPage } from "@/components/LandingPage";
import { AuthScreen } from "@/components/AuthScreen";
import { SettingsPanel } from "@/components/SettingsPanel";
import { SharedSession } from "@/components/SharedSession";

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
    <SharedSession>
      <App />
    </SharedSession>
  ),
});

type Tab = "map" | "countries" | "journal" | "stats" | "guide" | "settings";

const TABS: { id: Tab; label: string; icon: typeof MapIcon }[] = [
  { id: "map", label: "Map", icon: MapIcon },
  { id: "countries", label: "Countries", icon: Flag },
  { id: "journal", label: "Journal", icon: BookOpen },
  { id: "stats", label: "Stats", icon: Trophy },
  { id: "guide", label: "Guide", icon: LifeBuoy },
  { id: "settings", label: "Settings", icon: Settings },
];

function App() {
  const { tr } = useI18n();

  const { state, ready, user, isGuest, isPreview } = useStore();
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    setEntered(window.location.hash === "#app");
    const sync = () => transitionScreen(() => setEntered(window.location.hash === "#app"));
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const [tab, setTab] = useState<Tab>("map");
  const [selected, setSelected] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<MapMode>("world");

  const pins = useMemo(
    () => state.places.filter((p) => p.kind !== "country" && p.lat != null),
    [state.places],
  );

  if (!isPreview && !entered) return <LandingPage signedIn={!!user || isGuest} />;
  if (!user && !isGuest && !isPreview)
    return (
      <>
        <a href="#" className="auth-home">
          ← {tr("Go home")}
        </a>
        <AuthScreen />
      </>
    );

  const isMap = tab === "map";

  return (
    <div className="app-shell min-h-screen bg-background">
      {isPreview && (
        <div className="sticky top-0 z-30 flex h-12 items-center justify-between gap-3 border-b border-border bg-card px-4 py-2 text-xs sm:text-sm">
          <span>{tr("Shared map · Read-only preview")}</span>
          <a className="shrink-0 underline" href="/">
            {tr("Exit preview")}
          </a>
        </div>
      )}
      {isMap ? (
        <>
          <main className={`fixed inset-0 bottom-[58px] ${isPreview ? "top-12" : ""}`}>
            {ready && (
              <WorldMap onSelect={setSelected} selected={selected} pins={pins} mode={mapMode} />
            )}
          </main>
          {!isPreview && (
            <a
              href="#"
              className="fixed right-4 top-4 z-10 rounded-full border border-border bg-background/85 px-4 py-2 text-sm font-semibold tracking-tight shadow-sm backdrop-blur"
              aria-label={tr("Go home")}
            >
              Scratchlas ↗
            </a>
          )}
        </>
      ) : (
        <>
          <header
            className={`sticky ${isPreview ? "top-12" : "top-0"} z-20 border-b border-border bg-background/85 backdrop-blur`}
          >
            <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
              <div>
                <a href="#" className="text-xl font-semibold tracking-tight leading-none">
                  Scratchlas
                </a>
                <p className="text-[11px] text-muted-foreground">
                  {tr("Your world, one scratch at a time")}
                </p>
              </div>
            </div>
          </header>

          <main key={tab} className="app-panel mx-auto max-w-3xl px-4 py-6 pb-28">
            {tab === "countries" && <CountriesPanel />}
            {tab === "journal" && <JournalPanel />}
            {tab === "stats" && <StatsPanel />}
            {tab === "guide" && <GuidePanel />}
            {tab === "settings" && !isPreview && <SettingsPanel />}
          </main>
        </>
      )}

      <CountrySheet
        code={selected}
        mode={mapMode}
        onModeChange={setMapMode}
        onClose={() => setSelected(null)}
      />

      <nav
        aria-label={tr("Main navigation")}
        className="app-navigation fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur"
      >
        <div className="mx-auto flex max-w-3xl">
          {TABS.filter((t) => !isPreview || t.id !== "settings").map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setSelected(null);
                setTab(t.id);
              }}
              aria-current={tab === t.id ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] transition-colors ${
                tab === t.id ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <t.icon className="size-5" strokeWidth={tab === t.id ? 2.2 : 1.6} />
              {tr(t.label)}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
