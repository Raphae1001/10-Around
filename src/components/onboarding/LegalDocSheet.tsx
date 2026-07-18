import { useTranslation } from "react-i18next";
import { FileText, Lock } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TERMS_SECTIONS, PRIVACY_LEGAL_SECTIONS } from "@/lib/legal-content";

export type LegalDocKind = "terms" | "privacy";

type Props = {
  kind: LegalDocKind | null;
  onClose: () => void;
};

const PRIVACY_I18N_KEYS = ["data", "use", "location", "sharing", "retention", "contact"] as const;

export function LegalDocSheet({ kind, onClose }: Props) {
  const { t } = useTranslation();
  const open = kind !== null;
  const isTerms = kind === "terms";

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="bottom"
        className="h-[85dvh] max-w-[440px] mx-auto rounded-t-3xl p-0 flex flex-col gap-0"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border text-left shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl gold-gradient text-gold-foreground flex items-center justify-center shrink-0">
              {isTerms ? <FileText className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <SheetTitle className="font-semibold text-xl">
                {isTerms ? t("auth.legal.termsTitle") : t("auth.legal.privacyTitle")}
              </SheetTitle>
              <SheetDescription className="text-xs">
                {isTerms ? t("auth.legal.termsUpdated") : t("privacy.updated")}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-5 space-y-4">
          {isTerms ? (
            TERMS_SECTIONS.map((s) => (
              <section key={s.title} className="rounded-2xl border border-border bg-surface p-4">
                <h3 className="font-semibold text-base text-foreground">{s.title}</h3>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{s.body}</p>
              </section>
            ))
          ) : (
            <>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("privacy.intro")}</p>
              {PRIVACY_I18N_KEYS.map((k) => (
                <section key={k} className="rounded-2xl border border-border bg-surface p-4">
                  <h3 className="font-semibold text-base text-foreground">
                    {t(`privacy.sections.${k}.title`)}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                    {t(`privacy.sections.${k}.body`)}
                  </p>
                </section>
              ))}
              {PRIVACY_LEGAL_SECTIONS.map((s) => (
                <section key={s.title} className="rounded-2xl border border-border bg-surface p-4">
                  <h3 className="font-semibold text-base text-foreground">{s.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{s.body}</p>
                </section>
              ))}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
