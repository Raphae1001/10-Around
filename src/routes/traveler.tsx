import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader, MinyanCard, StatusPill, type Minyan } from "@/components/ui-bits";
import { Plane, Building2, Briefcase, MapPin, Globe2 } from "lucide-react";

export const Route = createFileRoute("/traveler")({ component: Traveler });

const traveling: Minyan[] = [
  { id: "t1", name: "JFK Terminal 4 Chapel", type: "Shacharit", inMin: 35, distance: "Gate B22", confirmed: 7, needed: 10, nusach: "Any" },
  { id: "t2", name: "Hilton Tel Aviv · Lobby", type: "Mincha", inMin: 90, distance: "0.1 mi", confirmed: 6, needed: 10, nusach: "Sephard" },
];

function Traveler() {
  const { t } = useTranslation();
  const city = "Tel Aviv";
  return (
    <MobileFrame bg="navy">
      <div className="px-6 pt-2 pb-4 flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/50">{t("traveler.mode")}</div>
          <h1 className="font-display text-2xl mt-1">{t("traveler.tripIn", { city })}</h1>
        </div>
        <Link to="/home" className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-sm">×</Link>
      </div>

      <div className="mx-6 rounded-3xl bg-white/5 border border-white/10 p-5 backdrop-blur">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-11 w-11 rounded-2xl gold-gradient text-navy flex items-center justify-center">
            <Plane className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold">EL AL · LY 002</div>
            <div className="text-xs text-white/60">JFK → TLV · {t("traveler.departs", { time: "11:55 PM" })}</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center pt-3 border-t border-white/10">
          <div>
            <div className="font-display text-2xl text-gold">42</div>
            <div className="text-[10px] uppercase tracking-wider text-white/60">{t("traveler.stats.minyanim", { city: "TLV" })}</div>
          </div>
          <div>
            <div className="font-display text-2xl text-gold">3</div>
            <div className="text-[10px] uppercase tracking-wider text-white/60">{t("traveler.stats.atAirport")}</div>
          </div>
          <div>
            <div className="font-display text-2xl text-gold">7</div>
            <div className="text-[10px] uppercase tracking-wider text-white/60">{t("traveler.stats.hotelWalk")}</div>
          </div>
        </div>
      </div>

      <div className="px-6 mt-6">
        <div className="text-[11px] uppercase tracking-[0.2em] text-white/50 mb-3">{t("traveler.builtForTrip")}</div>
        <div className="grid grid-cols-3 gap-2">
          <Link to="/flight" className="rounded-2xl bg-white/5 border border-white/10 p-3 text-center relative">
            <Plane className="h-5 w-5 mx-auto text-gold" />
            <div className="text-xs mt-2">{t("traveler.flight")}</div>
            <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-gold" />
          </Link>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-center">
            <Building2 className="h-5 w-5 mx-auto text-gold" />
            <div className="text-xs mt-2">{t("traveler.hotel")}</div>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-center">
            <Briefcase className="h-5 w-5 mx-auto text-gold" />
            <div className="text-xs mt-2">{t("traveler.business")}</div>
          </div>
        </div>

        <Link to="/flight" className="mt-3 block rounded-2xl border border-gold/40 bg-gold/10 p-3 text-center text-xs font-semibold text-gold">
          {t("traveler.flightCta")}
        </Link>
      </div>

      <div className="bg-background text-foreground rounded-t-3xl mt-6 flex-1 px-6 pt-6 pb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl flex items-center gap-2">
            <Globe2 className="h-5 w-5 text-gold" /> {t("traveler.alongRoute")}
          </h2>
          <StatusPill tone="sky">{t("traveler.cities", { count: 2 })}</StatusPill>
        </div>
        <div className="space-y-3">
          {traveling.map((m) => <MinyanCard key={m.id} m={m} />)}
        </div>

        <div className="mt-6 rounded-2xl border border-dashed border-border p-5 text-center">
          <MapPin className="h-6 w-6 mx-auto text-muted-foreground" />
          <div className="font-display text-lg mt-2">{t("traveler.noMinyan", { city: "Yerevan" })}</div>
          <p className="text-xs text-muted-foreground mt-1 mb-4">{t("traveler.noMinyanHint")}</p>
          <Link to="/create" className="inline-block gold-gradient text-gold-foreground font-semibold py-2.5 px-5 rounded-xl text-sm">
            {t("traveler.createRemote")}
          </Link>
        </div>
      </div>
    </MobileFrame>
  );
}
