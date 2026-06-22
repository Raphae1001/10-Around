import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader, LiveBadge, StatusPill } from "@/components/ui-bits";
import { Flame, Users, CheckCircle2, Bell, Heart } from "lucide-react";

export const Route = createFileRoute("/notifications")({ component: Notifications });

function Notifications() {
  const { t } = useTranslation();
  const items = [
    { icon: Flame, tone: "urgent", titleKey: "missing1Title", bodyKey: "missing1Body", timeKey: "missing1Time", ctaKey: "missing1Cta" },
    { icon: Heart, tone: "urgent", titleKey: "kaddishTitle", bodyKey: "kaddishBody", timeKey: "kaddishTime", ctaKey: "kaddishCta" },
    { icon: Users, tone: "gold", titleKey: "completesTitle", bodyKey: "completesBody", timeKey: "completesTime", ctaKey: "completesCta" },
    { icon: CheckCircle2, tone: "success", titleKey: "confirmedTitle", bodyKey: "confirmedBody", timeKey: "confirmedTime" },
    { icon: Bell, tone: "sky", titleKey: "startingTitle", bodyKey: "startingBody", timeKey: "startingTime" },
  ];
  const filters: Array<keyof typeof t> = ["all", "urgent", "kaddish", "confirmed", "nearby"] as any;

  return (
    <MobileFrame>
      <ScreenHeader title={t("notifications.title")} subtitle={t("notifications.subtitle")} right={<LiveBadge>{t("common.live")}</LiveBadge>} />

      <div className="px-6 flex gap-2 mb-4 overflow-x-auto hide-scrollbar">
        {(["all", "urgent", "kaddish", "confirmed", "nearby"] as const).map((f, i) => (
          <button key={f} className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium border ${i === 0 ? "bg-foreground text-background border-foreground" : "bg-surface border-border"}`}>
            {t(`notifications.filters.${f}` as any)}
          </button>
        ))}
      </div>

      <div className="px-6 space-y-3 pb-8">
        {items.map((n, i) => {
          const Icon = n.icon;
          const toneBg =
            n.tone === "urgent" ? "bg-urgent/10 text-urgent" :
            n.tone === "gold" ? "gold-gradient text-gold-foreground" :
            n.tone === "success" ? "bg-success/15 text-success" : "bg-accent text-accent-foreground";
          const isUrgent = n.tone === "urgent";
          return (
            <div key={i} className={`rounded-2xl border p-4 shadow-soft ${isUrgent ? "border-urgent/30 bg-urgent/5" : "border-border bg-surface"}`}>
              <div className="flex items-start gap-3">
                <div className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 ${toneBg}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold leading-tight">{t(`notifications.items.${n.titleKey}` as any)}</h3>
                    <span className="text-[10px] text-muted-foreground shrink-0">{t(`notifications.items.${n.timeKey}` as any)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug">{t(`notifications.items.${n.bodyKey}` as any)}</p>
                  {n.ctaKey && (
                    <div className="mt-3 flex items-center gap-2">
                      <Link to="/minyan" className={`text-xs font-semibold rounded-xl px-3.5 py-2 ${isUrgent ? "bg-urgent text-white" : "bg-foreground text-background"}`}>
                        {t(`notifications.items.${n.ctaKey}` as any)}
                      </Link>
                      <button className="text-xs text-muted-foreground px-2">{t("notifications.snooze")}</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <Link to="/kaddish" className="block">
          <div className="rounded-2xl navy-gradient text-white p-4 shadow-lift flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center">
              <Heart className="h-5 w-5 text-gold" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">{t("notifications.requestKaddish")}</div>
              <div className="text-xs text-white/60">{t("notifications.requestKaddishSub")}</div>
            </div>
            <StatusPill tone="gold">{t("notifications.open")}</StatusPill>
          </div>
        </Link>
      </div>
    </MobileFrame>
  );
}
