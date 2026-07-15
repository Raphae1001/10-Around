import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader, LiveBadge } from "@/components/ui-bits";
import { Heart, Share2 } from "lucide-react";

import { guardLegacyScreen } from "@/lib/legacy-route";

export const Route = createFileRoute("/kaddish")({
  beforeLoad: guardLegacyScreen,
  component: Kaddish,
});

function Kaddish() {
  const { t } = useTranslation();
  return (
    <MobileFrame bg="navy" showNav={false}>
      <ScreenHeader title="" back />

      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center text-white">
        <div className="relative">
          <span className="absolute inset-0 rounded-full bg-gold/30 blur-3xl" />
          <div className="relative h-24 w-24 rounded-full gold-gradient text-navy flex items-center justify-center float-slow shadow-glow-gold">
            <Heart className="h-10 w-10" />
          </div>
        </div>

        <h1 className="font-display text-3xl mt-8 leading-tight max-w-xs">{t("kaddish.title")}</h1>
        <p className="text-sm text-white/70 mt-3 max-w-xs leading-relaxed">
          {t("kaddish.subtitle")}
        </p>

        <div className="mt-8 w-full max-w-sm space-y-3">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-left">
            <label className="text-[10px] uppercase tracking-wider text-white/50">
              {t("kaddish.forWhom")}
            </label>
            <input
              className="w-full bg-transparent outline-none text-sm mt-1 placeholder:text-white/40"
              defaultValue="Avraham ben Yitzchak"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("kaddish.when")} value={t("kaddish.whenVal")} />
            <Field label={t("kaddish.where")} value={t("kaddish.whereVal")} />
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-left">
            <label className="text-[10px] uppercase tracking-wider text-white/50">
              {t("kaddish.personalNote")}
            </label>
            <input
              className="w-full bg-transparent outline-none text-sm mt-1 placeholder:text-white/40"
              placeholder={t("kaddish.notePh")}
            />
          </div>
        </div>

        <LiveBadge>{t("kaddish.urgent")}</LiveBadge>
      </div>

      <div className="px-6 pb-10 space-y-3">
        <Link
          to="/success"
          className="block w-full text-center gold-gradient text-gold-foreground font-semibold py-4 rounded-2xl shadow-glow-gold"
        >
          {t("kaddish.send")}
        </Link>
        <button className="w-full text-white/70 text-sm py-2 flex items-center justify-center gap-2">
          <Share2 className="h-4 w-4" /> {t("kaddish.sharePrivate")}
        </button>
      </div>
    </MobileFrame>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-left">
      <div className="text-[10px] uppercase tracking-wider text-white/50">{label}</div>
      <div className="text-sm mt-1">{value}</div>
    </div>
  );
}
