import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export function AccountSecurity() {
  const { user, isGuest } = useStore();
  const { tr } = useI18n();
  const [panel, setPanel] = useState<"email" | "password" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  if (isGuest || !user)
    return (
      <p className="text-xs text-muted-foreground">
        {tr("Sign in to a personal account to manage your email and password.")}
      </p>
    );
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !panel) return;
    setError("");
    setMessage("");
    if (panel === "password" && password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser(
        panel === "email" ? { email: email.trim() } : { password },
      );
      if (error) throw error;
      setMessage(
        panel === "email"
          ? "Check your email to confirm the address change. Your current address stays active until confirmation."
          : "Password changed successfully.",
      );
      setPanel(null);
      setEmail("");
      setPassword("");
      setConfirm("");
    } catch {
      setError("Could not update account details. Try again or sign in again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="flex flex-wrap gap-2">
        {(["email", "password"] as const).map((kind) => (
          <Button
            key={kind}
            variant="outline"
            disabled={busy}
            aria-expanded={panel === kind}
            onClick={() => {
              setPanel(panel === kind ? null : kind);
              setMessage("");
              setError("");
              setPassword("");
              setConfirm("");
            }}
          >
            {tr(kind === "email" ? "Change email" : "Change password")}
          </Button>
        ))}
      </div>
      {panel && (
        <form onSubmit={save} className="space-y-3 rounded-xl bg-muted/40 p-3">
          {panel === "email" ? (
            <label className="block space-y-1 text-sm">
              <span>{tr("New email address")}</span>
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={busy}
              />
            </label>
          ) : (
            <>
              <label className="block space-y-1 text-sm">
                <span>{tr("New password")}</span>
                <Input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={busy}
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span>{tr("Confirm new password")}</span>
                <Input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  disabled={busy}
                />
              </label>
              <p className="text-xs text-muted-foreground">{tr("Use at least 8 characters.")}</p>
            </>
          )}
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={
                busy ||
                (panel === "email" && email.trim().toLowerCase() === user?.email?.toLowerCase())
              }
            >
              {tr(busy ? "Please wait…" : "Save changes")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setPanel(null);
                setPassword("");
                setConfirm("");
                setError("");
              }}
            >
              {tr("Cancel")}
            </Button>
          </div>
        </form>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {tr(error)}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm">
          {tr(message)}
        </p>
      )}
    </div>
  );
}
