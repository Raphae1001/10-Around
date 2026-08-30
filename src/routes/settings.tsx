import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader } from "@/components/ui-bits";
import { SUPPORTED_LANGS, type LangCode } from "@/i18n";
import { Bell, Lock, MapPin, ChevronDown, Sparkles, BarChart3, Globe, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { setAnalyticsEnabled, isAnalyticsEnabled } from "@/lib/analytics";
import { tapLight } from "@/lib/haptics";
import { getAppPref, setAppPref } from "@/lib/app-prefs";
import { PresenceSettings } from "@/components/PresenceSettings";
import { DangerZone } from "@/components/DangerZone";

export const Route = createFileRoute("/settings")({
  component: Settings,
});

function Settings() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  const currentLang = (i18n.language?.split("-")[0] as LangCode) || "en";
  const activeLang = SUPPORTED_LANGS.find((l) => l.code === currentLang) ?? SUPPORTED_LANGS[0];

  return (
    <MobileFrame>
      <ScreenHeader title={t("settings.title")} back />

      <div className="flex-1 overflow-y-auto overscroll-y-contain px-6 space-y-6 pb-8">
        <SettingsSection title={t("settings.language")} icon={Globe}>
          <div className="relative">
            <div className="flex items-center gap-3 px-4 py-3.5 pointer-events-none">
              <span className="text-xl leading-none">{activeLang.flag}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-medium truncate">{activeLang.native}</div>
                <div className="text-[13px] text-muted-foreground truncate">{activeLang.label}</div>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
            <select
              aria-label={t("settings.chooseLanguage")}
              value={currentLang}
              onChange={(e) => {
                void tapLight();
                void i18n.changeLanguage(e.target.value);
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            >
              {SUPPORTED_LANGS.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.native} — {lang.label}
                </option>
              ))}
            </select>
          </div>
        </SettingsSection>

        <SettingsSection title={t("settings.presence")} icon={Users}>
          <PresenceSettings userId={user?.id} />
        </SettingsSection>

        <SettingsSection title={t("settings.notifications")} icon={Bell}>
          <p className="px-4 pt-3 pb-1 text-[11px] text-muted-foreground leading-relaxed">
            {t("settings.notifComingSoon")}
          </p>
          <PrefToggle storageKey="notif.urgent" label={t("settings.urgent")} defaultOn disabled />
          <PrefToggle
            storageKey="notif.confirmed"
            label={t("settings.minyanConfirmed")}
            defaultOn
            disabled
          />
          <PrefToggle storageKey="notif.quiet" label={t("settings.quietHours")} disabled isLast />
        </SettingsSection>

        <SettingsSection title={t("settings.nusachPrefs")} icon={Sparkles}>
          <PrefSelect
            storageKey="nusach.primary"
            label={t("settings.primaryNusach")}
            defaultValue="Ashkenaz"
            options={["Ashkenaz", "Sephard", "Nusach Ari", "Edot Mizrach", "Yemenite"]}
          />
          <PrefSelect
            storageKey="nusach.also"
            label={t("settings.alsoShow")}
            defaultValue="Sephard, Nusach Ari"
            options={["None", "Sephard", "Nusach Ari", "Sephard, Nusach Ari", "All"]}
            isLast
          />
        </SettingsSection>

        <SettingsSection title={t("settings.privacy")} icon={Lock}>
          <PrefToggle storageKey="privacy.shareTrust" label={t("settings.shareTrust")} defaultOn />
          <PrefSelect
            storageKey="privacy.visibility"
            label={t("settings.profileVisibility")}
            defaultValue={t("settings.communityOnly")}
            options={[t("settings.communityOnly"), "Public", "Private"]}
            isLast
          />
        </SettingsSection>

        <SettingsSection title={t("settings.analytics")} icon={BarChart3}>
          <AnalyticsToggle isLast />
        </SettingsSection>

        <SettingsSection title={t("settings.location")} icon={MapPin}>
          <PrefSelect
            storageKey="location.permission"
            label={t("settings.permission")}
            defaultValue={t("settings.whileUsing")}
            options={[t("settings.whileUsing"), "Always", "Never"]}
            isLast
          />
        </SettingsSection>

        <div className="rounded-2xl bg-surface border border-border overflow-hidden">
          <LinkRow to="/privacy" label={t("settings.privacyPolicy")} />
          <LinkRow to="/terms" label={t("settings.termsOfService")} />
          <LinkRow to="/support" label={t("settings.support")} isLast />
        </div>

        <DangerZone isAnonymous={!!user?.is_anonymous} />
      </div>
    </MobileFrame>
  );
}

function SettingsSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Bell;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-2 px-1">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
      </div>
      <div className="rounded-2xl bg-surface border border-border overflow-hidden">{children}</div>
    </section>
  );
}

function LinkRow({
  to,
  label,
  isLast,
}: {
  to: "/privacy" | "/terms" | "/support";
  label: string;
  isLast?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`block px-4 py-3.5 text-[15px] active:bg-muted/50 transition-colors ${
        !isLast ? "border-b border-border/60" : ""
      }`}
    >
      {label}
    </Link>
  );
}

function AnalyticsToggle({ isLast }: { isLast?: boolean }) {
  const { t } = useTranslation();
  const [on, setOn] = useState(true);
  useEffect(() => {
    setOn(isAnalyticsEnabled());
  }, []);
  function toggle() {
    void tapLight();
    const next = !on;
    setOn(next);
    setAnalyticsEnabled(next);
  }
  return (
    <button
      type="button"
      onClick={toggle}
      className={`w-full px-4 py-3.5 flex items-center gap-3 text-left active:bg-muted/50 ${
        !isLast ? "border-b border-border/60" : ""
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-medium">{t("settings.analyticsHelp")}</div>
        <div className="text-[13px] text-muted-foreground mt-0.5">
          {t("settings.analyticsDesc")}
        </div>
      </div>
      <OnOffSegment on={on} />
    </button>
  );
}

function PrefSelect({
  label,
  defaultValue,
  options,
  storageKey,
  isLast,
}: {
  label: string;
  defaultValue: string;
  options: string[];
  storageKey: string;
  isLast?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const legacy = await getAppPref(`minyannow.${storageKey}`);
      const saved = legacy ?? (await getAppPref(storageKey));
      if (!cancelled && saved) setValue(saved);
    })();
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    void tapLight();
    setValue(next);
    void setAppPref(storageKey, next);
    void setAppPref(`minyannow.${storageKey}`, next);
  }

  return (
    <label
      className={`relative flex items-center gap-3 px-4 py-3.5 cursor-pointer active:bg-muted/50 ${
        !isLast ? "border-b border-border/60" : ""
      }`}
    >
      <div className="flex-1 text-[15px] font-medium min-w-0">{label}</div>
      <div className="flex items-center gap-1 text-[15px] text-muted-foreground shrink-0">
        <span className="max-w-[120px] truncate">{value}</span>
        <ChevronDown className="h-4 w-4" />
      </div>
      <select
        value={value}
        onChange={onChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function PrefToggle({
  label,
  defaultOn = false,
  storageKey,
  disabled,
  isLast,
}: {
  label: string;
  defaultOn?: boolean;
  storageKey: string;
  disabled?: boolean;
  isLast?: boolean;
}) {
  const [on, setOn] = useState(defaultOn);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const legacy = await getAppPref(`minyannow.${storageKey}`);
      const saved = legacy ?? (await getAppPref(storageKey));
      if (!cancelled && saved !== null) setOn(saved === "1" || saved === "true");
    })();
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  function toggle() {
    if (disabled) return;
    void tapLight();
    const next = !on;
    setOn(next);
    const v = next ? "1" : "0";
    void setAppPref(storageKey, v);
    void setAppPref(`minyannow.${storageKey}`, v);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      className={`w-full px-4 py-3.5 flex items-center gap-3 text-left ${
        !isLast ? "border-b border-border/60" : ""
      } ${disabled ? "opacity-60 cursor-default" : "active:bg-muted/50"}`}
    >
      <div className="flex-1 text-[15px] font-medium">{label}</div>
      <OnOffSegment on={on} disabled={disabled} />
    </button>
  );
}

function OnOffSegment({ on, disabled }: { on: boolean; disabled?: boolean }) {
  return (
    <span
      className={`shrink-0 inline-flex rounded-full p-0.5 text-[11px] font-semibold ${
        on ? "bg-accent/15" : "bg-surface-muted"
      } ${disabled ? "opacity-70" : ""}`}
      aria-hidden
    >
      <span
        className={`px-2.5 py-1 rounded-full transition-colors ${
          !on ? "bg-surface text-ink shadow-soft" : "text-ink-soft"
        }`}
      >
        OFF
      </span>
      <span
        className={`px-2.5 py-1 rounded-full transition-colors ${
          on ? "bg-accent text-accent-foreground shadow-soft" : "text-ink-soft"
        }`}
      >
        ON
      </span>
    </span>
  );
}
