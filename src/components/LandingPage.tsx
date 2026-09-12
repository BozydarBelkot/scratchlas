import { useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Globe2,
  MapPin,
  BookOpen,
  ChartNoAxesCombined,
  Pause,
  Play,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { WorldMap } from "./WorldMap";
function PreviewGlobe() {
  const [paused, setPaused] = useState(false);
  const { tr } = useI18n();
  return (
    <div className="landing-globe">
      <div className="landing-map" inert>
        <WorldMap onSelect={() => {}} pins={[]} mode="world" decorative autoRotate={!paused} />
      </div>

      <button
        className="globe-pause"
        onClick={() => setPaused(!paused)}
        aria-label={tr(paused ? "Resume animation" : "Pause animation")}
      >
        {paused ? <Play size={16} /> : <Pause size={16} />}
      </button>
    </div>
  );
}

export function LandingPage({ signedIn }: { signedIn: boolean }) {
  const { tr } = useI18n();
  const features = [
    {
      icon: Globe2,
      number: "01",
      title: "Make the world yours",
      text: "Mark the countries you have visited, the places you call home and everywhere you dream of going.",
    },
    {
      icon: BookOpen,
      number: "02",
      title: "Keep every chapter",
      text: "Build your trip itinerary, arrange your stops and keep your memories together in a personal travel journal.",
    },
    {
      icon: ChartNoAxesCombined,
      number: "03",
      title: "See your story grow",
      text: "Explore your travel stats, download your map or share a read-only view of your adventures.",
    },
  ];
  return (
    <div className="landing-page">
      <header className="landing-header">
        <a href="#" className="landing-brand">
          <Globe2 size={25} />
          Scratchlas<span className="brand-dot">●</span>
        </a>
        <a href="#app" className="landing-login">
          {tr(signedIn ? "Open app" : "Sign in")}
          <ArrowUpRight size={17} />
        </a>
      </header>
      <main>
        <section className="landing-hero">
          <div className="hero-copy">
            <p className="landing-eyebrow">
              <span /> {tr("FOR THE PLACES THAT STAY WITH YOU")}
            </p>
            <h1>
              {tr("Your travels.")}
              <br />
              <span>{tr("A world of stories.")}</span>
            </h1>
            <p className="hero-description">
              {tr(
                "Turn everywhere you have been into a world that is uniquely yours. Collect places, plan your next adventure and keep the memories close.",
              )}
            </p>
            <a className="landing-cta" href="#app">
              {tr(signedIn ? "Continue your journey" : "Start your journey")}
              <ArrowRight size={19} />
            </a>
            <p className="hero-footnote">
              <MapPin size={14} />
              {tr("Countries, cities and the little places in between.")}
            </p>
          </div>
          <PreviewGlobe />
        </section>
        <section className="landing-features" aria-label={tr("Discover Scratchlas")}>
          {features.map(({ icon: Icon, number, title, text }) => (
            <article key={number}>
              <div className="feature-top">
                <Icon size={23} />
                <span>{number}</span>
              </div>
              <h2>{tr(title)}</h2>
              <p>{tr(text)}</p>
            </article>
          ))}
        </section>
        <section className="landing-outro">
          <p>{tr("Your next chapter starts somewhere.")}</p>
          <a href="#app">
            {tr("Find your somewhere")}
            <ArrowUpRight size={24} />
          </a>
        </section>
      </main>
      <footer className="landing-footer">
        <span>Scratchlas</span>
        <span>{tr("A little curiosity. A whole world.")}</span>
      </footer>
    </div>
  );
}
