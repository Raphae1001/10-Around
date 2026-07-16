import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader, StatusPill } from "@/components/ui-bits";
import { Shield, MapPin, Clock, Check, Bell } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/backup")({ component: Backup });

function Backup() {
  const { t } = useTranslation();
  const [on, setOn] = useState(true);
  const [radius, setRadius] = useState(800);
  const radiusLabel = radius >= 1000 ? `${(radius / 1000).toFixed(1)} km` : `${radius} m`;

  return (
    <MobileFrame>
      <ScreenHeader title={t("backup.title")} subtitle={t("backup.subtitle")} back />

      <div className="mx-6 rounded-3xl overflow-hidden navy-gradient text-white p-6 shadow-lift relative">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-gold/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="h-11 w-11 rounded-2xl gold-gradient text-navy flex items-center justify-center mb-3">
              <Shield className="h-5 w-5" />
            </div>
            <div className="font-display text-2xl leading-tight">{t("backup.heroTitle")}</div>
            <p className="text-xs text-white/70 mt-1 max-w-[240px]">{t("backup.heroBody")}</p>
          </div>
          <button
            onClick={() => setOn(!on)}
            className={`h-7 w-12 rounded-full relative transition-colors ${on ? "bg-gold" : "bg-white/20"}`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`}
            />
          </button>
        </div>

        {on && (
          <div className="relative mt-5 flex items-center gap-2 text-xs">
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inset-0 rounded-full bg-success opacity-50 live-pulse-ring" />
              <span className="relative inline-block h-2 w-2 rounded-full bg-success" />
            </span>
            <span className="text-white/80">{t("backup.active", { radius: radiusLabel })}</span>
          </div>
        )}
      </div>

      <div className="mx-6 mt-4 rounded-2xl bg-surface border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {t("backup.alertRadius")}
            </div>
            <div className="font-display text-lg">{radiusLabel}</div>
          </div>
          <MapPin className="h-5 w-5 text-muted-foreground" />
        </div>
        <input
          type="range"
          min={200}
          max={3000}
          step={100}
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          className="w-full accent-[oklch(0.82_0.14_80)]"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <span>200m</span>
          <span>3 km</span>
        </div>
      </div>

      <div className="mx-6 mt-4 rounded-2xl bg-surface border border-border divide-y divide-border">
        <Rule
          icon={Bell}
          title={t("backup.ruleCriticalTitle")}
          desc={t("backup.ruleCriticalDesc")}
        />
        <Rule icon={Clock} title={t("backup.ruleQuietTitle")} desc={t("backup.ruleQuietDesc")} />
        <Rule
          icon={Check}
          title={t("backup.ruleConfirmTitle")}
          desc={t("backup.ruleConfirmDesc")}
        />
      </div>

      <div className="px-6 mt-5">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
          {t("backup.lastWeek")}
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between mb-2">
            <StatusPill tone="success">{t("backup.saved")}</StatusPill>
            <span className="text-[10px] text-muted-foreground">Tue · 13:42</span>
          </div>
          <div className="font-display text-base">{t("backup.exampleTitle")}</div>
          <div className="text-xs text-muted-foreground mt-1">{t("backup.exampleDesc")}</div>
        </div>
      </div>

      <div className="px-6 pt-5 pb-4">
        <Link
          to="/home"
          className="w-full gold-gradient text-gold-foreground font-semibold py-4 rounded-2xl shadow-glow-gold flex items-center justify-center gap-2"
        >
          <Shield className="h-5 w-5" /> {on ? t("backup.stayOnCall") : t("backup.activate")}
        </Link>
      </div>
    </MobileFrame>
  );
}

function Rule({ icon: Icon, title, desc }: any) {
  return (
    <div className="p-4 flex items-start gap-3">
      <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
    </div>
  );
}
