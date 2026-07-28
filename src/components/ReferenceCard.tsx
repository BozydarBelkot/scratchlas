import { Banknote, Droplets, Phone, Plug, Car, MapPin } from "lucide-react";
import type { CountryInfo } from "@/lib/countries";
import { TAP_WATER_LABEL } from "@/lib/refdata";

const waterTone: Record<string, string> = {
  safe: "text-lived",
  caution: "text-visited",
  unsafe: "text-destructive",
  unknown: "text-muted-foreground",
};

function Row({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <div className="label-caps">{label}</div>
        <div className={`text-sm leading-snug ${tone ?? ""}`}>{value}</div>
      </div>
    </div>
  );
}

export function ReferenceCard({ c }: { c: CountryInfo }) {
  const e = c.extra;
  return (
    <div className="card-surface px-4 py-1">
      <div className="divide-y divide-border">
        <Row icon={<Phone className="size-4" />} label="Emergency" value={e.emergency} />
        <Row
          icon={<Car className="size-4" />}
          label="Driving side"
          value={c.drivingSide === "left" ? "Left-hand side" : "Right-hand side"}
        />
        <Row
          icon={<Plug className="size-4" />}
          label="Power"
          value={`Type ${e.plugs.join(" / ")} · ${e.voltage}`}
        />
        <Row
          icon={<Droplets className="size-4" />}
          label="Tap water"
          value={TAP_WATER_LABEL[e.tapWater]}
          tone={waterTone[e.tapWater]}
        />
        <Row icon={<Banknote className="size-4" />} label="Currency" value={c.currency} />
        <Row
          icon={<MapPin className="size-4" />}
          label="Capital · dial code"
          value={`${c.capital} · ${c.dial}`}
        />
      </div>
    </div>
  );
}
