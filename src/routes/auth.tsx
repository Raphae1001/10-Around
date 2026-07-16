import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { WelcomeTermsStep } from "@/components/onboarding/steps/WelcomeTermsStep";
import { NameStep } from "@/components/onboarding/steps/NameStep";
import { LocationPrimerDialog } from "@/components/LocationPrimerDialog";
import { NotificationsPrimerDialog } from "@/components/onboarding/NotificationsPrimerDialog";
import { track } from "@/lib/analytics";
import { setAppPref } from "@/lib/app-prefs";
import {
  registerPushNotifications,
  requestLocationPermission,
  isNative,
} from "@/lib/native";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  component: Onboarding,
});

type Step = 0 | 1 | 2;

/** Same key as home.tsx — avoid re-showing the primer after we already prompted. */
const PRIMER_SEEN_KEY = "minyan:location-primer-seen";

// Module-scoped buffer for the push token (permission may be granted before session write).
let pendingPushToken: string | null = null;

async function requestNotifications(): Promise<void> {
  if (isNative()) {
    await registerPushNotifications((token) => {
      pendingPushToken = token;
    });
    return;
  }
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
}

function Onboarding() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState<Step>(0);
  const [termsAccepted, setTermsAccepted] = useState(false);
  /** ISO timestamp captured when the user checks the box; written to profiles at finish. */
  const [termsAcceptedAt, setTermsAcceptedAt] = useState<string | null>(null);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [busy, setBusy] = useState(false);
  const [entering, setEntering] = useState(true);
  const [locDialogOpen, setLocDialogOpen] = useState(false);
  const [notifDialogOpen, setNotifDialogOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate({ to: "/home" });
      } else {
        setChecking(false);
      }
    });
  }, [navigate]);

  useEffect(() => {
    setEntering(false);
    const id = requestAnimationFrame(() => setEntering(true));
    return () => cancelAnimationFrame(id);
  }, [step]);

  function handleTermsChange(accepted: boolean) {
    setTermsAccepted(accepted);
    setTermsAcceptedAt(accepted ? new Date().toISOString() : null);
  }

  function handleWelcomeContinue() {
    if (!termsAccepted || !termsAcceptedAt) return;
    setStep(1);
  }

  function handleFirstNameContinue() {
    setStep(2);
  }

  /** After last name → show in-app location dialog (works on web + native). */
  function handleLastNameContinue() {
    setLocDialogOpen(true);
  }

  async function handleLocAllow() {
    setLocDialogOpen(false);
    // Fresh click gesture → OS/browser location prompt.
    await requestLocationPermission().catch(() => false);
    await setAppPref(PRIMER_SEEN_KEY, "1");
    setNotifDialogOpen(true);
  }

  async function handleNotifAllow() {
    setNotifDialogOpen(false);
    // Fresh click gesture → OS/browser notification prompt.
    await requestNotifications().catch((e) => {
      console.warn("notifications permission failed", e);
    });
    await createAccountAndEnter();
  }

  async function handleNotifSkip() {
    setNotifDialogOpen(false);
    await createAccountAndEnter();
  }

  async function createAccountAndEnter() {
    if (busy || !termsAcceptedAt) return;
    setBusy(true);
    try {
      const firstT = first.trim();
      const lastT = last.trim();
      const display = [firstT, lastT].filter(Boolean).join(" ") || null;

      const { data, error } = await supabase.auth.signInAnonymously({
        options: {
          data: {
            first_name: firstT || undefined,
            last_name: lastT || undefined,
            full_name: display ?? undefined,
          },
        },
      });
      if (error || !data.user) throw error ?? new Error("No user returned");

      const { error: upErr } = await supabase
        .from("profiles")
        .update({
          first_name: firstT || null,
          last_name: lastT || null,
          display_name: display,
          terms_accepted_at: termsAcceptedAt,
        })
        .eq("id", data.user.id);
      if (upErr) console.warn("profile update failed", upErr);

      if (pendingPushToken) {
        const tok = pendingPushToken;
        pendingPushToken = null;
        const { error: pushErr } = await supabase
          .from("user_push_tokens")
          .upsert({ user_id: data.user.id, token: tok });
        if (pushErr) console.warn("push token persist failed", pushErr);
      }

      track("sign_up", { method: "anonymous" });
      navigate({ to: "/home" });
    } catch (e) {
      toast.error(t("auth.authFailed"), { description: (e as Error).message });
      setBusy(false);
    }
  }

  if (checking || busy) {
    return (
      <div className="min-h-dvh w-full bg-muted/40 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <OnboardingShell>
      <div
        key={step}
        className={cn(
          "flex-1 flex flex-col transition-all duration-300 ease-out",
          entering ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4",
        )}
      >
        {step === 0 && (
          <WelcomeTermsStep
            accepted={termsAccepted}
            onAcceptedChange={handleTermsChange}
            onContinue={handleWelcomeContinue}
          />
        )}
        {step === 1 && (
          <NameStep
            kind="first"
            value={first}
            onChange={setFirst}
            onContinue={handleFirstNameContinue}
          />
        )}
        {step === 2 && (
          <NameStep
            kind="last"
            value={last}
            onChange={setLast}
            onContinue={handleLastNameContinue}
          />
        )}
      </div>

      <LocationPrimerDialog
        open={locDialogOpen}
        onOpenChange={setLocDialogOpen}
        onAllow={() => void handleLocAllow()}
        showLater={false}
      />

      <NotificationsPrimerDialog
        open={notifDialogOpen}
        onOpenChange={setNotifDialogOpen}
        onAllow={() => void handleNotifAllow()}
        onSkip={() => void handleNotifSkip()}
      />
    </OnboardingShell>
  );
}
