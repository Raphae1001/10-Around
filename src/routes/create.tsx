import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader } from "@/components/ui-bits";
import { Sunrise, Sun, Moon, MapPin, Users, Zap, ChevronDown, Crosshair } from "lucide-react";

export const Route = createFileRoute("/create")({
  component: Create,
});

function Create() {
  const [prayer, setPrayer] = useState("Mincha");
  const [when, setWhen] = useState("Now");
  const [advanced, setAdvanced] = useState(false);
  const [nusach, setNusach] = useState("Any");

  const prayers = [
    { name: "Shacharit", icon: Sunrise },
    { name: "Mincha", icon: Sun },
    { name: "Maariv", icon: Moon },
  ];

  return (
    <MobileFrame>
      <ScreenHeader title="Start a minyan here" subtitle="Right where you stand · under 10 sec" back />

      <div className="px-6 space-y-5 pb-4">
        {/* GIANT location confirmation — the soul of the app */}
        <div className="relative rounded-3xl overflow-hidden border border-gold/30 bg-gold/5 p-5">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gold/20 blur-3xl" />
          <div className="relative flex items-start gap-3">
            <div className="h-12 w-12 rounded-2xl gold-gradient text-navy flex items-center justify-center shrink-0">
              <Crosshair className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Live location</div>
              <div className="font-display text-xl leading-tight mt-0.5">5th Avenue · NYC</div>
              <div className="text-xs text-muted-foreground mt-0.5 truncate">Sidewalk · between 42nd & 43rd St</div>
              <button className="text-[11px] font-semibold text-gold mt-1.5">Adjust the spot →</button>
            </div>
          </div>
        </div>

        {/* Prayer — only 3 huge taps */}
        <div className="grid grid-cols-3 gap-2">
          {prayers.map(({ name, icon: Icon }) => {
            const active = prayer === name;
            return (
              <button
                key={name}
                onClick={() => setPrayer(name)}
                className={`flex flex-col items-center gap-2 py-4 rounded-2xl border transition-all ${
                  active ? "border-gold bg-gold/10 shadow-soft" : "border-border bg-surface"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "text-gold" : "text-muted-foreground"}`} />
                <span className="text-xs font-semibold">{name}</span>
              </button>
            );
          })}
        </div>

        {/* Time — Now is hero */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-1 px-1">
          {["Now", "+5 min", "+15 min", "+30 min", "Custom"].map((t) => {
            const a = when === t;
            return (
              <button
                key={t}
                onClick={() => setWhen(t)}
                className={`shrink-0 rounded-2xl px-4 py-3 text-sm font-semibold border transition-all ${
                  a
                    ? "gold-gradient text-gold-foreground border-transparent shadow-glow-gold"
                    : "bg-surface border-border text-muted-foreground"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>

        {/* Smart preview — the WOW */}
        <div className="rounded-2xl bg-navy/[0.04] border border-border p-4 flex items-start gap-3">
          <Zap className="h-4 w-4 text-gold mt-0.5" />
          <div className="text-xs leading-snug">
            <strong className="text-foreground">~38 jews</strong> within 500 m will be pinged the second you start.
            <div className="text-muted-foreground mt-0.5">Average completion in your area: <strong className="text-foreground">6 min</strong>.</div>
          </div>
        </div>

        {/* Advanced */}
        <button
          onClick={() => setAdvanced(!advanced)}
          className="w-full flex items-center justify-between text-xs font-semibold text-muted-foreground py-1"
        >
          More options (optional)
          <ChevronDown className={`h-4 w-4 transition-transform ${advanced ? "rotate-180" : ""}`} />
        </button>

        {advanced && (
          <div className="space-y-4 pt-1">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">Nusach</div>
              <div className="flex gap-2 flex-wrap">
                {["Any", "Ashkenaz", "Sephard", "Nusach Ari", "Edot Mizrach"].map((n) => {
                  const a = nusach === n;
                  return (
                    <button
                      key={n}
                      onClick={() => setNusach(n)}
                      className={`rounded-full px-3.5 py-2 text-xs font-medium border ${
                        a ? "bg-foreground text-background border-foreground" : "bg-surface border-border"
                      }`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">Note (optional)</div>
              <textarea
                rows={2}
                placeholder="Bring tefillin · Yahrzeit for Avraham ben Yitzchak"
                className="w-full rounded-2xl border border-border bg-surface p-3 text-sm outline-none focus:border-gold"
              />
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-border bg-surface p-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-sky/30 flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-navy" />
                </div>
                <div className="text-sm">
                  <div className="font-semibold leading-tight">Visible to passers-by</div>
                  <div className="text-[11px] text-muted-foreground">Show this pin on the public live map</div>
                </div>
              </div>
              <div className="h-6 w-10 rounded-full bg-gold relative">
                <span className="absolute right-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mega CTA */}
      <div className="sticky bottom-24 px-6 pb-2">
        <Link
          to="/success"
          className="flex items-center justify-center gap-2 w-full gold-gradient text-gold-foreground font-semibold py-5 rounded-2xl shadow-glow-gold text-base"
        >
          <Users className="h-5 w-5" /> Start {prayer.toLowerCase()} here · now
        </Link>
        <p className="text-center text-[11px] text-muted-foreground mt-2">
          A pin drops on this exact spot. The 9 closest jews get pinged.
        </p>
      </div>
    </MobileFrame>
  );
}
