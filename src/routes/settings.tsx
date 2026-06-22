import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader } from "@/components/ui-bits";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Bell, Moon, Lock, MapPin, Accessibility, ChevronRight, Sparkles } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/settings")({
  component: Settings,
});

function Settings() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <MobileFrame>
      <ScreenHeader title={t("settings.title")} back />

      <div className="px-6 space-y-5 pb-8">
        {/* Language switcher — top because user just asked for it */}
        <LanguageSwitcher />

        <Group title={t("settings.notifications")} icon={Bell}>
          <Toggle label={t("settings.urgent")} defaultOn />
          <Toggle label={t("settings.kaddishNearby")} defaultOn />
          <Toggle label={t("settings.minyanConfirmed")} defaultOn />
          <Toggle label={t("settings.quietHours")} />
        </Group>

        <Group title={t("settings.nusachPrefs")} icon={Sparkles}>
          <Row label={t("settings.primaryNusach")} value="Ashkenaz" />
          <Row label={t("settings.alsoShow")} value="Sephard, Nusach Ari" />
        </Group>

        <Group title={t("settings.shabbat")} icon={Moon}>
          <Toggle label={t("settings.autoShabbat")} defaultOn />
          <Toggle label={t("settings.muteShabbat")} defaultOn />
        </Group>

        <Group title={t("settings.privacy")} icon={Lock}>
          <Toggle label={t("settings.showOnMap")} defaultOn />
          <Toggle label={t("settings.shareTrust")} defaultOn />
          <Row label={t("settings.profileVisibility")} value={t("settings.communityOnly")} />
        </Group>

        <Group title={t("settings.location")} icon={MapPin}>
          <Row label={t("settings.permission")} value={t("settings.whileUsing")} />
          <Toggle label={t("settings.bgUpdates")} />
        </Group>

        <Group title={t("settings.accessibility")} icon={Accessibility}>
          <Toggle label={t("settings.largerText")} />
          <Toggle label={t("settings.highContrast")} />
          <Toggle label={t("settings.reduceMotion")} />
        </Group>

        <button
          onClick={signOut}
          className="w-full text-center text-sm text-urgent py-4 rounded-2xl border border-border bg-surface"
        >
          {t("common.signOut")}
        </button>
      </div>
    </MobileFrame>
  );
}

function Group({ title, icon: Icon, children }: any) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      <div className="rounded-2xl bg-surface border border-border divide-y divide-border">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 flex items-center gap-3">
      <div className="flex-1 text-sm">{label}</div>
      <div className="text-sm text-muted-foreground">{value}</div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}

function Toggle({ label, defaultOn = false }: { label: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button onClick={() => setOn(!on)} className="w-full p-4 flex items-center gap-3 text-left">
      <div className="flex-1 text-sm">{label}</div>
      <div className={`relative h-6 w-10 rounded-full transition-colors ${on ? "bg-gold" : "bg-muted"}`}>
        <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-[18px]" : "translate-x-0.5"}`} />
      </div>
    </button>
  );
}
