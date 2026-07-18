import { createFileRoute, Link } from "@tanstack/react-router";
import { LifeBuoy, Mail, Bug, Flag, UserX, HelpCircle } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader } from "@/components/ui-bits";
import { SUPPORT_EMAIL } from "@/lib/support-email";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support — MinyanNow" },
      {
        name: "description",
        content:
          "Get help with MinyanNow — FAQ, bug reports, content reports, and account assistance.",
      },
      { property: "og:title", content: "Support — MinyanNow" },
      { property: "og:description", content: "Help and account assistance for MinyanNow." },
    ],
  }),
  component: Support,
});

function Support() {
  const { t } = useTranslation();

  const faq = [
    { q: "support.faq.notifQ", a: "support.faq.notifA" },
    { q: "support.faq.nearbyQ", a: "support.faq.nearbyA" },
    { q: "support.faq.langQ", a: "support.faq.langA" },
    { q: "support.faq.createQ", a: "support.faq.createA" },
    { q: "support.faq.cancelQ", a: "support.faq.cancelA" },
    { q: "support.faq.freeQ", a: "support.faq.freeA" },
  ] as const;

  return (
    <MobileFrame showLegal={false}>
      <ScreenHeader title={t("support.title")} subtitle={t("support.subtitle")} back />

      <div className="px-5 pb-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl gold-gradient text-gold-foreground flex items-center justify-center shrink-0">
            <LifeBuoy className="h-6 w-6" />
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{t("support.intro")}</p>
        </div>

        <Card icon={Mail} title={t("support.contactTitle")}>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("support.contactBody", { email: SUPPORT_EMAIL })}
          </p>
          <p className="text-sm mt-2">
            <a className="underline text-foreground" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
          </p>
        </Card>

        <Card icon={HelpCircle} title={t("support.faqTitle")}>
          <div className="space-y-4">
            {faq.map((f) => (
              <div key={f.q}>
                <div className="text-sm font-semibold">{t(f.q)}</div>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{t(f.a)}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card icon={Bug} title={t("support.bugTitle")}>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("support.bugIntro", { email: SUPPORT_EMAIL })}
          </p>
          <p className="text-sm mt-1">
            <a
              className="underline text-foreground"
              href={`mailto:${SUPPORT_EMAIL}?subject=Bug%20report`}
            >
              {SUPPORT_EMAIL}
            </a>
          </p>
          <ul className="mt-2 text-sm text-muted-foreground list-disc pl-5 space-y-1">
            <li>{t("support.bugWhat")}</li>
            <li>{t("support.bugInstead")}</li>
            <li>{t("support.bugDevice")}</li>
            <li>{t("support.bugVersion")}</li>
            <li>{t("support.bugScreenshot")}</li>
          </ul>
        </Card>

        <Card icon={Flag} title={t("support.reportTitle")}>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <Trans
              i18nKey="support.reportBody"
              values={{ email: SUPPORT_EMAIL }}
              components={{
                terms: <Link to="/terms" className="underline text-foreground" />,
              }}
            />
          </p>
          <p className="text-sm mt-2">
            <a
              className="underline text-foreground"
              href={`mailto:${SUPPORT_EMAIL}?subject=Content%20report`}
            >
              {SUPPORT_EMAIL}
            </a>
          </p>
        </Card>

        <Card icon={UserX} title={t("support.accountTitle")}>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <Trans
              i18nKey="support.accountBody"
              values={{ email: SUPPORT_EMAIL }}
              components={{
                settings: <Link to="/settings" className="underline text-foreground" />,
              }}
            />
          </p>
          <p className="text-sm mt-2">
            <a
              className="underline text-foreground"
              href={`mailto:${SUPPORT_EMAIL}?subject=Account%20deletion`}
            >
              {SUPPORT_EMAIL}
            </a>
          </p>
        </Card>

        <div className="pt-4 flex justify-center gap-4 text-xs text-muted-foreground">
          <Link to="/privacy" className="underline">
            {t("common.privacy")}
          </Link>
          <Link to="/terms" className="underline">
            {t("common.terms")}
          </Link>
        </div>
      </div>
    </MobileFrame>
  );
}

function Card({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Mail;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-lg mb-2">{title}</h2>
          {children}
        </div>
      </div>
    </section>
  );
}
