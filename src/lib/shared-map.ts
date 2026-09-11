import { parseBackup } from "./backup";
import type { AppState } from "./store";

const MAX_BYTES = 2_000_000;
const MAX_LINK = 60_000;
export function sharedSnapshot(state: AppState) {
  return {
    version: 1,
    mode: state.mode,
    mapTheme: state.mapTheme,
    trips: state.trips,
    places: state.places.map((place) => ({ ...place, media: [] })),
  };
}
export async function createSharedLink(state: AppState, origin: string) {
  const raw = new TextEncoder().encode(JSON.stringify(sharedSnapshot(state)));
  if (raw.length > MAX_BYTES) throw new Error("This map is too large to share as a link.");
  let bytes: Uint8Array = raw;
  let format = "j1";
  if (typeof CompressionStream !== "undefined") {
    const stream = new Blob([raw]).stream().pipeThrough(new CompressionStream("gzip"));
    bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    format = "g1";
  }
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const payload = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const link = `${origin}/#view=${format}.${payload}`;
  if (link.length > MAX_LINK) throw new Error("This map is too large to share as a link.");
  return link;
}
export async function readSharedLink(hash: string): Promise<AppState> {
  if (hash.length > MAX_LINK) throw new Error("Invalid shared map");
  const match = /^#view=(g1|j1)\.([A-Za-z0-9_-]+)$/.exec(hash);
  if (!match) throw new Error("Invalid shared map");
  const bytes = Uint8Array.from(atob(match[2].replace(/-/g, "+").replace(/_/g, "/")), (c) =>
    c.charCodeAt(0),
  );
  let stream: ReadableStream<Uint8Array<ArrayBuffer>> = new Blob([bytes]).stream();
  if (match[1] === "g1") stream = stream.pipeThrough(new DecompressionStream("gzip"));
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let size = 0,
    text = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) throw new Error("Invalid shared map");
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    await reader.cancel().catch(() => {});
  }
  const parsed = parseBackup(text);
  return {
    mode: parsed.mode,
    mapTheme: parsed.mapTheme,
    trips: parsed.trips,
    places: parsed.places.map((place) => ({ ...place, media: [] })),
  };
}
