import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader } from "@/components/ui-bits";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Bell, Moon, Lock, MapPin, Accessibility, ChevronDown, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/settings")({
  component: Settings,
});

function Settings() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  async function signOut() {
    try { await supabase.auth.signOut(); } catch { /* ignore — we reload anyway */ }
    if (typeof window !== "undefined") {
      window.location.assign("/auth");
    } else {
      navigate({ to: "/auth", replace: true });
    }
  }

  return (
    <MobileFrame>
      <ScreenHeader title={t("settings.title")} back />

      <div className="px-6 space-y-5 pb-8">
        <LanguageSwitcher />

        <Group title={t("settings.notifications")} icon={Bell}>
          <Toggle storageKey="notif.urgent" label={t("settings.urgent")} defaultOn />
          <Toggle storageKey="notif.kaddish" label={t("settings.kaddishNearby")} defaultOn />
          <Toggle storageKey="notif.confirmed" label={t("settings.minyanConfirmed")} defaultOn />
          <Toggle storageKey="notif.quiet" label={t("settings.quietHours")} />
        </Group>

        <Group title={t("settings.nusachPrefs")} icon={Sparkles}>
          <SelectRow
            storageKey="nusach.primary"
            label={t("settings.primaryNusach")}
            defaultValue="Ashkenaz"
            options={["Ashkenaz", "Sephard", "Nusach Ari", "Edot Mizrach", "Yemenite"]}
          />
          <SelectRow
            storageKey="nusach.also"
            label={t("settings.alsoShow")}
            defaultValue="Sephard, Nusach Ari"
            options={["None", "Sephard", "Nusach Ari", "Sephard, Nusach Ari", "All"]}
          />
        </Group>

        <Group title={t("settings.shabbat")} icon={Moon}>
          <Toggle storageKey="shabbat.auto" label={t("settings.autoShabbat")} defaultOn />
          <Toggle storageKey="shabbat.mute" label={t("settings.muteShabbat")} defaultOn />
        </Group>

        <Group title={t("settings.privacy")} icon={Lock}>
          <Toggle storageKey="privacy.showMap" label={t("settings.showOnMap")} defaultOn />
          <Toggle storageKey="privacy.shareTrust" label={t("settings.shareTrust")} defaultOn />
          <SelectRow
            storageKey="privacy.visibility"
            label={t("settings.profileVisibility")}
            defaultValue={t("settings.communityOnly")}
            options={[t("settings.communityOnly"), "Public", "Private"]}
          />
        </Group>

        <Group title={t("settings.location")} icon={MapPin}>
          <SelectRow
            storageKey="location.permission"
            label={t("settings.permission")}
            defaultValue={t("settings.whileUsing")}
            options={[t("settings.whileUsing"), "Always", "Never"]}
          />
          <Toggle storageKey="location.bg" label={t("settings.bgUpdates")} />
        </Group>

        <Group title={t("settings.accessibility")} icon={Accessibility}>
          <Toggle storageKey="a11y.largerText" label={t("settings.largerText")} />
          <Toggle storageKey="a11y.highContrast" label={t("settings.highContrast")} />
          <Toggle storageKey="a11y.reduceMotion" label={t("settings.reduceMotion")} />
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

function SelectRow({
  label,
  defaultValue,
  options,
  storageKey,
}: {
  label: string;
  defaultValue: string;
  options: string[];
  storageKey: string;
}) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`minyannow.${storageKey}`);
      if (saved) setValue(saved);
    } catch {}
  }, [storageKey]);

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    setValue(next);
    try {
      localStorage.setItem(`minyannow.${storageKey}`, next);
    } catch {}
  }

  return (
    <label className="p-4 flex items-center gap-3 cursor-pointer">
      <div className="flex-1 text-sm">{label}</div>
      <div className="relative flex items-center gap-1 text-sm text-muted-foreground">
        <span>{value}</span>
        <ChevronDown className="h-4 w-4" />
        <select
          value={value}
          onChange={onChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        >
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </div>
    </label>
  );
}

function Toggle({ label, defaultOn = false, storageKey }: { label: string; defaultOn?: boolean; storageKey: string }) {
  const [on, setOn] = useState(defaultOn);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`minyannow.${storageKey}`);
      if (saved !== null) setOn(saved === "1");
    } catch {}
  }, [storageKey]);

  function toggle() {
    const next = !on;
    setOn(next);
    try {
      localStorage.setItem(`minyannow.${storageKey}`, next ? "1" : "0");
    } catch {}
  }

  return (
    <button onClick={toggle} className="w-full p-4 flex items-center gap-3 text-left">
      <div className="flex-1 text-sm">{label}</div>
      <div className={`relative h-6 w-10 rounded-full transition-colors ${on ? "bg-gold" : "bg-muted"}`}>
        <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-[18px]" : "translate-x-0.5"}`} />
      </div>
    </button>
  );
}
