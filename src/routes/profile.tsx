import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader, TrustBadge, StatusPill } from "@/components/ui-bits";
import { Award, Plane, Flame, Settings, ChevronRight, Shield, CalendarCheck, Users } from "lucide-react";

export const Route = createFileRoute("/profile")({
  component: Profile,
});

function Profile() {
  return (
    <MobileFrame>
      <ScreenHeader
        title="Profile"
        right={
          <Link to="/settings" className="h-9 w-9 rounded-full bg-surface border border-border flex items-center justify-center">
            <Settings className="h-4 w-4" />
          </Link>
        }
      />

      {/* Identity card */}
      <div className="mx-6 rounded-3xl navy-gradient text-white p-5 shadow-lift relative overflow-hidden">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-gold/20 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl gold-gradient text-navy flex items-center justify-center text-xl font-bold">D</div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-xl">David Cohen</div>
            <div className="text-xs text-white/60">New York · Ashkenaz</div>
            <div className="mt-2 flex items-center gap-2">
              <TrustBadge score={4.9} />
              <StatusPill tone="gold">Verified</StatusPill>
            </div>
          </div>
        </div>
        <div className="relative grid grid-cols-3 gap-2 mt-5 pt-5 border-t border-white/10 text-center">
          <Stat label="Minyanim" value="184" />
          <Stat label="Completed" value="47" />
          <Stat label="Streak" value="12d" />
        </div>
      </div>

      {/* Badges */}
      <div className="px-6 mt-6">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Badges</div>
        <div className="grid grid-cols-3 gap-3">
          <Badge icon={Flame} tone="urgent" label="Minyan Maker" sub="Completed 25+" />
          <Badge icon={Plane} tone="sky" label="Traveler" sub="12 cities" />
          <Badge icon={Award} tone="gold" label="Trusted" sub="98% show rate" />
        </div>
      </div>

      {/* Trust panel */}
      <Link to="/trust" className="mx-6 mt-6 rounded-2xl border border-border bg-surface p-4 flex items-center gap-3 shadow-soft block">
        <div className="h-10 w-10 rounded-2xl bg-success/15 flex items-center justify-center">
          <Shield className="h-5 w-5 text-success" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold">Trust & Reliability</div>
          <div className="text-xs text-muted-foreground">Your 98% show-rate keeps the community strong</div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>

      {/* History */}
      <div className="px-6 mt-6 mb-8">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Recent participation</div>
        <div className="rounded-2xl border border-border bg-surface divide-y divide-border">
          {[
            { name: "Mincha · Park Ave Shul", time: "Today, 1:30 PM", ok: true },
            { name: "Maariv · Midtown Chabad", time: "Yesterday, 8:15 PM", ok: true },
            { name: "Shacharit · JFK T4 Chapel", time: "Sunday, 6:45 AM", ok: true },
            { name: "Mincha · Aaron's Loft", time: "Friday, 6:20 PM", ok: true },
          ].map((h, i) => (
            <div key={i} className="p-3.5 flex items-center gap-3">
              <CalendarCheck className="h-4 w-4 text-success" />
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{h.name}</div>
                <div className="text-[11px] text-muted-foreground">{h.time}</div>
              </div>
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          ))}
        </div>
      </div>
    </MobileFrame>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-display text-2xl text-gold">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-white/60 mt-0.5">{label}</div>
    </div>
  );
}

function Badge({ icon: Icon, tone, label, sub }: any) {
  const toneBg =
    tone === "urgent" ? "bg-urgent/10 text-urgent" :
    tone === "sky" ? "sky-gradient text-navy" : "gold-gradient text-gold-foreground";
  return (
    <div className="rounded-2xl border border-border bg-surface p-3 text-center">
      <div className={`mx-auto h-10 w-10 rounded-2xl flex items-center justify-center ${toneBg}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-xs font-semibold mt-2">{label}</div>
      <div className="text-[10px] text-muted-foreground">{sub}</div>
    </div>
  );
}
