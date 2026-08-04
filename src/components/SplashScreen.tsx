export function SplashScreen({ leaving = false }: { leaving?: boolean }) {
  return (
    <div
      className={`splash-screen fixed inset-0 z-50 flex flex-col items-center justify-center ${
        leaving ? "anim-splash-out" : ""
      }`}
    >
      <img
        src="/icons/icon-192.png"
        alt="Scratchlas logo"
        width={192}
        height={192}
        className="anim-logo-enter anim-logo-glow size-28 rounded-[26%]"
      />
      <h1
        className="rise-in mt-6 font-display text-5xl"
        style={{ animationDelay: "200ms" }}
      >
        Scratchlas
      </h1>
      <p
        className="rise-in splash-dim mt-2 text-[11px] uppercase tracking-[0.28em]"
        style={{ animationDelay: "380ms" }}
      >
        Your world, one scratch at a time
      </p>
    </div>
  );
}
