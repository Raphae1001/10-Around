import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Logo, Wordmark } from "@/components/Logo";
import { LegalDocSheet, type LegalDocKind } from "@/components/onboarding/LegalDocSheet";
import { cn } from "@/lib/utils";

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
          <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-40 w-40 rounded-full bg-gold/10 dark:bg-gold/15 blur-3xl" />
          <div className="relative">
            <Logo size={56} />
          </div>
          <h1 className="relative mt-6 font-semibold text-3xl text-foreground">
            {t("auth.welcome")} <Wordmark />
          </h1>
          <p className="mt-3 text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
            {t("onboarding.tagline")}
          </p>
          <p className="mt-2 text-xs text-muted-foreground/70 max-w-xs mx-auto">
            {t("onboarding.places")}
          </p>
        </div>

        <div className="flex-1" />

        <label
          className={cn(
            "flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition-colors",
            accepted
              ? "border-gold/40 bg-gold/5 dark:bg-gold/10"
              : "border-border bg-surface hover:border-border/80",
          )}
        >
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => onAcceptedChange(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 rounded border-border accent-gold cursor-pointer"
          />
          <span className="text-sm text-foreground leading-relaxed">
            <Trans
              i18nKey="auth.acceptTerms"
              components={{
                terms: (
                  <button
                    type="button"
                    className="font-medium text-gold underline underline-offset-2 hover:opacity-80"
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
                    className="font-medium text-gold underline underline-offset-2 hover:opacity-80"
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
          className="w-full gold-gradient text-gold-foreground font-semibold py-4 rounded-2xl shadow-glow-gold transition-transform active:scale-[0.99] disabled:opacity-40 disabled:shadow-none disabled:active:scale-100"
        >
          {t("common.continue")}
        </button>
      </div>

      <LegalDocSheet kind={doc} onClose={() => setDoc(null)} />
    </>
  );
}
