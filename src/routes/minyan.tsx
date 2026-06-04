import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader, LiveBadge, StatusPill, TrustBadge } from "@/components/ui-bits";
import { MapCanvas } from "@/components/MapCanvas";
import { MapPin, Clock, Navigation2, Share2, Users, Check } from "lucide-react";

export const Route = createFileRoute("/minyan")({
  component: Details,
});

const people = ["D", "Y", "M", "A", "S", "L", "R", "B", "N"];

function Details() {
  return (
    <MobileFrame>
      <ScreenHeader title="Aaron's Loft Minyan" subtitle="Mincha · 12 min from now" back />

      <div className="mx-6 rounded-3xl overflow-hidden border border-border shadow-soft">
        <MapCanvas
          height="h-40"
          pins={[{ x: 50, y: 50, tone: "urgent", pulse: true, label: "!", size: "lg" }]}
        >
          <div className="absolute top-3 left-3"><LiveBadge>Kaddish</LiveBadge></div>
        </MapCanvas>
      </div>

      {/* Status row */}
      <div className="px-6 mt-4">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusPill tone="urgent">Missing 1</StatusPill>
          <StatusPill tone="gold">Nusach Ari</StatusPill>
          <StatusPill>0.4 mi · 4 min walk</StatusPill>
        </div>
      </div>

      {/* Attendance progress */}
      <div className="mx-6 mt-4 rounded-2xl bg-surface border border-border p-4 shadow-soft">
        <div className="flex items-center justify-between mb-2">
          <div className="font-display text-xl"><span className="count-up">9</span>/10</div>
          <div className="text-xs text-muted-foreground">Almost ready</div>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden shimmer">
          <div className="h-full gold-gradient" style={{ width: "90%" }} />
          <span className="shimmer-bar" />
        </div>
        <div className="mt-3 flex items-center -space-x-2">
          {people.map((p, i) => (
            <div key={i} className={`h-8 w-8 rounded-full border-2 border-background flex items-center justify-center text-xs font-bold ${i % 2 ? "bg-sky/40 text-navy" : "gold-gradient text-navy"}`}>{p}</div>
          ))}
          <div className="h-8 w-8 rounded-full border-2 border-dashed border-urgent flex items-center justify-center text-urgent text-xs ml-1">?</div>
        </div>

        {/* Live movement */}
        <div className="mt-4 -mx-1 rounded-xl bg-muted/60 p-3 flex items-center gap-3">
          <div className="relative h-8 w-8 rounded-full bg-success/15 flex items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-success/30 live-pulse-ring text-success" />
            <Users className="h-4 w-4 text-success relative" />
          </div>
          <div className="text-xs leading-tight flex-1">
            <div className="font-semibold">3 walking · 1 driving</div>
            <div className="text-muted-foreground">Average arrival in 4 min</div>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-success font-semibold">Live</span>
        </div>
      </div>

      {/* Organizer */}
      <div className="mx-6 mt-4 rounded-2xl bg-surface border border-border p-4 flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl bg-navy text-white flex items-center justify-center font-bold">A</div>
        <div className="flex-1">
          <div className="text-sm font-semibold">Aaron L. · Organizer</div>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <TrustBadge score={4.95} />
            <span>· 73 minyanim hosted</span>
          </div>
        </div>
        <Check className="h-5 w-5 text-success" />
      </div>

      {/* Details */}
      <div className="mx-6 mt-4 rounded-2xl bg-surface border border-border divide-y divide-border">
        <Row icon={Clock} label="Starts at" value="1:30 PM" />
        <Row icon={MapPin} label="Location" value="225 W 35th St · 12th floor" />
        <Row icon={Users} label="Type" value="Open · all welcome · tefillin available" />
      </div>

      {/* CTA */}
      <div className="px-6 pt-5 pb-2 space-y-2">
        <Link to="/success" className="w-full gold-gradient text-gold-foreground font-semibold py-4 rounded-2xl shadow-glow-gold flex items-center justify-center gap-2">
          <Check className="h-5 w-5" /> I'm coming
        </Link>
        <div className="grid grid-cols-2 gap-2">
          <button className="bg-surface border border-border font-medium py-3 rounded-2xl text-sm flex items-center justify-center gap-2">
            <Navigation2 className="h-4 w-4" /> Directions
          </button>
          <Link to="/share" className="bg-surface border border-border font-medium py-3 rounded-2xl text-sm flex items-center justify-center gap-2">
            <Share2 className="h-4 w-4" /> WhatsApp
          </Link>
        </div>
      </div>
    </MobileFrame>
  );
}

function Row({ icon: Icon, label, value }: any) {
  return (
    <div className="p-4 flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div className="flex-1">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-sm">{value}</div>
      </div>
    </div>
  );
}
