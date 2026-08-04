import { useState } from "react";
import {
  BookOpen,
  Check,
  Compass,
  Download,
  Globe2,
  MapPin,
  Trophy,
} from "lucide-react";
import { usePwaInstall } from "@/hooks/use-pwa-install";

const FEATURES = [
  {
    icon: Globe2,
    title: "Scratch the globe",
    text: "Spin a 3D world and mark countries as visited, lived or on your wish list.",
  },
  {
    icon: MapPin,
    title: "Cities, regions & attractions",
    text: "Pin pre-loaded places — no typing, just tap to add.",
  },
  {
    icon: BookOpen,
    title: "A journal for every trip",
    text: "Log trips with photos on a visual timeline, synced to your account.",
  },
  {
    icon: Trophy,
    title: "Passport stats",
    text: "Track continents and world coverage, then share your progress.",
  },
  {
    icon: Compass,
    title: "Offline travel guide",
    text: "Emergency numbers, power plugs, driving side and more — always with you.",
  },
];

export function OnboardingIntro({ onDone }: { onDone: () => void }) {
  const { installed, canInstall, promptInstall } = usePwaInstall();
  const [installing, setInstalling] = useState(false);
  const isIos =
    typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);

  async function install() {
    setInstalling(true);
    await promptInstall();
    setInstalling(false);
  }

  const ctaDelay = 480 + FEATURES.length * 110;

  return (
    <div className="splash-screen fixed inset-0 z-50 overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col items-center px-6 py-10 text-center">
        <img
          src="/icons/icon-192.png"
          alt="Scratchlas logo — a globe scratched open to reveal gold continents"
          width={192}
          height={192}
          className="anim-logo-enter anim-logo-glow size-24 rounded-[26%]"
        />
        <h1
          className="rise-in mt-5 font-display text-4xl"
          style={{ animationDelay: "150ms" }}
        >
          Scratchlas
        </h1>
        <p
          className="rise-in splash-dim mt-1 text-[11px] uppercase tracking-[0.24em]"
          style={{ animationDelay: "250ms" }}
        >
          Your world, one scratch at a time
        </p>
        <p
          className="rise-in splash-dim mt-5 text-sm leading-relaxed"
          style={{ animationDelay: "360ms" }}
        >
          Scratch off the places you've been — countries, cities, regions and
          world-famous landmarks — keep a photo journal of every trip, and watch
          your passport stats grow.
        </p>

        <ul className="mt-7 w-full space-y-2.5 text-left">
          {FEATURES.map((feature, i) => (
            <li
              key={feature.title}
              className="rise-in splash-card flex items-start gap-3 rounded-xl p-3"
              style={{ animationDelay: `${480 + i * 110}ms` }}
            >
              <feature.icon
                className="splash-accent mt-0.5 size-4 shrink-0"
                strokeWidth={1.8}
              />
              <div>
                <p className="text-sm font-medium">{feature.title}</p>
                <p className="splash-dim text-xs leading-relaxed">{feature.text}</p>
              </div>
            </li>
          ))}
        </ul>

        <div
          className="rise-in mt-7 w-full space-y-2.5"
          style={{ animationDelay: `${ctaDelay}ms` }}
        >
          {installed ? (
            <button
              type="button"
              disabled
              className="splash-btn-ghost flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm"
            >
              <Check className="size-4" />
              Installed on this device
            </button>
          ) : canInstall ? (
            <button
              type="button"
              onClick={() => void install()}
              disabled={installing}
              className="splash-btn-ghost flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm transition-colors"
            >
              <Download className="size-4" />
              {installing ? "Opening installer…" : "Install Scratchlas on this device"}
            </button>
          ) : (
            <p className="splash-dim px-2 text-[11px] leading-relaxed">
              Tip:{" "}
              {isIos
                ? "tap Share in Safari, then “Add to Home Screen”"
                : "open your browser menu and choose “Install app” or “Add to Home Screen”"}{" "}
              to keep Scratchlas one tap away.
            </p>
          )}
          <button
            type="button"
            onClick={onDone}
            className="splash-btn-gold w-full rounded-xl px-4 py-3 text-sm transition-colors"
          >
            Start exploring
          </button>
        </div>
      </div>
    </div>
  );
}
