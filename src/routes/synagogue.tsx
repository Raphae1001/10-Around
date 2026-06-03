import { createFileRoute } from "@tanstack/react-router";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader, StatusPill, TrustBadge } from "@/components/ui-bits";
import { ShieldCheck, MapPin, Navigation2, Star } from "lucide-react";

export const Route = createFileRoute("/synagogue")({
  component: Syn,
});

function Syn() {
  return (
    <MobileFrame>
      <ScreenHeader title="Park Avenue Shul" subtitle="Verified community · NYC" back />

      <div className="mx-6 rounded-3xl overflow-hidden border border-border shadow-soft">
        <div className="h-36 navy-gradient relative">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, oklch(0.82 0.14 80) 0, transparent 40%), radial-gradient(circle at 80% 60%, oklch(0.78 0.07 240) 0, transparent 40%)" }} />
          <div className="absolute bottom-3 left-4 flex items-center gap-2">
            <StatusPill tone="gold"><ShieldCheck className="h-3 w-3 mr-1" />Verified</StatusPill>
            <TrustBadge score={4.9} />
          </div>
        </div>
        <div className="p-4 bg-surface flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <div className="text-sm flex-1">50 E 87th St, New York · Ashkenaz</div>
          <button className="text-xs font-semibold text-gold flex items-center gap-1">
            <Navigation2 className="h-3 w-3" /> Go
          </button>
        </div>
      </div>

      {/* schedule */}
      <div className="px-6 mt-5">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Today's schedule</div>
        <div className="rounded-2xl bg-surface border border-border divide-y divide-border">
          {[
            { p: "Shacharit", t: "6:45 AM", c: 18, s: "confirmed" },
            { p: "Mincha", t: "1:30 PM", c: 8, s: "almost" },
            { p: "Maariv", t: "6:45 PM", c: 0, s: "open" },
          ].map((r, i) => (
            <div key={i} className="p-4 flex items-center gap-3">
              <div className="font-display text-lg w-16">{r.t}</div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{r.p}</div>
                <div className="text-xs text-muted-foreground">
                  {r.s === "confirmed" ? `${r.c} confirmed · ready` : r.s === "almost" ? `${r.c}/10 · 2 missing` : "RSVP now"}
                </div>
              </div>
              <StatusPill tone={r.s === "confirmed" ? "success" : r.s === "almost" ? "gold" : "sky"}>
                {r.s === "confirmed" ? "Confirmed" : r.s === "almost" ? "Almost" : "Open"}
              </StatusPill>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 mt-5">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Community updates</div>
        <div className="rounded-2xl bg-surface border border-border p-4 text-sm">
          <p>Kiddush sponsored this Shabbat by the Goldstein family in honor of their son's bar mitzvah. All welcome.</p>
          <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
            <span>Posted 2h ago</span>
            <Star className="h-3.5 w-3.5 text-gold fill-gold" />
          </div>
        </div>
      </div>
    </MobileFrame>
  );
}
