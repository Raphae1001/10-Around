import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileFrame } from "@/components/MobileFrame";
import { MapCanvas } from "@/components/MapCanvas";
import { LiveBadge, MinyanCard, StatusPill, type Minyan } from "@/components/ui-bits";
import { Search, Layers, Locate, Filter } from "lucide-react";

export const Route = createFileRoute("/map")({
  component: LiveMap,
});

const visible: Minyan[] = [
  { id: "1", name: "Park Avenue Shul", type: "Mincha", inMin: 6, distance: "0.3 mi", confirmed: 8, needed: 10, nusach: "Ashkenaz", urgency: "almost" },
  { id: "3", name: "Aaron's Loft Minyan", type: "Mincha", inMin: 12, distance: "0.4 mi", confirmed: 9, needed: 10, nusach: "Nusach Ari", urgency: "kaddish" },
];

function LiveMap() {
  return (
    <MobileFrame bg="map">
      {/* search bar overlay */}
      <div className="px-4 pt-2">
        <div className="bg-surface/95 backdrop-blur rounded-2xl shadow-lift border border-border p-2 flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <input
            placeholder="Search city, synagogue, or address"
            className="bg-transparent text-sm flex-1 outline-none placeholder:text-muted-foreground"
          />
          <button className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center">
            <Filter className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto hide-scrollbar">
          {["All", "Shacharit", "Mincha", "Maariv", "Kaddish", "Forming"].map((f, i) => (
            <button
              key={f}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium border ${
                i === 0 ? "bg-foreground text-background border-foreground" : "bg-surface/90 border-border"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="relative flex-1 mt-3">
        <MapCanvas
          height="h-full"
          className="absolute inset-0"
          pins={[
            { x: 25, y: 25, tone: "gold", pulse: true, label: "8", size: "lg" },
            { x: 72, y: 30, tone: "urgent", pulse: true, label: "!" },
            { x: 55, y: 55, tone: "success", label: "✓" },
            { x: 18, y: 65, tone: "sky", size: "sm" },
            { x: 80, y: 78, tone: "gold", label: "6" },
            { x: 38, y: 80, tone: "sky", size: "sm" },
          ]}
        >
          <div className="absolute top-3 right-3 flex flex-col gap-2">
            <button className="h-10 w-10 rounded-xl bg-surface/95 border border-border shadow-soft flex items-center justify-center">
              <Layers className="h-4 w-4" />
            </button>
            <button className="h-10 w-10 rounded-xl bg-surface/95 border border-border shadow-soft flex items-center justify-center">
              <Locate className="h-4 w-4 text-sky" />
            </button>
          </div>

          <div className="absolute top-3 left-3"><LiveBadge>12 LIVE</LiveBadge></div>
        </MapCanvas>

        {/* Bottom sheet */}
        <div className="absolute left-0 right-0 bottom-0 bg-surface rounded-t-3xl border-t border-border shadow-lift px-5 pt-3 pb-6">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-muted mb-3" />
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-display text-xl leading-tight">Live near you</h2>
              <p className="text-xs text-muted-foreground">12 minyanim · 3 need participants</p>
            </div>
            <StatusPill tone="gold">2 forming</StatusPill>
          </div>
          <div className="space-y-3 max-h-56 overflow-y-auto hide-scrollbar">
            {visible.map((m) => <MinyanCard key={m.id} m={m} compact />)}
            <Link to="/create" className="block text-center text-sm font-semibold text-gold py-2">
              + Don't see one? Start a minyan here
            </Link>
          </div>
        </div>
      </div>
    </MobileFrame>
  );
}
