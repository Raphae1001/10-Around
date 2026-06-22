import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader, StatusPill } from "@/components/ui-bits";
import { Sunset, Check, MapPin, Calendar } from "lucide-react";

export const Route = createFileRoute("/shabbat")({
  component: Shabbat,
});

const plan = [
  { day: "Fri", label: "Mincha + Kabbalat Shabbat", time: "16:42", place: "Park Avenue Shul", confirmed: true },
  { day: "Fri", label: "Maariv", time: "18:05", place: "Park Avenue Shul", confirmed: true },
  { day: "Sat", label: "Shacharit", time: "9:00", place: "Aaron's Loft", confirmed: false },
  { day: "Sat", label: "Mincha + Seudah Shlishit", time: "16:20", place: "Park Avenue Shul", confirmed: false },
  { day: "Sat", label: "Maariv + Havdalah", time: "17:48", place: "Park Avenue Shul", confirmed: false },
];

function Shabbat() {
  return (
    <MobileFrame bg="navy">
      <div className="px-6 pt-2 pb-4 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-white/50">Shabbat Mode</div>
          <h1 className="font-display text-2xl mt-1">Parashat Vayetzei</h1>
        </div>
        <Link to="/home" className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center">×</Link>
      </div>

      {/* Candle lighting */}
      <div className="mx-6 rounded-3xl bg-white/5 border border-white/10 p-5 backdrop-blur relative overflow-hidden">
        <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-gold/20 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl gold-gradient text-navy flex items-center justify-center">
            <Sunset className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/60">Candle lighting</div>
            <div className="font-display text-3xl">16:24</div>
            <div className="text-xs text-white/70">Shabbat ends 17:48 · Havdalah</div>
          </div>
        </div>
      </div>

      {/* Plan section */}
      <div className="bg-background text-foreground rounded-t-3xl mt-6 flex-1 px-6 pt-6 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gold" /> Your Shabbat plan
          </h2>
          <StatusPill tone="success">2/5 set</StatusPill>
        </div>

        <div className="rounded-2xl bg-surface border border-border divide-y divide-border">
          {plan.map((p, i) => (
            <div key={i} className="p-4 flex items-center gap-3">
              <div className="text-center w-10">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{p.day}</div>
                <div className="font-display text-base leading-none">{p.time}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{p.label}</div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                  <MapPin className="h-3 w-3" /> {p.place}
                </div>
              </div>
              {p.confirmed ? (
                <span className="h-7 w-7 rounded-full bg-success/15 text-success flex items-center justify-center">
                  <Check className="h-4 w-4" />
                </span>
              ) : (
                <button className="text-xs font-semibold text-gold border border-gold/40 rounded-full px-3 py-1">
                  Pre-confirm
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Notice */}
        <div className="mt-5 rounded-2xl border border-dashed border-border p-4 text-xs text-muted-foreground leading-relaxed">
          MinyaNow pauses all real-time notifications from candle lighting to Havdalah.
          Coordinate now — rest then.
        </div>

        <button className="mt-5 w-full gold-gradient text-gold-foreground font-semibold py-4 rounded-2xl shadow-glow-gold">
          Pre-confirm all remaining
        </button>
      </div>
    </MobileFrame>
  );
}
