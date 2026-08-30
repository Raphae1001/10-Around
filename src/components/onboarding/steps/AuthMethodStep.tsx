import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, UserRound } from "lucide-react";
import { signInWithProvider } from "@/lib/native-auth";
import { LegalDocSheet, type LegalDocKind } from "@/components/onboarding/LegalDocSheet";
import { BRAND_BLUE, BRAND_TEXT, BRAND_TEXT_SOFT, BRAND_SHADOW } from "@/lib/brand";

type Provider = "apple" | "google";
type Busy = Provider | "guest" | null;

type Props = {
  /** Runs after a successful Apple/Google sign-in (session already exists). */
  onProviderContinue: (provider: Provider) => Promise<void> | void;
  /** Runs when the user picks Guest — caller creates the anonymous session. */
  onGuestContinue: () => Promise<void> | void;
};

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.475 2.207-1.15 2.994-.788.92-2.05 1.63-3.07 1.55-.146-1.086.41-2.24 1.08-2.97.78-.87 2.15-1.53 3.14-1.574zM20.5 17.14c-.51 1.15-.75 1.67-1.4 2.68-.91 1.42-2.2 3.19-3.79 3.2-1.41.02-1.77-.92-3.68-.91-1.9.01-2.31.93-3.72.91-1.59-.02-2.81-1.6-3.72-3.02-2.55-3.95-2.82-8.58-1.25-11.05.83-1.31 2.19-2.13 3.6-2.15 1.4-.02 2.42.94 3.68.94 1.25 0 2.03-.94 3.68-.9 1.15.03 2.53.63 3.46 1.7-.03.02-2.06 1.2-2.04 3.57.02 2.83 2.49 3.77 2.51 3.78-.02.06-.4 1.36-1.32 2.65z" />
    </svg>
  );
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.04 12.27c0-.85-.07-1.47-.22-2.12H12.24v3.85h6.16c-.12 1.02-.8 2.57-2.3 3.6l-.02.14 3.34 2.58.23.02c2.13-1.96 3.35-4.85 3.35-8.07z"
      />
      <path
        fill="#34A853"
        d="M12.24 23.5c3.02 0 5.56-1 7.41-2.71l-3.53-2.74c-.95.66-2.22 1.12-3.88 1.12-2.96 0-5.47-1.96-6.37-4.66l-.13.01-3.47 2.68-.05.13c1.84 3.65 5.61 6.17 9.99 6.17z"
      />
      <path
        fill="#FBBC05"
        d="M5.87 14.51a6.9 6.9 0 0 1-.37-2.24c0-.78.14-1.53.36-2.24l-.01-.15-3.51-2.72-.11.05A11.5 11.5 0 0 0 .77 12.27c0 1.86.45 3.62 1.24 5.18l3.86-2.94z"
      />
      <path
        fill="#EA4335"
        d="M12.24 5.38c2.1 0 3.52.9 4.33 1.66l3.16-3.08C17.79 2.14 15.26 1 12.24 1 7.86 1 4.09 3.52 2.25 7.17l3.85 2.99c.91-2.7 3.42-4.78 6.14-4.78z"
      />
    </svg>
  );
}

export function AuthMethodStep({ onProviderContinue, onGuestContinue }: Props) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<Busy>(null);
  const [doc, setDoc] = useState<LegalDocKind | null>(null);

  async function handleProvider(provider: Provider) {
    if (busy) return;
    setBusy(provider);
    try {
      await signInWithProvider(provider);
      await onProviderContinue(provider);
    } catch (e) {
      toast.error(t("auth.authFailed"), { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function handleGuest() {
    if (busy) return;
    setBusy("guest");
    try {
      await onGuestContinue();
    } catch (e) {
      toast.error(t("auth.authFailed"), { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="flex-1 flex flex-col">
        <div className="text-center mb-8">
          <h1 className="font-semibold text-3xl tracking-tight" style={{ color: BRAND_TEXT }}>
            {t("auth.chooseMethodTitle")}
          </h1>
          <p
            className="mt-3 text-sm max-w-xs mx-auto leading-relaxed"
            style={{ color: BRAND_TEXT_SOFT }}
          >
            {t("auth.chooseMethodBody")}
          </p>
        </div>

        <div className="flex-1" />

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => void handleProvider("apple")}
            disabled={busy !== null}
            className="w-full h-14 flex items-center justify-center gap-2.5 rounded-2xl bg-black text-white font-semibold transition-transform active:scale-[0.99] disabled:opacity-60"
          >
            {busy === "apple" ? <Loader2 className="h-4 w-4 animate-spin" /> : <AppleLogo />}
            {t("auth.continueApple")}
          </button>

          <button
            type="button"
            onClick={() => void handleProvider("google")}
            disabled={busy !== null}
            className="w-full h-14 flex items-center justify-center gap-2.5 rounded-2xl border border-border bg-white text-[#1f1f1f] font-semibold transition-transform active:scale-[0.99] disabled:opacity-60"
          >
            {busy === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleLogo />}
            {t("auth.continueGoogle")}
          </button>

          <button
            type="button"
            onClick={() => void handleGuest()}
            disabled={busy !== null}
            className="w-full h-14 flex items-center justify-center gap-2.5 rounded-2xl text-white font-semibold transition-transform active:scale-[0.99] disabled:opacity-60"
            style={{ backgroundColor: BRAND_BLUE, boxShadow: BRAND_SHADOW }}
          >
            {busy === "guest" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserRound className="h-4 w-4" />
            )}
            {t("auth.continueGuest")}
          </button>

          <p
            className="text-center text-[11px] leading-relaxed px-2 pt-1"
            style={{ color: BRAND_TEXT_SOFT }}
          >
            {t("auth.guestNote")}
          </p>
        </div>
      </div>

      <div
        className="pt-6 flex items-center justify-center gap-4 text-xs"
        style={{ color: BRAND_TEXT_SOFT }}
      >
        <button
          type="button"
          className="underline underline-offset-2"
          onClick={() => setDoc("terms")}
        >
          {t("common.terms")}
        </button>
        <span aria-hidden="true">·</span>
        <button
          type="button"
          className="underline underline-offset-2"
          onClick={() => setDoc("privacy")}
        >
          {t("common.privacy")}
        </button>
      </div>

      <LegalDocSheet kind={doc} onClose={() => setDoc(null)} />
    </>
  );
}
