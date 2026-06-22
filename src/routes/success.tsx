import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { MobileFrame } from "@/components/MobileFrame";
import { Check, Navigation2, Share2, BookOpen, Footprints } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/success")({ component: Success });

function Success() {
  const { t } = useTranslation();
  const [count, setCount] = useState(9);
  useEffect(() => {
    const tt = setTimeout(() => setCount(10), 600);
    return () => clearTimeout(tt);
  }, []);
  const confirmed = count === 10;

  return (
    <MobileFrame bg="navy" showNav={false}>
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center text-white relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="absolute h-72 w-72 rounded-full border border-gold/20 live-pulse-ring text-gold" style={{ background: "transparent" }} />
          <span className="absolute h-72 w-72 rounded-full border border-gold/10 live-pulse-ring text-gold" style={{ background: "transparent", animationDelay: "0.6s" }} />
        </div>

        <div className="relative">
          <span className="absolute inset-0 rounded-full bg-gold/30 blur-3xl" />
          <div className="relative h-28 w-28 rounded-full gold-gradient text-navy flex items-center justify-center shadow-glow-gold">
            <Check className="h-14 w-14" strokeWidth={3} />
          </div>
        </div>

        <div className="relative mt-8">
          <div className="font-display text-6xl text-gold leading-none count-up" key={count}>
            {count}<span className="text-white/40">/10</span>
          </div>
          <div className="text-xs uppercase tracking-[0.3em] text-white/50 mt-3">
            {confirmed ? t("success.confirmed") : t("success.oneMoreNeeded")}
          </div>
        </div>

        <h1 className="font-display text-3xl mt-6 leading-tight max-w-xs">
          {confirmed ? t("success.communityFormed") : t("success.almostThere")}
        </h1>
        <p className="text-sm text-white/70 mt-3 max-w-xs leading-relaxed">
          {confirmed ? t("success.confirmedBody") : t("success.almostBody")}
        </p>

        {confirmed && (
          <div className="mt-8 flex items-center -space-x-2">
            {["D","Y","M","A","S","L","R","B","N","C"].map((p, i) => (
              <div key={i} className={`h-9 w-9 rounded-full border-2 border-navy flex items-center justify-center text-xs font-bold ${i % 2 ? "bg-sky/40 text-navy" : "gold-gradient text-navy"}`}>
                {p}
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmed && (
        <div className="relative mx-6 mt-6 rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center gap-3">
          <Footprints className="h-4 w-4 text-gold shrink-0" />
          <div className="text-xs text-white/80 flex-1">{t("success.walking", { count: 3 })}</div>
          <span className="relative inline-flex h-2 w-2">
            <span className="absolute inset-0 rounded-full bg-success opacity-60 live-pulse-ring" />
            <span className="relative inline-block h-2 w-2 rounded-full bg-success" />
          </span>
        </div>
      )}

      <div className="px-6 pb-10 pt-6 space-y-3 relative">
        {confirmed && (
          <Link to="/siddur" className="flex items-center justify-center gap-2 w-full gold-gradient text-gold-foreground font-semibold py-4 rounded-2xl shadow-glow-gold">
            <BookOpen className="h-5 w-5" /> {t("success.openSiddur")}
          </Link>
        )}
        <Link to="/minyan" className={`flex items-center justify-center gap-2 w-full font-semibold py-4 rounded-2xl ${confirmed ? "bg-white/10 text-white border border-white/15" : "gold-gradient text-gold-foreground shadow-glow-gold"}`}>
          <Navigation2 className="h-5 w-5" /> {t("success.getDirections")}
        </Link>
        <Link to="/share" className="flex items-center justify-center gap-2 w-full text-white/70 text-sm py-2">
          <Share2 className="h-4 w-4" /> {t("success.shareWithGroup")}
        </Link>
        <Link to="/home" className="block text-center text-white/40 text-xs pt-2">{t("success.backHome")}</Link>
      </div>
    </MobileFrame>
  );
}
