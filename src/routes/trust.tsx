import { createFileRoute } from "@tanstack/react-router";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader, TrustBadge, StatusPill } from "@/components/ui-bits";
import { Shield, CheckCircle2, Award, TrendingUp, Star } from "lucide-react";

export const Route = createFileRoute("/trust")({
  component: Trust,
});

function Trust() {
  return (
    <MobileFrame>
      <ScreenHeader title="Trust & Reliability" subtitle="How the community trusts you" back />

      {/* Score hero */}
      <div className="mx-6 rounded-3xl navy-gradient text-white p-6 text-center shadow-lift relative overflow-hidden">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-gold/20 blur-2xl" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-sky/10 blur-2xl" />
        <div className="relative">
          <div className="text-[10px] uppercase tracking-[0.3em] text-white/50">Trust score</div>
          <div className="font-display text-6xl text-gold mt-2 leading-none">4.9</div>
          <div className="flex items-center justify-center gap-0.5 mt-2">
            {[1,2,3,4,5].map(i => <Star key={i} className="h-4 w-4 text-gold fill-gold" />)}
          </div>
          <div className="text-xs text-white/60 mt-2">Top 3% in your community</div>
        </div>
      </div>

      {/* Pillars */}
      <div className="px-6 mt-6 space-y-3">
        <Pillar icon={CheckCircle2} tone="success" label="Show rate" value="98%" bar={98} sub="184 of 188 minyanim attended" />
        <Pillar icon={TrendingUp} tone="gold" label="Consistency" value="12 day streak" bar={86} sub="No missed Mincha in 3 weeks" />
        <Pillar icon={Shield} tone="sky" label="Identity verified" value="ID + phone" bar={100} sub="Confirmed by 4 community members" />
        <Pillar icon={Award} tone="gold" label="Community ratings" value="4.95 / 5" bar={95} sub="73 organizers rated you" />
      </div>

      {/* How it works */}
      <div className="px-6 mt-6 mb-8">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="text-sm font-semibold">How trust works</div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Trust is built quietly — by showing up when you say you will, by helping complete minyanim, and by being verified by people who know you. It's never public-shaming, only quiet recognition.
          </p>
          <div className="mt-3 flex gap-2 flex-wrap">
            <StatusPill tone="gold">No score below 4.0</StatusPill>
            <StatusPill>Anonymous</StatusPill>
          </div>
        </div>
      </div>
    </MobileFrame>
  );
}

function Pillar({ icon: Icon, tone, label, value, bar, sub }: any) {
  const toneBg =
    tone === "success" ? "bg-success/15 text-success" :
    tone === "sky" ? "sky-gradient text-navy" : "gold-gradient text-gold-foreground";
  const barColor =
    tone === "success" ? "bg-success" :
    tone === "sky" ? "bg-sky" : "gold-gradient";
  return (
    <div className="rounded-2xl bg-surface border border-border p-4">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ${toneBg}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="font-display text-lg leading-tight">{value}</div>
        </div>
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${barColor}`} style={{ width: `${bar}%` }} />
      </div>
      <div className="text-[11px] text-muted-foreground mt-2">{sub}</div>
    </div>
  );
}
