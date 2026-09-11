import { useState } from "react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import type { ResetScope } from "@/lib/reset-data";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "./ui/alert-dialog";

const ACTIONS: { scope: ResetScope; title: string; description: string }[] = [
  {
    scope: "trips",
    title: "Reset trips",
    description:
      "Deletes all journal trips and unlinks places from them. Country and place marks are kept.",
  },
  {
    scope: "places",
    title: "Reset map marks",
    description:
      "Deletes all country and place marks, including their notes and media. Journal trips and planned stops are kept.",
  },
  {
    scope: "all",
    title: "Delete all data",
    description:
      "Deletes trips, marks, notes and media in the current profile and resets appearance and language. The account itself is kept.",
  },
];
export function DangerZone({ disabled = false }: { disabled?: boolean }) {
  const { resetData, isGuest } = useStore();
  const { tr, setLanguage } = useI18n();
  const [selected, setSelected] = useState<(typeof ACTIONS)[number] | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function remove() {
    if (!selected || confirmation !== "DELETE" || busy) return;
    setBusy(true);
    setError("");
    try {
      await resetData(selected.scope);
      if (selected.scope === "all") setLanguage("en");
      setSelected(null);
      setNotice("Data reset completed.");
    } catch {
      setError("Could not delete data. Try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="space-y-4 rounded-2xl border border-destructive/50 p-4 sm:p-5"
      aria-labelledby="danger-title"
    >
      <h3 id="danger-title" className="font-display text-xl text-destructive">
        {tr("Danger zone")}
      </h3>
      <p className="text-sm text-muted-foreground">
        {tr(
          "These actions cannot be undone. Download a backup first. Only the current profile is affected.",
        )}
      </p>
      {ACTIONS.map((action) => (
        <div key={action.scope} className="space-y-2 border-t border-border pt-3">
          <p className="text-sm text-muted-foreground">{tr(action.description)}</p>
          <Button
            variant="destructive"
            disabled={disabled || busy}
            onClick={() => {
              setSelected(action);
              setConfirmation("");
              setError("");
              setNotice("");
            }}
          >
            {tr(action.title)}
          </Button>
        </div>
      ))}
      {notice && (
        <p role="status" className="text-sm">
          {tr(notice)}
        </p>
      )}
      <AlertDialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open && !busy) setSelected(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tr(selected?.title ?? "Danger zone")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tr(selected?.description ?? "")}{" "}
              {tr(
                isGuest
                  ? "This deletes data from the current local profile."
                  : "This deletes data from your signed-in account, including the cloud copy.",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label htmlFor="delete-confirmation" className="text-sm">
            {tr("Type DELETE to confirm.")}
          </label>
          <Input
            id="delete-confirmation"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
            disabled={busy}
          />
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {tr(error)}
            </p>
          )}
          <AlertDialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => setSelected(null)}>
              {tr("Cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={confirmation !== "DELETE" || busy}
              onClick={() => void remove()}
            >
              {tr(busy ? "Please wait…" : "Confirm deletion")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
