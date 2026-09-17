import { useI18n } from "@/lib/i18n";
import { transitionScreen } from "@/lib/screen-transition";
import { useEffect, useMemo, useState, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useNavigationLayout, type Tab } from "@/lib/navigation";
import { NavigationStrip } from "@/components/NavigationSettings";
import { NotificationsPopover } from "@/components/NotificationsPopover";
import { useUpdates } from "@/components/NotificationsPanel";
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

function App() {
  const { tr } = useI18n();

  const { state, ready, user, isGuest, isPreview, signOut } = useStore();
  const navigation = useNavigationLayout();
  const updates = useUpdates(!isPreview);
  const [entered, setEntered] = useState(false);
  const enteredRef = useRef(entered);
  enteredRef.current = entered;
  const [authActive, setAuthActive] = useState(false);
  useEffect(() => {
    if (entered && !user && !isGuest && !isPreview) setAuthActive(true);
  }, [entered, user, isGuest, isPreview]);
  useEffect(() => {
    setEntered(window.location.hash === "#app");
    const sync = () => {
      const next = window.location.hash === "#app";
      if (next === enteredRef.current) return;
      transitionScreen(() => {
        setAuthActive(false);
        setEntered(next);
      });
    };
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const [tab, setTab] = useState<Tab>("map");
  useEffect(() => {
    if (!isPreview && navigation.layout.hidden.includes(tab)) {
      setTab(
        navigation.layout.order.find((id) => !navigation.layout.hidden.includes(id)) ?? "settings",
      );
    }
  }, [navigation.layout, tab, isPreview]);
  const [selected, setSelected] = useState<string | null>(null);
  const mapMode: MapMode = selected ? "places" : "world";

  const pins = useMemo(
    () => state.places.filter((p) => p.kind !== "country" && p.lat != null),
    [state.places],
  );

  if (!isPreview && !entered)
    return (
      <LandingPage
        signedIn={!!user && !isGuest}
        onProfile={() => {
          if (user && !isGuest) {
            setTab("settings");
            window.location.hash = "app";
          } else if (isGuest) {
            void signOut().then(() => {
              window.location.hash = "app";
            });
          } else window.location.hash = "app";
        }}
      />
    );
  if ((authActive || (!user && !isGuest)) && !isPreview)
    return (
      <>
        <a href="#" className="auth-home">
          ← {tr("Go home")}
        </a>
        <AuthScreen
          onSuccess={() => {
            setEntered(false);
            window.location.hash = "";
          }}
        />
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
              <WorldMap
                onSelect={setSelected}
                selected={selected}
                pins={pins}
                mode={mapMode}
                preservePose={!isPreview}
              />
            )}
          </main>
          {!isPreview && (
            <div className="map-header-actions">
              <NotificationsPopover updates={updates} />
              <a
                href="#"
                className="rounded-full border border-border bg-background/85 px-4 py-2 text-sm font-semibold tracking-tight shadow-sm backdrop-blur"
                aria-label={tr("Go home")}
              >
                Scratchlas ↗
              </a>
            </div>
          )}
        </>
      ) : (
        <>
          <header
            className={`sticky ${isPreview ? "top-12" : "top-0"} z-20 border-b border-border bg-background/85 backdrop-blur`}
          >
            <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                {!isPreview && <NotificationsPopover updates={updates} />}
                <div>
                  <a href="#" className="text-xl font-semibold tracking-tight leading-none">
                    Scratchlas
                  </a>
                  <p className="text-[11px] text-muted-foreground">
                    {tr("Your world, one scratch at a time")}
                  </p>
                </div>
              </div>
            </div>
          </header>

          <main key={tab} className="app-panel mx-auto max-w-3xl px-4 py-6 pb-28">
            {tab === "countries" && <CountriesPanel />}
            {tab === "journal" && <JournalPanel />}
            {tab === "stats" && <StatsPanel />}
            {tab === "guide" && <GuidePanel />}
            {tab === "settings" && !isPreview && <SettingsPanel navigation={navigation} />}
          </main>
        </>
      )}

      <CountrySheet
        code={selected}
        onClose={() => {
          setSelected(null);
        }}
      />

      <nav
        aria-label={tr("Main navigation")}
        className="app-navigation fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur"
      >
        <NavigationStrip
          ids={navigation.layout.order.filter((id) =>
            isPreview ? id !== "settings" : !navigation.layout.hidden.includes(id),
          )}
          active={tab}
          onSelect={(id) => {
            setSelected(null);
            setTab(id);
          }}
        />
      </nav>
    </div>
  );
}
