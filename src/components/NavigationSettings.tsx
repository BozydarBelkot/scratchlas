import { useState, type CSSProperties } from "react";
import { ArrowLeft, ArrowRight, EyeOff, Plus } from "lucide-react";
import { TABS, type Tab, type NavigationLayout } from "@/lib/navigation";
import { useI18n } from "@/lib/i18n";
export function NavigationStrip({
  ids,
  active,
  onSelect,
}: {
  ids: Tab[];
  active: Tab;
  onSelect: (id: Tab) => void;
}) {
  const { tr } = useI18n();
  const index = ids.indexOf(active);
  return (
    <div
      className="navigation-strip"
      style={{ "--tabs": ids.length, "--active": Math.max(0, index) } as CSSProperties}
    >
      <span
        className="navigation-highlight"
        aria-hidden="true"
        style={{ opacity: index < 0 ? 0 : 1 }}
      />
      {ids.map((id) => {
        const t = TABS.find((t) => t.id === id)!;
        return (
          <button
            key={id}
            type="button"
            aria-current={active === id ? "page" : undefined}
            onClick={() => onSelect(id)}
          >
            <t.icon className="size-5" />
            <span className="nav-label">{tr(t.label)}</span>
          </button>
        );
      })}
    </div>
  );
}
export function NavigationSettings({
  layout,
  onChange,
}: {
  layout: NavigationLayout;
  onChange: (v: NavigationLayout) => void;
}) {
  const { tr } = useI18n();
  const visible = layout.order.filter((id) => !layout.hidden.includes(id));
  const [selected, setSelected] = useState<Tab>("settings");
  const active = visible.includes(selected) ? selected : visible[0];
  const index = visible.indexOf(active);
  const move = (delta: number) => {
    const other = visible[index + delta];
    if (!other) return;
    const order = [...layout.order];
    const a = order.indexOf(active),
      b = order.indexOf(other);
    [order[a], order[b]] = [order[b], order[a]];
    onChange({ ...layout, order });
  };
  return (
    <section className="card-surface space-y-3 p-4 sm:p-5">
      <h3 className="font-display text-xl">{tr("Bottom navigation")}</h3>
      <p className="text-xs text-muted-foreground">
        {tr("Select a tab below to move or hide it. Settings stays visible.")}
      </p>
      <div className="navigation-mini">
        <NavigationStrip ids={visible} active={active} onSelect={setSelected} />
      </div>
      <div className="flex flex-wrap gap-2 navigation-edit-actions">
        <button type="button" disabled={index === 0} onClick={() => move(-1)}>
          <ArrowLeft size={15} />
          {tr("Move left")}
        </button>
        <button type="button" disabled={index === visible.length - 1} onClick={() => move(1)}>
          <ArrowRight size={15} />
          {tr("Move right")}
        </button>
        <button
          type="button"
          disabled={active === "settings"}
          onClick={() => {
            onChange({ ...layout, hidden: [...layout.hidden, active] });
            setSelected("settings");
          }}
        >
          <EyeOff size={15} />
          {tr("Hide tab")}
        </button>
      </div>
      <h4 className="text-sm font-medium">{tr("Hidden tabs")}</h4>
      <div className="flex flex-wrap gap-2 navigation-edit-actions">
        {layout.hidden.length ? (
          layout.order
            .filter((id) => layout.hidden.includes(id))
            .map((id) => {
              const t = TABS.find((t) => t.id === id)!;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    onChange({ ...layout, hidden: layout.hidden.filter((v) => v !== id) });
                    setSelected(id);
                  }}
                >
                  <t.icon size={16} />
                  {tr(t.label)}
                  <Plus size={14} />
                </button>
              );
            })
        ) : (
          <p className="text-xs text-muted-foreground">{tr("No hidden tabs")}</p>
        )}
      </div>
    </section>
  );
}
