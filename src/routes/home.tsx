import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader, LiveBadge, MinyanCard, type Minyan } from "@/components/ui-bits";
import { MapCanvas } from "@/components/MapCanvas";
import { ChevronRight, Plus, MapPin, Users, Plane, Building2, Sparkles, Shield } from "lucide-react";

export const Route = createFileRoute("/home")({
  component: Home,
});

// People near me, NOT synagogues — anonymous live signals
const nearbyMinyanim: Minyan[] = [
  { id: "1", name: "Corner of 5th & 42nd", type: "Mincha", inMin: 4, distance: "120 m", confirmed: 7, needed: 10, nusach: "Any", urgency: "almost", location: "Street" },
  { id: "2", name: "JFK Terminal 4 · Gate B22", type: "Mincha", inMin: 12, distance: "0.4 mi", confirmed: 9, needed: 10, nusach: "Sephard", urgency: "kaddish", location: "Airport" },
];

function Home() {
  return (
    <MobileFrame>
      <ScreenHeader
        title="Anywhere you are."
        subtitle="14 jews praying within 500 m"
        right={
          <span className="h-9 w-9 rounded-full bg-gold/20 flex items-center justify-center text-xs font-semibold">D</span>
        }
      />

      {/* HERO — the one true action */}
      <div className="px-6">
        <Link
          to="/create"
          className="relative block rounded-3xl overflow-hidden navy-gradient text-white p-6 shadow-lift active:scale-[0.99] transition-transform"
        >
          <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-gold/25 blur-3xl" />
          <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-sky/10 blur-3xl" />

          <div className="relative">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-white/60">
              <MapPin className="h-3 w-3 text-gold" /> You are here
            </div>
            <div className="mt-1 text-sm text-white/80 truncate">5th Avenue · New York</div>

            <h2 className="mt-5 font-display text-[34px] leading-[1.05] tracking-tight">
              Start a minyan<br />
              <span className="text-gold">on this spot.</span>
            </h2>

            <div className="mt-5 flex items-center justify-between">
              <div className="text-xs text-white/70 leading-tight">
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> ~38 jews around you
                </div>
                <div className="opacity-70 mt-0.5">Notified the second you tap.</div>
              </div>
              <div className="h-14 w-14 rounded-full gold-gradient text-gold-foreground flex items-center justify-center shadow-glow-gold">
                <Plus className="h-7 w-7" strokeWidth={2.6} />
              </div>
            </div>
          </div>
        </Link>

        {/* speed line */}
        <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-gold live-dot" />
          One tap. Under 10 seconds. No synagogue needed.
        </div>
      </div>

      {/* Live around you */}
      <div className="px-6 mt-7 mb-2 flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl">Forming around you</h2>
          <p className="text-xs text-muted-foreground">Real people, this moment — not synagogues.</p>
        </div>
        <Link to="/map" className="text-xs text-gold font-semibold">Live map</Link>
      </div>

      <div className="px-6 space-y-3">
        {nearbyMinyanim.map((m) => <MinyanCard key={m.id} m={m} />)}
      </div>

      {/* Live map preview */}
      <Link to="/map" className="mx-6 mt-4 rounded-3xl overflow-hidden border border-border shadow-soft block">
        <MapCanvas
          height="h-40"
          pins={[
            { x: 50, y: 50, tone: "gold", pulse: true, label: "you", size: "lg" },
            { x: 28, y: 35, tone: "gold", pulse: true, label: "7" },
            { x: 72, y: 55, tone: "urgent", pulse: true, label: "9" },
            { x: 55, y: 80, tone: "sky", size: "sm" },
            { x: 20, y: 70, tone: "sky", size: "sm" },
          ]}
        >
          <div className="absolute top-3 left-3"><LiveBadge>500 m radius</LiveBadge></div>
          <div className="absolute bottom-3 right-3 bg-surface/95 backdrop-blur rounded-full px-3 py-1.5 text-xs font-semibold flex items-center gap-1 shadow-soft">
            See who's nearby <ChevronRight className="h-3 w-3" />
          </div>
        </MapCanvas>
      </Link>

      {/* Context modes — secondary */}
      <div className="px-6 mt-6">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">Where are you?</div>
        <div className="grid grid-cols-4 gap-2">
          <ContextTile to="/create" icon={MapPin} label="Street" tone="gold" active />
          <ContextTile to="/flight" icon={Plane} label="Airport" tone="sky" />
          <ContextTile to="/traveler" icon={Building2} label="Hotel" tone="navy" />
          <ContextTile to="/travel" icon={Plane} label="Travel" tone="gold" />
        </div>
      </div>

      {/* Backup — secondary */}
      <div className="px-6 mt-5 grid grid-cols-2 gap-3">
        <Link to="/backup" className="rounded-2xl border border-border bg-surface p-4 flex flex-col gap-2">
          <div className="h-9 w-9 rounded-xl bg-success/15 text-success flex items-center justify-center">
            <Shield className="h-4 w-4" />
          </div>
          <div className="text-sm font-semibold leading-tight">Be the 10th</div>
          <div className="text-[11px] text-muted-foreground">Get alerted only when 1 jew is missing nearby.</div>
        </Link>
        <Link to="/notifications" className="rounded-2xl border border-border bg-surface p-4 flex flex-col gap-2 relative overflow-hidden">
          <div className="h-9 w-9 rounded-xl bg-gold/15 text-gold flex items-center justify-center">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="text-sm font-semibold leading-tight">Live alerts</div>
          <div className="text-[11px] text-muted-foreground">3 minyanim forming · 1 needs you now.</div>
        </Link>
      </div>

      {/* Insight */}
      <div className="px-6 mt-5 mb-8">
        <div className="rounded-2xl border border-gold/30 bg-gold/5 p-4 flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-gold mt-0.5" />
          <div className="text-sm leading-snug">
            <div className="font-semibold">Your presence completes minyanim.</div>
            <span className="text-muted-foreground">You helped form <strong className="text-foreground">7 street minyanim</strong> this month.</span>
          </div>
        </div>
      </div>
    </MobileFrame>
  );
}

function ContextTile({
  to, icon: Icon, label, tone, active,
}: {
  to: string;
  icon: typeof MapPin;
  label: string;
  tone: "gold" | "sky" | "navy";
  active?: boolean;
}) {
  const tones = {
    gold: "bg-gold/15 text-gold border-gold/40",
    sky: "bg-sky/30 text-navy border-sky",
    navy: "bg-navy/10 text-navy border-navy/30",
  } as const;
  return (
    <Link
      to={to}
      className={`rounded-2xl border bg-surface p-3 flex flex-col items-center gap-1.5 ${active ? "ring-2 ring-gold/40" : ""}`}
    >
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${tones[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-xs font-semibold">{label}</div>
    </Link>
  );
}
