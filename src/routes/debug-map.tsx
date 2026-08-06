import { createFileRoute } from "@tanstack/react-router";
import { StoreProvider, type Place } from "@/lib/store";
import { WorldMap } from "@/components/WorldMap";

// Temporary visual-verification route for pin styling (delete after use).
const demoPins: Place[] = [
  { id: "p1", name: "Rome", kind: "city", country: "IT", status: "visited", lat: 41.9, lng: 12.5, media: [], createdAt: 1 },
  { id: "p2", name: "Florence", kind: "city", country: "IT", status: "visited", lat: 43.77, lng: 11.25, media: [], createdAt: 2 },
  { id: "p3", name: "Tuscany", kind: "region", country: "IT", status: "visited", lat: 43.35, lng: 11.0, media: [], createdAt: 3 },
  { id: "p4", name: "Sicily", kind: "region", country: "IT", status: "wish", lat: 37.6, lng: 14.0, media: [], createdAt: 4 },
  { id: "p5", name: "Colosseum", kind: "attraction", country: "IT", status: "visited", lat: 41.89, lng: 12.49, media: [], createdAt: 5 },
  { id: "p6", name: "Pompeii", kind: "attraction", country: "IT", status: "wish", lat: 40.75, lng: 14.49, media: [], createdAt: 6 },
];

export const Route = createFileRoute("/debug-map")({
  component: () => (
    <StoreProvider>
      <div className="fixed inset-0">
        <WorldMap onSelect={() => {}} pins={demoPins} />
      </div>
    </StoreProvider>
  ),
});
