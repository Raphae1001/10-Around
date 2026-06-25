import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Logo, Wordmark } from "@/components/Logo";
import { Loader2, MapPin, Bell, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/analytics";
import { getCurrentPosition, registerPushNotifications, isNative } from "@/lib/native";

export const Route = createFileRoute("/auth")({
  component: Onboarding,
});

function Onboarding() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [locOk, setLocOk] = useState(false);
  const [notifOk, setNotifOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  // Already signed in? Skip onboarding.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate({ to: "/home" });
      } else {
        setChecking(false);
      }
    });
  }, [navigate]);

  const firstT = first.trim();
  const lastT = last.trim();
  const valid =
    firstT.length >= 2 && firstT.length <= 40 &&
    lastT.length >= 2 && lastT.length <= 40;

  async function requestLocation() {
    if (locOk) return;
    // Native uses @capacitor/geolocation (real iOS/Android permission prompt
    // backed by NSLocationWhenInUseUsageDescription / ACCESS_FINE_LOCATION).
    // Web falls back to navigator.geolocation. Single source of truth.
    const pos = await getCurrentPosition();
    if (pos) {
      setLocOk(true);
    } else {
      toast.error("Location permission denied");
    }
  }

  async function requestNotifications() {
    if (notifOk) return;
    if (isNative()) {
      // Real iOS/Android push permission + APNs/FCM registration.
      // The token is persisted to user_push_tokens once the user has a
      // Supabase session (anonymous sign-in happens on Continue), so we
      // stash it in a module-scoped ref and flush after sign-in.
      try {
        await registerPushNotifications((token) => {
          pendingPushToken = token;
        });
        setNotifOk(true);
      } catch (e) {
        toast.error("Notifications permission denied", {
          description: (e as Error).message,
        });
      }
      return;
    }
    // Web fallback
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotifOk(true);
      return;
    }
    try {
      const r = await Notification.requestPermission();
      if (r === "granted") setNotifOk(true);
      else toast.error("Notifications permission denied");
    } catch {
      setNotifOk(true);
    }
  }

  async function onContinue() {
    if (!valid || busy) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInAnonymously({
        options: { data: { first_name: firstT, last_name: lastT, full_name: `${firstT} ${lastT}` } },
      });
      if (error || !data.user) throw error ?? new Error("No user returned");

      // Persist names. The handle_new_user trigger created the profile row.
      const display = `${firstT} ${lastT}`;
      const { error: upErr } = await supabase
        .from("profiles")
        .update({ first_name: firstT, last_name: lastT, display_name: display } as any)
        .eq("id", data.user.id);
      if (upErr) {
        // Non-fatal; user can edit later.
        console.warn("profile update failed", upErr);
      }

      track("sign_up", { method: "anonymous" });
      navigate({ to: "/home" });
    } catch (e) {
      toast.error("Couldn't create your profile", { description: (e as Error).message });
      setBusy(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-dvh w-full bg-muted/40 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh w-full bg-muted/40 flex items-stretch justify-center">
      <div className="relative w-full max-w-[440px] min-h-dvh bg-background flex flex-col">
        <div className="px-8 pt-14 pb-6 text-center">
          <Logo size={56} />
          <h1 className="mt-6 font-display text-3xl">
            {t("auth.welcome")} <Wordmark />
          </h1>
          <p className="mt-3 text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
            Let's create your profile. This only takes a few seconds.
          </p>
        </div>

        <div className="flex-1 px-6 space-y-5">
          <div className="space-y-3">
            <Field
              label="First name"
              value={first}
              onChange={setFirst}
              placeholder="e.g. David"
              autoComplete="given-name"
            />
            <Field
              label="Last name"
              value={last}
              onChange={setLast}
              placeholder="e.g. Cohen"
              autoComplete="family-name"
            />
          </div>

          <div className="space-y-2 pt-2">
            <PermRow
              icon={MapPin}
              label="Enable location"
              hint="Find minyanim around you"
              ok={locOk}
              onClick={requestLocation}
            />
            <PermRow
              icon={Bell}
              label="Enable notifications"
              hint="Get alerts when a minyan is close"
              ok={notifOk}
              onClick={requestNotifications}
            />
          </div>
        </div>

        <div className="px-6 pb-10 pt-4">
          <button
            onClick={onContinue}
            disabled={!valid || busy}
            className="w-full bg-foreground text-background font-semibold py-4 rounded-2xl shadow-lift disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Continue
          </button>
          <p className="text-[11px] text-muted-foreground text-center pt-4 leading-relaxed">
            By continuing you agree to our Terms & Privacy.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, autoComplete,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; autoComplete?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        maxLength={40}
        className="mt-1 w-full rounded-2xl border border-border bg-surface p-4 text-sm outline-none focus:border-gold"
      />
    </label>
  );
}

function PermRow({
  icon: Icon, label, hint, ok, onClick,
}: { icon: any; label: string; hint: string; ok: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
        ok ? "border-success/40 bg-success/5" : "border-border bg-surface"
      }`}
    >
      <div className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 ${
        ok ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
      }`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      {ok ? (
        <Check className="h-5 w-5 text-success" />
      ) : (
        <span className="text-xs font-semibold text-gold">Enable</span>
      )}
    </button>
  );
}
