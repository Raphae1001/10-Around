import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { MapPin } from "lucide-react";
import { Logo, Wordmark } from "@/components/Logo";
import { LegalDocSheet, type LegalDocKind } from "@/components/onboarding/LegalDocSheet";
import { cn } from "@/lib/utils";
import { BRAND_BLUE, BRAND_TEXT, BRAND_TEXT_SOFT, BRAND_HALO, BRAND_SHADOW } from "@/lib/brand";

type Props = {
  accepted: boolean;
  onAcceptedChange: (accepted: boolean) => void;
  onContinue: () => void;
};

export function WelcomeTermsStep({ accepted, onAcceptedChange, onContinue }: Props) {
  const { t } = useTranslation();
  const [doc, setDoc] = useState<LegalDocKind | null>(null);

  return (
    <>
      <div className="flex-1 flex flex-col">
        <div className="relative text-center">
          <div
            className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-40 w-40 rounded-full blur-3xl"
            style={{ backgroundColor: BRAND_HALO }}
          />
          <div className="relative">
            <Logo size={56} />
          </div>
          <h1 className="relative mt-6 text-3xl" style={{ color: BRAND_TEXT, fontWeight: 700 }}>
            {t("auth.welcome")} <Wordmark style={{ color: BRAND_TEXT, fontWeight: 700 }} />
          </h1>
          <p
            className="mt-3 text-sm max-w-xs mx-auto leading-relaxed"
            style={{ color: BRAND_TEXT }}
          >
            {t("auth.welcomeTagline")}
          </p>
          <p className="mt-1 text-xs max-w-xs mx-auto" style={{ color: BRAND_TEXT_SOFT }}>
            {t("auth.welcomeSub")}
          </p>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div
            className="flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase"
            style={{ color: BRAND_BLUE }}
          >
            <MapPin className="h-3 w-3" />
            {t("splash.mission")}
          </div>
        </div>

        <label
          className={cn(
            "flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition-colors",
            accepted ? "border-border" : "border-border hover:border-border/80",
          )}
          style={accepted ? { backgroundColor: `${BRAND_BLUE}0d`, borderColor: `${BRAND_BLUE}66` } : undefined}
        >
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => onAcceptedChange(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 rounded border-border cursor-pointer"
            style={{ accentColor: BRAND_BLUE }}
          />
          <span className="text-sm leading-relaxed" style={{ color: BRAND_TEXT }}>
            <Trans
              i18nKey="auth.acceptTerms"
              components={{
                terms: (
                  <button
                    type="button"
                    className="font-medium underline underline-offset-2 hover:opacity-80"
                    style={{ color: BRAND_BLUE }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDoc("terms");
                    }}
                  />
                ),
                privacy: (
                  <button
                    type="button"
                    className="font-medium underline underline-offset-2 hover:opacity-80"
                    style={{ color: BRAND_BLUE }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDoc("privacy");
                    }}
                  />
                ),
              }}
            />
          </span>
        </label>
      </div>

      <div className="pt-6">
        <button
          type="button"
          onClick={onContinue}
          disabled={!accepted}
          className="w-full h-14 text-white font-semibold rounded-2xl transition-transform active:scale-[0.99] disabled:opacity-40 disabled:active:scale-100"
          style={{ backgroundColor: BRAND_BLUE, boxShadow: BRAND_SHADOW }}
        >
          {t("common.continue")}
        </button>
      </div>

      <LegalDocSheet kind={doc} onClose={() => setDoc(null)} />
    </>
  );
}
