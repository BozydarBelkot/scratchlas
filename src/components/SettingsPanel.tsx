import { useI18n, LANGUAGES, isLanguage } from "@/lib/i18n";
import { DangerZone } from "./DangerZone";
import { AccountSecurity } from "./AccountSecurity";
import { useRef, useState } from "react";
import { Check, Download, Upload, LogOut, Moon, Sun, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore, type MapTheme } from "@/lib/store";
import { MAX_BACKUP_BYTES, parseBackup, mergeBackup, type Backup } from "@/lib/backup";

const THEMES: { id: MapTheme; label: string }[] = [
  { id: "atlas", label: "Atlas" },
  { id: "ocean", label: "Ocean" },
  { id: "forest", label: "Forest" },
  { id: "mono", label: "Mono" },
];

export function SettingsPanel() {
  const { tr, language, setLanguage } = useI18n();

  const { state, setMode, setMapTheme, user, isGuest, isTestAccount, signOut, importBackup } =
    useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ name: string; backup: Backup } | null>(null);
  const [importing, setImporting] = useState(false);
  const [backupError, setBackupError] = useState("");
  const [backupNotice, setBackupNotice] = useState("");
  const preview = pending ? mergeBackup(state, pending.backup) : null;

  async function readBackup(file: File) {
    setPending(null);
    setBackupError("");
    setBackupNotice("");
    if (file.size > MAX_BACKUP_BYTES) {
      setBackupError("The backup file is too large (maximum 20 MB).");
      return;
    }
    try {
      setPending({ name: file.name, backup: parseBackup(await file.text()) });
    } catch {
      setBackupError("Invalid backup. Choose a Scratchlas JSON backup file.");
    }
  }

  async function restore() {
    if (!pending || importing) return;
    setImporting(true);
    setBackupError("");
    try {
      await importBackup(pending.backup);
      if (pending.backup.language) setLanguage(pending.backup.language);
      setPending(null);
      setBackupNotice("Backup imported successfully.");
    } catch (error) {
      setBackupError(
        error instanceof Error ? error.message : "Could not import backup. Try again.",
      );
    } finally {
      setImporting(false);
    }
  }

  async function leave() {
    setBusy(true);
    setError("");
    try {
      await signOut();
    } catch {
      setError("Could not sign out. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function exportData() {
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            { version: 1, exportedAt: new Date().toISOString(), ...state, language },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `scratchlas-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl">{tr("Settings")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {tr("Customize appearance and manage your data.")}
        </p>
      </div>
      <section className="card-surface space-y-3 p-4 sm:p-5">
        <label htmlFor="interface-language" className="block font-display text-xl">
          {tr("Interface language")}
        </label>
        <select
          id="interface-language"
          value={language}
          onChange={(event) => {
            if (isLanguage(event.target.value)) setLanguage(event.target.value);
          }}
          className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
        >
          {LANGUAGES.map(({ code, name }) => (
            <option key={code} value={code} lang={code}>
              {name}
            </option>
          ))}
        </select>
        <p className="text-sm text-muted-foreground">
          {tr("Language changes apply immediately and are saved on this device.")}
        </p>
      </section>
      <section className="card-surface space-y-5 p-4 sm:p-5" aria-labelledby="appearance-title">
        <h3 id="appearance-title" className="font-display text-xl">
          {tr("Appearance")}
        </h3>
        <div>
          <p className="mb-2 text-sm font-medium">{tr("App theme")}</p>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label={tr("App theme")}>
            {(
              [
                { id: "light", label: "Light", icon: Sun },
                { id: "dark", label: "Dark", icon: Moon },
              ] as const
            ).map((option) => (
              <Button
                key={option.id}
                variant={state.mode === option.id ? "default" : "outline"}
                aria-pressed={state.mode === option.id}
                onClick={() => setMode(option.id)}
              >
                <option.icon className="size-4" />
                {tr(option.label)}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">{tr("Map colors")}</p>
          <div
            className="grid grid-cols-2 gap-2 sm:grid-cols-4"
            role="group"
            aria-label={tr("Map colors")}
          >
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                aria-pressed={state.mapTheme === theme.id}
                onClick={() => setMapTheme(theme.id)}
                className={`rounded-xl border p-3 text-left transition-colors ${state.mapTheme === theme.id ? "border-primary bg-accent" : "border-border hover:bg-accent"}`}
              >
                <span data-maptheme={theme.id} className="mb-3 flex gap-1.5" aria-hidden>
                  {["visited", "wish", "lived"].map((status) => (
                    <span
                      key={status}
                      className="size-5 rounded-full"
                      style={{ background: `var(--map-${status})` }}
                    />
                  ))}
                </span>
                <span className="flex items-center justify-between text-sm">
                  {tr(theme.label)}
                  {state.mapTheme === theme.id && <Check className="size-4" />}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>
      <section className="card-surface space-y-4 p-4 sm:p-5" aria-labelledby="account-title">
        <h3 id="account-title" className="flex items-center gap-2 font-display text-xl">
          <UserRound className="size-5" />
          {tr("Account")}
        </h3>
        <div>
          <p className="break-all text-sm font-medium">
            {isTestAccount
              ? tr("Local test account")
              : isGuest
                ? tr("Guest mode")
                : (user?.email ?? tr("Signed-in account"))}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {isTestAccount
              ? tr(
                  "Demo profile with public credentials. Data stays in this browser, separate from guest data; it does not sync between devices.",
                )
              : isGuest
                ? tr("Your data stays in this browser. Returning to sign in does not delete it.")
                : tr("Your map and trips are linked to your account.")}
          </p>
        </div>
        <AccountSecurity />
        <Button variant="outline" disabled={busy} onClick={() => void leave()}>
          <LogOut className="size-4" />
          {busy
            ? tr("Please wait…")
            : isGuest && !isTestAccount
              ? tr("Go to sign in")
              : tr("Sign out")}
        </Button>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {tr(error)}
          </p>
        )}
      </section>
      <section className="card-surface space-y-3 p-4 sm:p-5" aria-labelledby="data-title">
        <h3 id="data-title" className="font-display text-xl">
          {tr("Your data")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {tr("Save a copy of places, trips and settings as a JSON file.")}{" "}
          {isGuest && tr("Clearing browser data deletes local records.")}
        </p>
        <Button variant="secondary" onClick={exportData}>
          <Download className="size-4" />
          {tr("Download backup")}
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          className="sr-only"
          aria-label={tr("Choose backup file")}
          disabled={importing}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void readBackup(file);
          }}
        />
        <Button
          variant="outline"
          className="sm:ml-2"
          disabled={importing}
          onClick={() => fileInput.current?.click()}
        >
          <Upload className="size-4" />
          {tr("Load backup")}
        </Button>
        {pending && preview && (
          <div className="space-y-3 rounded-xl border border-border p-3">
            <p className="break-all text-sm font-medium">{pending.name}</p>
            <p className="text-sm">
              {tr("New trips: {0} · New places: {1}", {
                0: preview.trips.length,
                1: preview.places.length,
              })}
            </p>
            <p className="text-sm text-muted-foreground">
              {tr(
                "Existing entries will be kept. Appearance and language settings will be restored from the file.",
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button disabled={importing} onClick={() => void restore()}>
                {tr(importing ? "Please wait…" : "Import backup")}
              </Button>
              <Button variant="outline" disabled={importing} onClick={() => setPending(null)}>
                {tr("Cancel")}
              </Button>
            </div>
          </div>
        )}
        {backupError && (
          <p role="alert" className="text-sm text-destructive">
            {tr(backupError)}
          </p>
        )}
        {backupNotice && (
          <p role="status" className="text-sm">
            {tr(backupNotice)}
          </p>
        )}
      </section>
      <DangerZone disabled={importing} />
    </div>
  );
}
