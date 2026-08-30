import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { MobileFrame } from "@/components/MobileFrame";
import { Check, Navigation2, Share2, Footprints } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/success")({
  validateSearch: (s: Record<string, unknown>) => ({
    id: typeof s.id === "string" ? s.id : undefined,
  }),
  component: Success,
});

const NEEDED = 10;

function Success() {
  const { t } = useTranslation();
  const { id } = Route.useSearch();
  const [present, setPresent] = useState<number | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [prayer, setPrayer] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function load() {
      const { data } = await supabase.rpc("get_minyan_by_id", { _id: id! }).maybeSingle();
      if (cancelled || !data) return;
      setPresent((data as any).present_count ?? 0);
      setAddress((data as any).address ?? null);
      setPrayer((data as any).prayer ?? null);
    }
    load();
    const ch = supabase
      .channel(`success-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "minyanim", filter: `id=eq.${id}` },
        (payload) => {
          if (payload.new) setPresent((payload.new as any).present_count ?? 0);
        },
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [id]);

  const count = present ?? 0;
  const confirmed = count >= NEEDED;
  const prayerLabel = prayer ? t(`prayer.${prayer}`, { defaultValue: prayer }) : "";

  return (
    <MobileFrame bg="navy" showNav={false}>
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center text-white relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="absolute h-72 w-72 rounded-full border border-gold/20 live-pulse-ring text-gold"
            style={{ background: "transparent" }}
          />
          <span
            className="absolute h-72 w-72 rounded-full border border-gold/10 live-pulse-ring text-gold"
            style={{ background: "transparent", animationDelay: "0.6s" }}
          />
        </div>

        <div className="relative">
          <span className="absolute inset-0 rounded-full bg-gold/30 blur-3xl" />
          <div className="relative h-28 w-28 rounded-full gold-gradient text-navy flex items-center justify-center shadow-glow-gold">
            <Check className="h-14 w-14" strokeWidth={3} />
          </div>
        </div>

        <div className="relative mt-8">
          <div className="font-semibold text-6xl text-gold leading-none count-up" key={count}>
            {count}
            <span className="text-white/40">/{NEEDED}</span>
          </div>
          <div className="text-xs uppercase tracking-[0.3em] text-white/50 mt-3">
            {confirmed ? t("success.confirmed") : t("success.oneMoreNeeded")}
          </div>
        </div>

        <h1 className="font-semibold text-3xl mt-6 leading-tight max-w-xs">
          {confirmed ? t("success.communityFormed") : t("success.almostThere")}
        </h1>
        <p className="text-sm text-white/70 mt-3 max-w-xs leading-relaxed">
          {address && prayerLabel
            ? `${prayerLabel} · ${address}`
            : confirmed
              ? t("success.confirmedBody")
              : t("success.almostBody")}
        </p>

        {count > 0 && (
          <div className="mt-8 flex items-center -space-x-2">
            {Array.from({ length: Math.min(count, NEEDED) }).map((_, i) => (
              <div
                key={i}
                className={`h-9 w-9 rounded-full border-2 border-navy flex items-center justify-center text-xs font-bold ${i % 2 ? "bg-sky/40 text-navy" : "gold-gradient text-navy"}`}
              >
                •
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-6 pb-10 pt-6 space-y-3 relative">
        <Link
          to="/minyan"
          search={{ id }}
          className="flex items-center justify-center gap-2 w-full font-semibold py-4 rounded-2xl gold-gradient text-gold-foreground shadow-glow-gold"
        >
          <Navigation2 className="h-5 w-5" /> {t("success.getDirections")}
        </Link>
        <Link
          to="/share"
          search={{ id }}
          className="flex items-center justify-center gap-2 w-full text-white/70 text-sm py-2"
        >
          <Share2 className="h-4 w-4" /> {t("success.shareWithGroup")}
        </Link>
        <Link to="/home" className="block text-center text-white/40 text-xs pt-2">
          {t("success.backHome")}
        </Link>
      </div>
    </MobileFrame>
  );
}
