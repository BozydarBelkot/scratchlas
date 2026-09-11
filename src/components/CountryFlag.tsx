import { useI18n } from "@/lib/i18n";
import { BY_CCA2 } from "@/lib/countries";
import { cn } from "@/lib/utils";

export function CountryFlag({ code, className }: { code: string; className?: string }) {
  const { tr } = useI18n();

  const country = BY_CCA2[code];
  if (!country) return null;
  return (
    <img
      src={`/flags/${country.cca3.toLowerCase()}.svg`}
      alt={tr("Flag of {0}", { 0: country.name })}
      width={32}
      height={24}
      className={cn(
        "inline-block h-6 w-8 shrink-0 overflow-hidden rounded-[3px] bg-white object-cover align-middle",
        className,
      )}
    />
  );
}
