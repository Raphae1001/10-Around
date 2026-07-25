import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { WelcomeTermsStep } from "@/components/onboarding/steps/WelcomeTermsStep";
import { AuthMethodStep } from "@/components/onboarding/steps/AuthMethodStep";
import { LocationPrimerDialog } from "@/components/LocationPrimerDialog";
import { NotificationsPrimerDialog } from "@/components/onboarding/NotificationsPrimerDialog";
import { track } from "@/lib/analytics";
import { setAppPref } from "@/lib/app-prefs";
import { setPendingTermsAcceptedAt, takePendingTermsAcceptedAt } from "@/lib/pending-terms";
import {
  registerPushNotifications,
  requestLocationPermission,
  isNative,
} from "@/lib/native";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  component: Onboarding,
});

type Step = 0 | 1;
type Method = "apple" | "google" | "guest";

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
  const [pendingMethod, setPendingMethod] = useState<Method | null>(null);
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
    setPendingTermsAcceptedAt(termsAcceptedAt);
    setStep(1);
  }

  /** Apple/Google session already exists at this point — go straight to the primer dialogs. */
  function handleProviderContinue(provider: "apple" | "google") {
    setPendingMethod(provider);
    setLocDialogOpen(true);
  }

  /** Guest defers the actual anonymous sign-in until after the primer dialogs, same as before. */
  function handleGuestContinue() {
    setPendingMethod("guest");
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
    await finalizeAndEnter();
  }

  async function handleNotifSkip() {
    setNotifDialogOpen(false);
    await finalizeAndEnter();
  }

  async function finalizeAndEnter() {
    if (busy || !pendingMethod) return;
    setBusy(true);
    try {
      let userId: string;

      if (pendingMethod === "guest") {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error || !data.user) throw error ?? new Error("No user returned");
        userId = data.user.id;
      } else {
        const { data } = await supabase.auth.getSession();
        if (!data.session) throw new Error("No session after sign-in");
        userId = data.session.user.id;
      }

      const acceptedAt = takePendingTermsAcceptedAt() ?? termsAcceptedAt;
      if (acceptedAt) {
        const { error: upErr } = await supabase
          .from("profiles")
          .update({ terms_accepted_at: acceptedAt })
          .eq("id", userId);
        if (upErr) console.warn("profile update failed", upErr);
      }

      if (pendingPushToken) {
        const tok = pendingPushToken;
        pendingPushToken = null;
        const { error: pushErr } = await supabase
          .from("user_push_tokens")
          .upsert({ user_id: userId, token: tok });
        if (pushErr) console.warn("push token persist failed", pushErr);
      }

      track("sign_up", { method: pendingMethod });
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
          <AuthMethodStep
            onProviderContinue={handleProviderContinue}
            onGuestContinue={handleGuestContinue}
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
