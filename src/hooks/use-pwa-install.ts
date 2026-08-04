import { useCallback, useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

// Capture at module scope: beforeinstallprompt can fire before React mounts,
// and it only fires once per page load — miss it and install is unavailable.
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    listeners.forEach((notify) => notify());
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    listeners.forEach((notify) => notify());
  });
}

/** True when the app is running as an installed PWA (any platform). */
export function isPwaInstalled(): boolean {
  if (typeof window === "undefined") return false;
  const standaloneMedia =
    window.matchMedia?.("(display-mode: standalone)").matches === true;
  const iosStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  const androidTwa = document.referrer.startsWith("android-app://");
  return standaloneMedia || iosStandalone || androidTwa;
}

export function usePwaInstall() {
  const [installed, setInstalled] = useState(isPwaInstalled);
  const [canInstall, setCanInstall] = useState(() => deferredPrompt !== null);

  useEffect(() => {
    const update = () => {
      setInstalled(isPwaInstalled());
      setCanInstall(deferredPrompt !== null);
    };
    listeners.add(update);
    const media = window.matchMedia("(display-mode: standalone)");
    media.addEventListener("change", update);
    return () => {
      listeners.delete(update);
      media.removeEventListener("change", update);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<
    "accepted" | "dismissed" | "unavailable"
  > => {
    if (!deferredPrompt) return "unavailable";
    const event = deferredPrompt;
    await event.prompt();
    // userChoice resolves once; the event can't be reused afterwards.
    const { outcome } = await event.userChoice;
    deferredPrompt = null;
    setCanInstall(false);
    if (outcome === "accepted") setInstalled(true);
    return outcome;
  }, []);

  return { installed, canInstall, promptInstall };
}
