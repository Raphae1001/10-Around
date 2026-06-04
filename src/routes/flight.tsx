import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileFrame } from "@/components/MobileFrame";
import { Plane, Users, Globe2, ChevronLeft, Sparkles } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/flight")({
  component: Flight,
});

function Flight() {
  const [flight, setFlight] = useState("");
  const found = flight.trim().length >= 4;

  return (
    <MobileFrame bg="navy" showNav={false}>
      <div className="px-5 pt-2 pb-4 flex items-center justify-between">
        <Link to="/traveler" className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="text-[10px] uppercase tracking-[0.25em] text-white/50">Flight Coordination</div>
        <div className="w-9" />
      </div>

      <div className="px-6">
        <div className="h-14 w-14 rounded-2xl gold-gradient text-navy flex items-center justify-center mb-4">
          <Plane className="h-6 w-6" />
        </div>
        <h1 className="font-display text-3xl leading-tight">Are there Jews on your flight?</h1>
        <p className="text-sm text-white/70 mt-2 max-w-xs leading-relaxed">
          Enter your flight number. We'll quietly connect you with other MinyanLive members on board.
        </p>

        <div className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur">
          <label className="text-[10px] uppercase tracking-[0.2em] text-white/50">Flight number</label>
          <input
            value={flight}
            onChange={(e) => setFlight(e.target.value.toUpperCase())}
            placeholder="LY 002"
            className="w-full bg-transparent font-display text-3xl mt-1 outline-none placeholder:text-white/20 tracking-wider"
          />
          <div className="flex items-center justify-between text-[11px] text-white/40 mt-2 border-t border-white/10 pt-2">
            <span>JFK → TLV</span>
            <span>Departs in 4h 12m</span>
          </div>
        </div>
      </div>

      {/* Match preview */}
      {found && (
        <div className="px-6 mt-6">
          <div className="rounded-3xl bg-white/5 border border-white/10 p-5 backdrop-blur">
            <div className="flex items-center gap-2 text-gold mb-3">
              <Sparkles className="h-4 w-4" />
              <span className="text-[11px] uppercase tracking-[0.2em] font-semibold">Match found</span>
            </div>
            <div className="font-display text-2xl leading-tight">
              <span className="text-gold">9</span> members are on your flight
            </div>
            <p className="text-xs text-white/60 mt-1">Enough for a spontaneous Maariv at Gate B22 — or once you land.</p>

            <div className="mt-4 flex items-center -space-x-2">
              {["D","Y","M","A","S","L","R","B","N"].map((p, i) => (
                <div key={i} className={`h-9 w-9 rounded-full border-2 border-navy flex items-center justify-center text-xs font-bold ${i % 2 ? "bg-sky/40 text-navy" : "gold-gradient text-navy"}`}>
                  {p}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3 mt-5 text-center border-t border-white/10 pt-4">
              <div>
                <div className="font-display text-xl text-gold">1</div>
                <div className="text-[10px] uppercase tracking-wider text-white/60">Needed for 10</div>
              </div>
              <div>
                <div className="font-display text-xl text-gold">3</div>
                <div className="text-[10px] uppercase tracking-wider text-white/60">Same hotel</div>
              </div>
              <div>
                <div className="font-display text-xl text-gold">TLV</div>
                <div className="text-[10px] uppercase tracking-wider text-white/60">Destination</div>
              </div>
            </div>
          </div>

          <Link
            to="/create"
            className="mt-4 w-full gold-gradient text-gold-foreground font-semibold py-4 rounded-2xl shadow-glow-gold flex items-center justify-center gap-2"
          >
            <Users className="h-5 w-5" /> Start flight minyan
          </Link>
          <button className="mt-2 w-full text-white/60 text-sm py-2 flex items-center justify-center gap-2">
            <Globe2 className="h-4 w-4" /> Join the LY 002 community
          </button>
        </div>
      )}

      {!found && (
        <div className="px-6 mt-8">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-3">Recent flights</div>
          <div className="space-y-2">
            {[
              { f: "LY 002", r: "JFK → TLV", n: 9 },
              { f: "AF 1390", r: "CDG → TLV", n: 6 },
              { f: "UA 84", r: "EWR → TLV", n: 12 },
            ].map((x) => (
              <button
                key={x.f}
                onClick={() => setFlight(x.f)}
                className="w-full rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center gap-3 text-left"
              >
                <Plane className="h-4 w-4 text-gold" />
                <div className="flex-1">
                  <div className="text-sm font-semibold">{x.f}</div>
                  <div className="text-[11px] text-white/50">{x.r}</div>
                </div>
                <div className="text-xs text-gold font-semibold">{x.n} on board</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </MobileFrame>
  );
}
