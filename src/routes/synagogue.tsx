import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader, StatusPill, TrustBadge } from "@/components/ui-bits";
import { ShieldCheck, MapPin, Navigation2, Star } from "lucide-react";

export const Route = createFileRoute("/synagogue")({ component: Syn });

function Syn() {
  const { t } = useTranslation();
  return (
    <MobileFrame>
      <ScreenHeader title={t("synagogue.title")} subtitle={t("synagogue.subtitle")} back />

      <div className="mx-6 rounded-3xl overflow-hidden border border-border shadow-soft">
        <div className="h-36 navy-gradient relative">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, oklch(0.82 0.14 80) 0, transparent 40%), radial-gradient(circle at 80% 60%, oklch(0.78 0.07 240) 0, transparent 40%)" }} />
          <div className="absolute bottom-3 left-4 flex items-center gap-2">
            <StatusPill tone="gold"><ShieldCheck className="h-3 w-3 mr-1" />{t("synagogue.verified")}</StatusPill>
            <TrustBadge score={4.9} />
          </div>
        </div>
        <div className="p-4 bg-surface flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <div className="text-sm flex-1">{t("synagogue.address")}</div>
          <button className="text-xs font-semibold text-gold flex items-center gap-1">
            <Navigation2 className="h-3 w-3" /> {t("common.go")}
          </button>
        </div>
      </div>

      <div className="px-6 mt-5">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">{t("synagogue.todaysSchedule")}</div>
        <div className="rounded-2xl bg-surface border border-border divide-y divide-border">
          {[
            { p: "Shacharit", t: "6:45 AM", c: 18, s: "confirmed" as const },
            { p: "Mincha", t: "1:30 PM", c: 8, s: "almost" as const },
            { p: "Maariv", t: "6:45 PM", c: 0, s: "open" as const },
          ].map((r, i) => (
            <div key={i} className="p-4 flex items-center gap-3">
              <div className="font-display text-lg w-16">{r.t}</div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{r.p}</div>
                <div className="text-xs text-muted-foreground">
                  {r.s === "confirmed" ? t("synagogue.confirmedReady", { count: r.c }) : r.s === "almost" ? t("synagogue.missing", { count: r.c }) : t("synagogue.rsvp")}
                </div>
              </div>
              <StatusPill tone={r.s === "confirmed" ? "success" : r.s === "almost" ? "gold" : "sky"}>
                {r.s === "confirmed" ? t("synagogue.confirmed") : r.s === "almost" ? t("synagogue.almost") : t("synagogue.open")}
              </StatusPill>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 mt-5">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">{t("synagogue.communityUpdates")}</div>
        <div className="rounded-2xl bg-surface border border-border p-4 text-sm">
          <p>{t("synagogue.kiddushNote")}</p>
          <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
            <span>{t("synagogue.postedAgo")}</span>
            <Star className="h-3.5 w-3.5 text-gold fill-gold" />
          </div>
        </div>
      </div>
    </MobileFrame>
  );
}
