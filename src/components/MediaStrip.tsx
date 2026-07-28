import { useRef, useState } from "react";
import { Camera, Trash2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore, uid, type Place } from "@/lib/store";

async function compress(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }
  const bitmap = await createImageBitmap(file);
  const max = 900;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.72);
}

export function MediaStrip({ place }: { place: Place }) {
  const { addMedia, removeMedia } = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="label-caps">Photos & video</span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() => input.current?.click()}
          className="h-7 gap-1.5 px-2 text-xs"
        >
          <Camera className="size-3.5" /> {busy ? "Adding…" : "Upload"}
        </Button>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          setBusy(true);
          for (const f of files) {
            try {
              const url = await compress(f);
              addMedia(place.id, {
                id: uid(),
                url,
                kind: f.type.startsWith("video/") ? "video" : "photo",
                caption: f.name,
              });
            } catch {
              /* skip */
            }
          }
          setBusy(false);
          e.target.value = "";
        }}
      />
      {place.media.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No media yet — add geotagged shots from this place.
        </p>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {place.media.map((m) => (
            <div
              key={m.id}
              className="relative size-20 shrink-0 overflow-hidden rounded-md border border-border bg-muted"
            >
              {m.kind === "photo" ? (
                <img src={m.url} alt={m.caption ?? place.name} className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center">
                  <Video className="size-5 text-muted-foreground" />
                </div>
              )}
              <button
                type="button"
                aria-label="Remove media"
                onClick={() => removeMedia(place.id, m.id)}
                className="absolute right-0.5 top-0.5 rounded bg-background/85 p-1 text-foreground"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
