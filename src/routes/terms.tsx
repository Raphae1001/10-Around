import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader } from "@/components/ui-bits";
import { TERMS_SECTIONS } from "@/lib/legal-content";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — MinyanNow" },
      {
        name: "description",
        content:
          "Terms governing your use of MinyanNow — community guidelines, responsibilities, and liability.",
      },
      { property: "og:title", content: "Terms of Service — MinyanNow" },
      { property: "og:description", content: "Terms governing your use of MinyanNow." },
    ],
  }),
  component: Terms,
});

function Terms() {
  const { t } = useTranslation();

  return (
    <MobileFrame showLegal={false}>
      <ScreenHeader
        title={t("settings.termsOfService")}
        subtitle={t("auth.legal.termsUpdated")}
        back
      />

      <div className="px-5 pb-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl gold-gradient text-gold-foreground flex items-center justify-center shrink-0">
            <FileText className="h-6 w-6" />
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{t("termsPage.intro")}</p>
        </div>

        {TERMS_SECTIONS.map((s) => (
          <section key={s.title} className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="font-semibold text-lg">{s.title}</h2>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{s.body}</p>
          </section>
        ))}

        <div className="pt-4 flex justify-center gap-4 text-xs text-muted-foreground">
          <Link to="/privacy" className="underline">
            {t("common.privacy")}
          </Link>
          <Link to="/support" className="underline">
            {t("common.support")}
          </Link>
        </div>
      </div>
    </MobileFrame>
  );
}
