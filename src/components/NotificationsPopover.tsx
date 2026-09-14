import { Bell, X } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { NotificationsPanel, type useUpdates } from "./NotificationsPanel";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

export function NotificationsPopover({ updates }: { updates: ReturnType<typeof useUpdates> }) {
  const { tr } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="notifications-trigger"
          aria-label={tr("Notifications")}
          title={tr("Notifications")}
        >
          <Bell size={19} strokeWidth={1.7} />
          {updates.unread > 0 && (
            <span className="notification-count">{updates.unread > 9 ? "9+" : updates.unread}</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={12}
        collisionPadding={12}
        className="notifications-popup"
        aria-label={tr("Notifications")}
      >
        <button
          type="button"
          className="notifications-close"
          onClick={() => setOpen(false)}
          aria-label={tr("Close")}
        >
          <X size={18} />
        </button>
        <NotificationsPanel updates={updates} />
      </PopoverContent>
    </Popover>
  );
}
