import { useI18n } from "@/lib/i18n";
import { CountryFlag } from "@/components/CountryFlag";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ReferenceCard } from "@/components/ReferenceCard";
import { COUNTRIES } from "@/lib/countries";

export function GuidePanel() {
  const { tr } = useI18n();

  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return COUNTRIES.slice(0, 12);
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        c.official.toLowerCase().includes(s) ||
        c.cca3.toLowerCase() === s,
    ).slice(0, 20);
  }, [q]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-display">{tr("Traveler reference")}</h2>
        <p className="text-sm text-muted-foreground">
          {tr("Works with no signal — everything is stored on your device.")}
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={tr("Search any country")}
          className="pl-9"
        />
      </div>

      <div className="space-y-4">
        {results.map((c) => (
          <section key={c.cca2} className="space-y-2">
            <h3 className="text-lg font-display">
              <CountryFlag code={c.cca2} className="mr-2" />
              {c.name}
            </h3>
            <ReferenceCard c={c} />
          </section>
        ))}
        {results.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {tr("No country matches “{0}”.", { 0: q })}
          </p>
        )}
      </div>
    </div>
  );
}
