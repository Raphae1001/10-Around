import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader, LiveBadge, StatusPill } from "@/components/ui-bits";
import { Flame, Users, CheckCircle2, Bell, Heart } from "lucide-react";

export const Route = createFileRoute("/notifications")({
  component: Notifications,
});

const items = [
  {
    icon: Flame, tone: "urgent",
    title: "Only 1 person missing",
    body: "Mincha at Aaron's Loft · 4 min walk · starts in 12 min",
    time: "now", cta: "I'm coming",
  },
  {
    icon: Heart, tone: "urgent",
    title: "Kaddish request near you",
    body: "Yonatan needs a minyan for his father's shloshim.",
    time: "3 min ago", cta: "Help complete",
  },
  {
    icon: Users, tone: "gold",
    title: "Your presence completes a minyan",
    body: "You are 0.4 mi away from Park Avenue Shul.",
    time: "8 min ago", cta: "Join",
  },
  {
    icon: CheckCircle2, tone: "success",
    title: "Maariv confirmed",
    body: "Midtown Chabad reached 10 confirmed participants.",
    time: "20 min ago",
  },
  {
    icon: Bell, tone: "sky",
    title: "Minyan starting soon",
    body: "Shacharit at Lincoln Square in 25 minutes.",
    time: "1h ago",
  },
];

function Notifications() {
  return (
    <MobileFrame>
      <ScreenHeader
        title="Alerts"
        subtitle="Smart, real-time"
        right={<LiveBadge>LIVE</LiveBadge>}
      />

      <div className="px-6 flex gap-2 mb-4 overflow-x-auto hide-scrollbar">
        {["All", "Urgent", "Kaddish", "Confirmed", "Nearby"].map((f, i) => (
          <button key={f} className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium border ${i === 0 ? "bg-foreground text-background border-foreground" : "bg-surface border-border"}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="px-6 space-y-3 pb-8">
        {items.map((n, i) => {
          const Icon = n.icon;
          const toneBg =
            n.tone === "urgent" ? "bg-urgent/10 text-urgent" :
            n.tone === "gold" ? "gold-gradient text-gold-foreground" :
            n.tone === "success" ? "bg-success/15 text-success" : "bg-accent text-accent-foreground";
          const isUrgent = n.tone === "urgent";
          return (
            <div key={i} className={`rounded-2xl border p-4 shadow-soft ${isUrgent ? "border-urgent/30 bg-urgent/5" : "border-border bg-surface"}`}>
              <div className="flex items-start gap-3">
                <div className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 ${toneBg}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold leading-tight">{n.title}</h3>
                    <span className="text-[10px] text-muted-foreground shrink-0">{n.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug">{n.body}</p>
                  {n.cta && (
                    <div className="mt-3 flex items-center gap-2">
                      <Link to="/minyan" className={`text-xs font-semibold rounded-xl px-3.5 py-2 ${isUrgent ? "bg-urgent text-white" : "bg-foreground text-background"}`}>
                        {n.cta}
                      </Link>
                      <button className="text-xs text-muted-foreground px-2">Snooze</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <Link to="/kaddish" className="block">
          <div className="rounded-2xl navy-gradient text-white p-4 shadow-lift flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center">
              <Heart className="h-5 w-5 text-gold" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">Request a Kaddish minyan</div>
              <div className="text-xs text-white/60">For yahrzeit, shloshim, or shiva</div>
            </div>
            <StatusPill tone="gold">Open</StatusPill>
          </div>
        </Link>
      </div>
    </MobileFrame>
  );
}
