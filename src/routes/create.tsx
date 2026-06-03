import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader } from "@/components/ui-bits";
import { Sunrise, Sun, Moon, MapPin, Users, Zap } from "lucide-react";

export const Route = createFileRoute("/create")({
  component: Create,
});

function Create() {
  const [prayer, setPrayer] = useState("Mincha");
  const [nusach, setNusach] = useState("Ashkenaz");
  const [participants, setParticipants] = useState(8);

  const prayers = [
    { name: "Shacharit", icon: Sunrise },
    { name: "Mincha", icon: Sun },
    { name: "Maariv", icon: Moon },
  ];

  return (
    <MobileFrame>
      <ScreenHeader title="Create a minyan" subtitle="Takes under 10 seconds" />

      <div className="px-6 space-y-5 pb-4">
        {/* Prayer */}
        <Section label="Prayer">
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
        </Section>

        {/* Time */}
        <Section label="Start time">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar">
            {["Now", "+10 min", "+30 min", "1:30 PM", "6:45 PM", "Custom"].map((t, i) => (
              <button
                key={t}
                className={`shrink-0 rounded-2xl px-4 py-3 text-sm font-medium border ${
                  i === 1 ? "bg-foreground text-background border-foreground" : "bg-surface border-border"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </Section>

        {/* Location */}
        <Section label="Location">
          <div className="rounded-2xl border border-border bg-surface p-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-sky/30 flex items-center justify-center">
              <MapPin className="h-4 w-4 text-navy" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">Current location</div>
              <div className="text-xs text-muted-foreground truncate">Empire State Building, NYC</div>
            </div>
            <button className="text-xs font-semibold text-gold">Change</button>
          </div>
        </Section>

        {/* Nusach */}
        <Section label="Nusach">
          <div className="flex gap-2 flex-wrap">
            {["Ashkenaz", "Sephard", "Nusach Ari", "Edot Mizrach", "Any"].map((n) => {
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
        </Section>

        {/* Participants */}
        <Section label={`Estimated nearby participants · ${participants}`}>
          <input
            type="range" min={1} max={20} value={participants}
            onChange={(e) => setParticipants(+e.target.value)}
            className="w-full accent-[oklch(0.82_0.14_80)]"
          />
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
            <span>1</span><span>10 (minimum)</span><span>20</span>
          </div>
        </Section>

        {/* Note */}
        <Section label="Note (optional)">
          <textarea
            rows={2}
            placeholder="Bring tefillin · Yahrzeit for Avraham ben Yitzchak"
            className="w-full rounded-2xl border border-border bg-surface p-3 text-sm outline-none focus:border-gold"
          />
        </Section>

        {/* Smart preview */}
        <div className="rounded-2xl bg-gold/10 border border-gold/30 p-4 flex items-start gap-3">
          <Zap className="h-4 w-4 text-gold mt-0.5" />
          <div className="text-xs leading-snug">
            <strong>~38 nearby Jews</strong> will be notified instantly.
            <div className="text-muted-foreground">Based on real-time location data within 0.8 mi.</div>
          </div>
        </div>
      </div>

      <div className="sticky bottom-24 px-6 pb-2">
        <Link
          to="/success"
          className="flex items-center justify-center gap-2 w-full gold-gradient text-gold-foreground font-semibold py-4 rounded-2xl shadow-glow-gold"
        >
          <Users className="h-5 w-5" /> Start minyan now
        </Link>
      </div>
    </MobileFrame>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">{label}</div>
      {children}
    </div>
  );
}
