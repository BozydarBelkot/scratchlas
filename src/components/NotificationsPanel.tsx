import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck, RefreshCw } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Button } from "./ui/button";

type Notice = { id: string; date: string; title: string; body: string };
const READ_KEY = "scratchlas.updates.read.v1";
function readIds(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(READ_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}
export function useUpdates(enabled = true) {
  const [items, setItems] = useState<Notice[]>([]);
  const [read, setRead] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetch("/updates.json", { cache: "no-store", signal });
      if (!response.ok) throw Error("Unavailable");
      const value: unknown = await response.json();
      if (
        !Array.isArray(value) ||
        value.length > 200 ||
        !value.every(
          (n) =>
            n &&
            typeof n.id === "string" &&
            typeof n.title === "string" &&
            typeof n.body === "string" &&
            typeof n.date === "string" &&
            !Number.isNaN(Date.parse(n.date)),
        )
      )
        throw Error("Invalid feed");
      if (signal?.aborted) return;
      setItems(value.sort((a, b) => b.date.localeCompare(a.date)));
      setError(false);
    } catch {
      if (!signal?.aborted) setError(true);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!enabled) return;
    setRead(readIds());
    const controller = new AbortController();
    void refresh(controller.signal);
    const sync = () => setRead(readIds());
    const focus = () => {
      void refresh(controller.signal);
    };
    window.addEventListener("storage", sync);
    window.addEventListener("scratchlas-updates-read", sync);
    window.addEventListener("focus", focus);
    const timer = window.setInterval(() => {
      if (!document.hidden) void refresh(controller.signal);
    }, 60000);
    return () => {
      controller.abort();
      clearInterval(timer);
      window.removeEventListener("storage", sync);
      window.removeEventListener("scratchlas-updates-read", sync);
      window.removeEventListener("focus", focus);
    };
  }, [refresh, enabled]);
  function markRead() {
    const ids = [...new Set([...read, ...items.map((n) => n.id)])].slice(-500);
    setRead(ids);
    try {
      localStorage.setItem(READ_KEY, JSON.stringify(ids));
      window.dispatchEvent(new Event("scratchlas-updates-read"));
    } catch {
      /* Session-only when storage is unavailable. */
    }
  }
  return {
    items,
    read,
    loading,
    error,
    refresh,
    markRead,
    unread: items.filter((n) => !read.includes(n.id)).length,
  };
}
export function NotificationsPanel({ updates }: { updates: ReturnType<typeof useUpdates> }) {
  const { tr, language } = useI18n();
  return (
    <div className="space-y-4">
      <h2>{tr("Notifications")}</h2>
      <p className="text-sm text-muted-foreground">
        {tr("News and improvements from Scratchlas.")}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => void updates.refresh()} disabled={updates.loading}>
          <RefreshCw />
          {tr("Refresh")}
        </Button>
        <Button variant="secondary" onClick={updates.markRead} disabled={!updates.unread}>
          <CheckCheck />
          {tr("Mark all as read")}
        </Button>
      </div>
      {updates.error && (
        <p role="alert" className="text-sm text-destructive">
          {tr("Updates could not be loaded. Please try again.")}
        </p>
      )}
      {updates.loading && !updates.items.length && <p role="status">{tr("Please wait…")}</p>}
      {!updates.loading && !updates.error && !updates.items.length && (
        <div className="card-surface">
          <Bell className="mb-3" />
          <p>{tr("You are all caught up.")}</p>
        </div>
      )}
      {updates.items.map((n) => (
        <article key={n.id} className="card-surface space-y-3">
          <div className="flex items-center justify-between gap-3">
            <time dateTime={n.date} className="text-xs text-muted-foreground">
              {new Date(n.date).toLocaleDateString(language)}
            </time>
            {!updates.read.includes(n.id) && (
              <span className="rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground">
                {tr("New")}
              </span>
            )}
          </div>
          <h3 className="text-xl">{tr(n.title)}</h3>
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {tr(n.body)}
          </p>
        </article>
      ))}
    </div>
  );
}
