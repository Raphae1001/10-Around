import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader, StatusPill } from "@/components/ui-bits";
import { Shield, CheckCircle2, Award, TrendingUp, Star } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/trust")({ component: Trust });

function Trust() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [stats, setStats] = useState<{
    minyanim_count: number;
    completed_count: number;
    streak_days: number;
    stars: number;
  } | null>(null);

  useEffect(() => {
    if (!user) return;
    (supabase as any).rpc("get_my_stats").then(({ data }: any) => {
      setStats(Array.isArray(data) ? data[0] : data);
    });
  }, [user]);

  const stars = Number(stats?.stars ?? 0);
  const filledStars = Math.round(stars);
  const minyanim = stats?.minyanim_count ?? 0;
  const completed = stats?.completed_count ?? 0;
  const showRate = minyanim > 0 ? Math.round((completed / minyanim) * 100) : 0;
  const streak = stats?.streak_days ?? 0;

  return (
    <MobileFrame>
      <ScreenHeader title={t("trust.title")} subtitle={t("trust.subtitle")} back />

      <div className="mx-6 rounded-3xl navy-gradient text-white p-6 text-center shadow-lift relative overflow-hidden">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-gold/20 blur-2xl" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-sky/10 blur-2xl" />
        <div className="relative">
          <div className="text-[10px] uppercase tracking-[0.3em] text-white/50">
            {t("trust.score")}
          </div>
          <div className="font-semibold text-6xl text-gold mt-2 leading-none">
            {stars.toFixed(1)}
          </div>
          <div className="flex items-center justify-center gap-0.5 mt-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${i <= filledStars ? "text-gold fill-gold" : "text-white/20"}`}
              />
            ))}
          </div>
          <div className="text-xs text-white/60 mt-2">
            {minyanim === 0 ? t("trust.noScoreYet") : t("trust.topPercent")}
          </div>
        </div>
      </div>

      <div className="px-6 mt-6 space-y-3">
        <Pillar
          icon={CheckCircle2}
          tone="success"
          label={t("trust.showRate")}
          value={`${showRate}%`}
          bar={showRate}
          sub={`${completed} / ${minyanim}`}
        />
        <Pillar
          icon={TrendingUp}
          tone="gold"
          label={t("trust.consistency")}
          value={`${streak}d`}
          bar={Math.min(100, streak * 10)}
          sub={t("trust.consistencySub")}
        />
        <Pillar
          icon={Shield}
          tone="sky"
          label={t("trust.identity")}
          value={user ? t("trust.identityVal") : "—"}
          bar={user ? 100 : 0}
          sub={t("trust.identitySub")}
        />
        <Pillar
          icon={Award}
          tone="gold"
          label={t("trust.ratings")}
          value={`${stars.toFixed(2)} / 5`}
          bar={Math.round(stars * 20)}
          sub={t("trust.ratingsSub")}
        />
      </div>

      <div className="px-6 mt-6 mb-8">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="text-sm font-semibold">{t("trust.howWorks")}</div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {t("trust.howWorksBody")}
          </p>
          <div className="mt-3 flex gap-2 flex-wrap">
            <StatusPill tone="gold">{t("trust.noBelow")}</StatusPill>
            <StatusPill>{t("trust.anonymous")}</StatusPill>
          </div>
        </div>
      </div>
    </MobileFrame>
  );
}

function Pillar({ icon: Icon, tone, label, value, bar, sub }: any) {
  const toneBg =
    tone === "success"
      ? "bg-success/15 text-success"
      : tone === "sky"
        ? "sky-gradient text-navy"
        : "gold-gradient text-gold-foreground";
  const barColor = tone === "success" ? "bg-success" : tone === "sky" ? "bg-sky" : "gold-gradient";
  return (
    <div className="rounded-2xl bg-surface border border-border p-4">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ${toneBg}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="font-semibold text-lg leading-tight">{value}</div>
        </div>
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${barColor}`} style={{ width: `${bar}%` }} />
      </div>
      <div className="text-[11px] text-muted-foreground mt-2">{sub}</div>
    </div>
  );
}
