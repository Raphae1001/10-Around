import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader } from "@/components/ui-bits";
import { Sunrise, Sun, Moon, MapPin, Users, Zap, Crosshair, Plane, Building2, Minus, Plus } from "lucide-react";

type Context = "Street" | "Airport" | "Hotel" | "Travel";

export const Route = createFileRoute("/create")({
  validateSearch: (s: Record<string, unknown>): { ctx?: Context } => ({
    ctx: (["Street", "Airport", "Hotel", "Travel"] as const).includes(s.ctx as Context)
      ? (s.ctx as Context)
      : undefined,
  }),
  component: Create,
});

function Create() {
  const { ctx: initialCtx } = Route.useSearch();
  const [ctx, setCtx] = useState<Context>(initialCtx ?? "Street");
  const [prayer, setPrayer] = useState("Mincha");
  const [when, setWhen] = useState("Now");
  const [present, setPresent] = useState(3);
  const [nusach, setNusach] = useState("Any");
  const [comment, setComment] = useState("");

  // Street
  const [street, setStreet] = useState("5th Avenue · NYC");
  // Airport
  const [airport, setAirport] = useState("");
  const [gate, setGate] = useState("");
  // Hotel
  const [hotelCity, setHotelCity] = useState("");
  const [hotelName, setHotelName] = useState("");
  const [hotelSpot, setHotelSpot] = useState("");
  // Travel
  const [tripCity, setTripCity] = useState("");
  const [tripDate, setTripDate] = useState("");

  const prayers = [
    { name: "Shacharit", icon: Sunrise },
    { name: "Mincha", icon: Sun },
    { name: "Maariv", icon: Moon },
  ];

  const ctxLabel: Record<Context, string> = {
    Street: "On the street, right now",
    Airport: "At the airport before my flight",
    Hotel: "At my hotel",
    Travel: "For a future trip",
  };

  const locationSummary =
    ctx === "Street" ? street :
    ctx === "Airport" ? [airport, gate && `Gate ${gate}`].filter(Boolean).join(" · ") || "Set airport & gate" :
    ctx === "Hotel" ? [hotelCity, hotelName, hotelSpot].filter(Boolean).join(" · ") || "Set hotel details" :
    [tripCity, tripDate].filter(Boolean).join(" · ") || "Set city & date";

  return (
    <MobileFrame>
      <ScreenHeader title="Start a minyan" subtitle="Fill in the details — everyone will see them" back />

      <div className="px-6 space-y-5 pb-4">
        {/* 1. WHERE */}
        <Section step="1" title="Where are you?">
          <div className="grid grid-cols-4 gap-2">
            {(["Street", "Airport", "Hotel", "Travel"] as Context[]).map((c) => {
              const Icon = c === "Street" ? MapPin : c === "Airport" ? Plane : c === "Hotel" ? Building2 : Plane;
              const active = ctx === c;
              return (
                <button
                  key={c}
                  onClick={() => setCtx(c)}
                  className={`rounded-2xl border p-3 flex flex-col items-center gap-1.5 transition-all ${
                    active ? "border-gold ring-2 ring-gold/30 bg-gold/5" : "border-border bg-surface"
                  }`}
                >
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${active ? "gold-gradient text-gold-foreground" : "bg-muted text-muted-foreground"}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-[11px] font-semibold">{c}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">{ctxLabel[ctx]}</p>

          {/* Context-specific inputs */}
          {ctx === "Street" && (
            <div className="mt-3 space-y-2">
              <div className="rounded-2xl border border-gold/30 bg-gold/5 p-3 flex items-center gap-3">
                <Crosshair className="h-4 w-4 text-gold" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold leading-tight">GPS auto-detected</div>
                  <div className="text-[11px] text-muted-foreground">Drop pin on your exact spot</div>
                </div>
              </div>
              <input
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="Street, corner, landmark…"
                className="w-full rounded-2xl border border-border bg-surface p-3 text-sm outline-none focus:border-gold"
              />
            </div>
          )}
          {ctx === "Airport" && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <input
                value={airport}
                onChange={(e) => setAirport(e.target.value)}
                placeholder="Airport (e.g. JFK, CDG)"
                className="rounded-2xl border border-border bg-surface p-3 text-sm outline-none focus:border-gold"
              />
              <input
                value={gate}
                onChange={(e) => setGate(e.target.value)}
                placeholder="Terminal / Gate (e.g. T2 · B14)"
                className="rounded-2xl border border-border bg-surface p-3 text-sm outline-none focus:border-gold"
              />
            </div>
          )}
          {ctx === "Hotel" && (
            <div className="mt-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={hotelCity}
                  onChange={(e) => setHotelCity(e.target.value)}
                  placeholder="City"
                  className="rounded-2xl border border-border bg-surface p-3 text-sm outline-none focus:border-gold"
                />
                <input
                  value={hotelName}
                  onChange={(e) => setHotelName(e.target.value)}
                  placeholder="Hotel name"
                  className="rounded-2xl border border-border bg-surface p-3 text-sm outline-none focus:border-gold"
                />
              </div>
              <input
                value={hotelSpot}
                onChange={(e) => setHotelSpot(e.target.value)}
                placeholder="Where in the hotel? (Lobby, room 412, conf. room…)"
                className="w-full rounded-2xl border border-border bg-surface p-3 text-sm outline-none focus:border-gold"
              />
            </div>
          )}
          {ctx === "Travel" && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <input
                value={tripCity}
                onChange={(e) => setTripCity(e.target.value)}
                placeholder="Destination city"
                className="rounded-2xl border border-border bg-surface p-3 text-sm outline-none focus:border-gold"
              />
              <input
                value={tripDate}
                onChange={(e) => setTripDate(e.target.value)}
                type="date"
                className="rounded-2xl border border-border bg-surface p-3 text-sm outline-none focus:border-gold"
              />
            </div>
          )}
        </Section>

        {/* 2. PRAYER */}
        <Section step="2" title="Which prayer?">
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

        {/* 3. WHEN */}
        <Section step="3" title="Starting in…">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-1 px-1">
            {(ctx === "Travel" ? ["Morning", "Afternoon", "Evening", "Custom"] : ["Now", "+5 min", "+10 min", "+15 min", "+30 min", "+1 h"]).map((t) => {
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
        </Section>

        {/* 4. HOW MANY */}
        <Section step="4" title="How many of us are already here?">
          <div className="flex items-center justify-between rounded-2xl border border-border bg-surface p-3">
            <button
              onClick={() => setPresent(Math.max(1, present - 1))}
              className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center active:scale-95"
              aria-label="Less"
            >
              <Minus className="h-4 w-4" />
            </button>
            <div className="text-center">
              <div className="font-display text-3xl leading-none">{present}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">already here</div>
            </div>
            <button
              onClick={() => setPresent(Math.min(10, present + 1))}
              className="h-10 w-10 rounded-xl gold-gradient text-gold-foreground flex items-center justify-center active:scale-95"
              aria-label="More"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">You + anyone already with you. Minyan needs 10.</p>
        </Section>

        {/* 5. NUSACH */}
        <Section step="5" title="Nusach">
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
        </Section>

        {/* 6. COMMENT */}
        <Section step="6" title="Comment (optional)">
          <textarea
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Kaddish · Yahrzeit · bring tefillin…"
            className="w-full rounded-2xl border border-border bg-surface p-3 text-sm outline-none focus:border-gold"
          />
          <p className="text-[10px] text-muted-foreground mt-1">Visible to everyone notified.</p>
        </Section>

        {/* Preview */}
        <div className="rounded-2xl bg-navy/[0.04] border border-border p-4 space-y-2">
          <div className="flex items-start gap-3">
            <Zap className="h-4 w-4 text-gold mt-0.5 shrink-0" />
            <div className="text-xs leading-snug">
              <strong className="text-foreground">~38 people</strong> within 1 km will be notified.
            </div>
          </div>
          <div className="border-t border-border pt-2 text-[11px] text-muted-foreground space-y-1">
            <div><span className="font-semibold text-foreground">{prayer}</span> · {when} · {present} here · {Math.max(0, 10 - present)} missing</div>
            <div className="flex items-start gap-1"><MapPin className="h-3 w-3 mt-0.5 shrink-0" /><span className="truncate">{locationSummary}</span></div>
            <div>Nusach: <span className="text-foreground">{nusach}</span></div>
            {comment && <div className="italic">"{comment}"</div>}
          </div>
        </div>
      </div>

      <div className="sticky bottom-24 px-6 pb-2">
        <Link
          to="/success"
          className="flex items-center justify-center gap-2 w-full gold-gradient text-gold-foreground font-semibold py-5 rounded-2xl shadow-glow-gold text-base"
        >
          <Users className="h-5 w-5" /> Publish minyan
        </Link>
        <p className="text-center text-[11px] text-muted-foreground mt-2">
          You'll be notified the moment we reach 10.
        </p>
      </div>
    </MobileFrame>
  );
}

function Section({ step, title, children }: { step: string; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="h-5 w-5 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center">{step}</span>
        <h3 className="font-display text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}
