import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader } from "@/components/ui-bits";
import { SUPPORTED_LANGS, type LangCode } from "@/i18n";
import {
  Bell,
  Lock,
  MapPin,
  Accessibility,
  ChevronDown,
  Sparkles,
  BarChart3,
  Trash2,
  Loader2,
  Globe,
  Users,
  Check,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { track, setAnalyticsEnabled, isAnalyticsEnabled } from "@/lib/analytics";
import { toast } from "sonner";
import { tapLight } from "@/lib/haptics";
import { getAppPref, setAppPref } from "@/lib/app-prefs";
import {
  getPresenceLevel,
  setPresenceLevel,
  type PresenceLevel,
  PRESENCE_LEVELS,
} from "@/lib/presence-prefs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/settings")({
  component: Settings,
});

function Settings() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [presenceLevel, setPresenceLevelState] = useState<PresenceLevel>("ponctual");
  const [presenceLoading, setPresenceLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void getPresenceLevel(user?.id).then((level) => {
      if (!cancelled) {
        setPresenceLevelState(level);
        setPresenceLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  async function onPresenceChange(level: PresenceLevel) {
    if (level === presenceLevel) return;
    void tapLight();
    setPresenceLevelState(level);
    await setPresenceLevel(level, user?.id);
    toast.success(t("settings.presenceSaved"));
  }

  async function signOut() {
    track("sign_out");
    try {
      await queryClient.cancelQueries();
    } catch {}
    try {
      queryClient.clear();
    } catch {}
    try {
      await supabase.auth.signOut();
    } catch {}
    try {
      const { nativeAuthClear } = await import("@/lib/native-auth");
      await nativeAuthClear();
    } catch {}
    if (typeof window !== "undefined") {
      window.location.assign("/auth");
    } else {
      navigate({ to: "/auth", replace: true });
    }
  }

  async function handleDelete() {
    if (confirmText !== "DELETE") return;
    setDeleting(true);
    const timeout = setTimeout(() => {
      setDeleting(false);
      toast.error("Delete timed out. Please try again.");
    }, 20000);
    try {
      // Edge function is the only delete path (works on Capacitor SPA + web).
      const { data, error } = await supabase.functions.invoke("delete-account", { body: {} });
      if (error) throw error;
      if (data && typeof data === "object" && "ok" in data && data.ok === false) {
        throw new Error(
          typeof (data as { error?: string }).error === "string"
            ? (data as { error: string }).error
            : "Delete failed",
        );
      }

      track("delete_account");
      try {
        await queryClient.cancelQueries();
      } catch {}
      try {
        queryClient.clear();
      } catch {}
      try {
        await supabase.auth.signOut();
      } catch {}
      try {
        const { nativeAuthClear } = await import("@/lib/native-auth");
        await nativeAuthClear();
      } catch {}
      try {
        localStorage.clear();
      } catch {}
      clearTimeout(timeout);
      toast.success("Account deleted");
      if (typeof window !== "undefined") window.location.assign("/auth");
      else navigate({ to: "/auth", replace: true });
    } catch (e) {
      clearTimeout(timeout);
      toast.error("Could not delete account", { description: (e as Error).message });
      setDeleting(false);
    }
  }

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
          {presenceLoading ? (
            <div className="flex justify-center py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            PRESENCE_LEVELS.map((level, idx) => (
              <PresenceRow
                key={level}
                label={t(`settings.presence${levelKey(level)}`)}
                description={t(`settings.presence${levelKey(level)}Desc`)}
                selected={presenceLevel === level}
                isLast={idx === PRESENCE_LEVELS.length - 1}
                onSelect={() => void onPresenceChange(level)}
              />
            ))
          )}
          <p className="px-4 py-3 text-[11px] text-muted-foreground border-t border-border/60 leading-relaxed">
            {t("settings.presenceFootnote")}
          </p>
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

        <SettingsSection title={t("settings.accessibility")} icon={Accessibility}>
          <PrefToggle storageKey="a11y.largerText" label={t("settings.largerText")} />
          <PrefToggle storageKey="a11y.highContrast" label={t("settings.highContrast")} />
          <PrefToggle storageKey="a11y.reduceMotion" label={t("settings.reduceMotion")} isLast />
        </SettingsSection>

        <div className="rounded-2xl bg-surface border border-border overflow-hidden">
          <LinkRow to="/privacy" label={t("settings.privacyPolicy")} />
          <LinkRow to="/terms" label={t("settings.termsOfService")} />
          <LinkRow to="/support" label={t("settings.support")} isLast />
        </div>

        <button
          onClick={signOut}
          className="w-full text-center text-sm text-muted-foreground py-4 rounded-2xl border border-border bg-surface active:bg-muted/50 transition-colors"
        >
          {t("common.signOut")}
        </button>

        <button
          onClick={() => {
            setConfirmText("");
            setDeleteOpen(true);
          }}
          className="w-full flex items-center justify-center gap-2 text-center text-sm text-destructive py-4 rounded-2xl border border-destructive/30 bg-destructive/5 active:opacity-80 transition-opacity"
        >
          <Trash2 className="h-4 w-4" /> {t("settings.deleteAccount")}
        </button>
      </div>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(v) => {
          if (!deleting) setDeleteOpen(v);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("settings.deleteAccountTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("settings.deleteAccountDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            disabled={deleting}
            className="w-full rounded-xl border border-border bg-surface p-3 text-sm outline-none focus:border-urgent"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmText !== "DELETE" || deleting}
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
              className="bg-urgent text-white hover:bg-urgent/90"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("settings.deleteForever")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileFrame>
  );
}

function levelKey(level: PresenceLevel): "Off" | "Ponctual" | "Active" {
  if (level === "off") return "Off";
  if (level === "active_foreground") return "Active";
  return "Ponctual";
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

function PresenceRow({
  label,
  description,
  selected,
  isLast,
  onSelect,
}: {
  label: string;
  description: string;
  selected: boolean;
  isLast?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full px-4 py-3.5 flex items-start gap-3 text-left active:bg-muted/50 transition-colors ${
        !isLast ? "border-b border-border/60" : ""
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-medium text-foreground">{label}</div>
        <div className="text-[13px] text-muted-foreground mt-0.5 leading-snug">{description}</div>
      </div>
      {selected && <Check className="h-5 w-5 text-gold shrink-0 mt-0.5" strokeWidth={2.5} />}
    </button>
  );
}

function LinkRow({ to, label, isLast }: { to: string; label: string; isLast?: boolean }) {
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
      <IosSwitch on={on} />
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
      <IosSwitch on={on} disabled={disabled} />
    </button>
  );
}

function IosSwitch({ on, disabled }: { on: boolean; disabled?: boolean }) {
  return (
    <div
      className={`relative h-[31px] w-[51px] rounded-full shrink-0 transition-colors ${
        on ? "bg-gold" : "bg-muted"
      } ${disabled ? "opacity-70" : ""}`}
      aria-hidden
    >
      <div
        className={`absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-[22px]" : "translate-x-[2px]"
        }`}
      />
    </div>
  );
}
