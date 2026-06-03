import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader, LiveBadge, MinyanCard, UrgentBanner, type Minyan } from "@/components/ui-bits";
import { MapCanvas } from "@/components/MapCanvas";
import { ChevronRight, Plane, Sparkles } from "lucide-react";

export const Route = createFileRoute("/home")({
  component: Home,
});

const nearby: Minyan[] = [
  { id: "1", name: "Park Avenue Shul", type: "Mincha", inMin: 6, distance: "0.3 mi", confirmed: 8, needed: 10, nusach: "Ashkenaz", urgency: "almost" },
  { id: "2", name: "Midtown Chabad", type: "Maariv", inMin: 28, distance: "0.6 mi", confirmed: 10, needed: 10, nusach: "Sephard", urgency: "confirmed" },
  { id: "3", name: "Aaron's Loft Minyan", type: "Mincha", inMin: 12, distance: "0.4 mi", confirmed: 9, needed: 10, nusach: "Nusach Ari", urgency: "kaddish" },
];

function Home() {
  return (
    <MobileFrame>
      <ScreenHeader
        title="Shalom, David"
        subtitle="3 minyanim forming near you"
        right={
          <div className="flex items-center gap-2">
            <span className="h-9 w-9 rounded-full bg-gold/20 flex items-center justify-center text-xs font-semibold">D</span>
          </div>
        }
      />

      <UrgentBanner>
        <strong className="font-semibold">Only 1 person missing</strong> for Mincha at Aaron's Loft — 4 min walk.
        <Link to="/minyan" className="ml-1 text-urgent underline underline-offset-2 font-semibold">I'm coming</Link>
      </UrgentBanner>

      {/* Live map preview */}
      <Link to="/map" className="mx-6 rounded-3xl overflow-hidden border border-border shadow-soft block">
        <MapCanvas
          height="h-44"
          pins={[
            { x: 30, y: 35, tone: "gold", pulse: true, label: "8" },
            { x: 70, y: 50, tone: "urgent", pulse: true, label: "!" },
            { x: 55, y: 75, tone: "success", label: "✓" },
            { x: 22, y: 70, tone: "sky", size: "sm" },
          ]}
        >
          <div className="absolute top-3 left-3"><LiveBadge>LIVE NEARBY</LiveBadge></div>
          <div className="absolute bottom-3 right-3 bg-surface/95 backdrop-blur rounded-full px-3 py-1.5 text-xs font-semibold flex items-center gap-1 shadow-soft">
            Open map <ChevronRight className="h-3 w-3" />
          </div>
        </MapCanvas>
      </Link>

      {/* Smart row */}
      <div className="px-6 mt-5 mb-2 flex items-center justify-between">
        <h2 className="font-display text-lg">Forming near you</h2>
        <Link to="/map" className="text-xs text-muted-foreground">See all</Link>
      </div>
      <div className="px-6 space-y-3">
        {nearby.map((m) => <MinyanCard key={m.id} m={m} />)}
      </div>

      {/* Traveler tile */}
      <div className="px-6 mt-6">
        <Link to="/traveler" className="block relative rounded-2xl overflow-hidden navy-gradient text-white p-5 shadow-lift">
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-gold/20 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl gold-gradient text-navy flex items-center justify-center">
              <Plane className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-xs uppercase tracking-wider text-white/60">Traveler Mode</div>
              <div className="font-display text-lg">Flying to Tel Aviv tomorrow?</div>
              <div className="text-xs text-white/70">42 minyanim within walking distance of your hotel.</div>
            </div>
            <ChevronRight className="h-4 w-4 text-white/60" />
          </div>
        </Link>
      </div>

      {/* Insight */}
      <div className="px-6 mt-6 mb-8">
        <div className="rounded-2xl border border-gold/30 bg-gold/5 p-4 flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-gold mt-0.5" />
          <div className="text-sm leading-snug">
            <div className="font-semibold">Your presence matters.</div>
            <span className="text-muted-foreground">You've helped complete <strong className="text-foreground">7 minyanim</strong> this month.</span>
          </div>
        </div>
      </div>
    </MobileFrame>
  );
}
