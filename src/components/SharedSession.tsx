import { useEffect, useState, type ReactNode } from "react";
import { StoreContext, StoreProvider, type AppState, type Status } from "@/lib/store";
import { readSharedLink } from "@/lib/shared-map";
import { useI18n } from "@/lib/i18n";

export function SharedSession({ children }: { children: ReactNode }) {
  const { tr } = useI18n();
  const [session, setSession] = useState<"loading" | "own" | "error" | AppState>("loading");
  useEffect(() => {
    let revision = 0;
    async function load() {
      const current = ++revision;
      const hash = window.location.hash;
      if (!hash.startsWith("#view=")) {
        setSession("own");
        return;
      }
      setSession("loading");
      try {
        const data = await readSharedLink(hash);
        if (current === revision) setSession(data);
      } catch {
        if (current === revision) setSession("error");
      }
    }
    void load();
    window.addEventListener("hashchange", load);
    return () => {
      revision++;
      window.removeEventListener("hashchange", load);
    };
  }, []);
  if (session === "loading")
    return (
      <p role="status" className="p-8 text-center">
        {tr("Please wait…")}
      </p>
    );
  if (session === "error")
    return (
      <div className="p-8 text-center">
        <p role="alert">{tr("This shared map is invalid or incomplete.")}</p>
        <a className="underline" href="/">
          {tr("Go home")}
        </a>
      </div>
    );
  if (session === "own") return <StoreProvider>{children}</StoreProvider>;
  return <PreviewStore state={session}>{children}</PreviewStore>;
}

function PreviewStore({ state, children }: { state: AppState; children: ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    const dark = root.classList.contains("dark");
    const theme = root.dataset.maptheme;
    root.classList.toggle("dark", state.mode === "dark");
    root.dataset.maptheme = state.mapTheme;
    return () => {
      root.classList.toggle("dark", dark);
      if (theme) root.dataset.maptheme = theme;
      else delete root.dataset.maptheme;
    };
  }, [state]);
  const statusByCountry: Record<string, Status> = {};
  state.places.forEach((place) => {
    if (place.kind === "country") statusByCountry[place.country] = place.status;
  });
  const noWrite = () => {
    throw new Error("Shared maps are read-only");
  };
  // The personal store never mounts in preview: no auth subscriptions, local
  // storage writes, migrations, or cloud mutation methods can run here.
  return (
    <StoreContext.Provider
      value={{
        state,
        statusByCountry,
        isPreview: true,
        ready: true,
        isGuest: false,
        isTestAccount: false,
        user: null,
        justMarked: null,
        signInTestAccount: noWrite,
        continueAsGuest: noWrite,
        signOut: noWrite,
        resetData: noWrite,
        setCountryStatus: noWrite,
        addPlace: noWrite,
        updatePlace: noWrite,
        removePlace: noWrite,
        addMedia: noWrite,
        removeMedia: noWrite,
        addTrip: noWrite,
        updateTrip: noWrite,
        removeTrip: noWrite,
        importBackup: noWrite,
        setMode: noWrite,
        setMapTheme: noWrite,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}
