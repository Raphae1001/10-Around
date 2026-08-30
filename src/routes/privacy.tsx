import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Shield,
  Lock,
  Database,
  MapPin,
  Share2,
  Trash2,
  Mail,
  UserPlus,
  Bell,
  BarChart3,
  Scale,
  MessageCircle,
} from "lucide-react";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader } from "@/components/ui-bits";
import { SUPPORT_EMAIL } from "@/lib/support-email";
import { PRIVACY_LEGAL_SECTIONS } from "@/lib/legal-content";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — 10 Around" },
      {
        name: "description",
        content: "10 Around privacy policy: what data we collect, how we use it, and your rights.",
      },
      { property: "og:title", content: "Privacy Policy — 10 Around" },
      {
        property: "og:description",
        content: "Transparent data practices for the global minyan network.",
      },
    ],
  }),
  component: Privacy,
});

// Icon per legal section, keyed by title — presentational only; the section
// text itself now comes solely from PRIVACY_LEGAL_SECTIONS (single source of
// truth, shared with LegalDocSheet.tsx).
const LEGAL_SECTION_ICONS: Record<string, typeof UserPlus> = {
  "Account creation & authentication": UserPlus,
  "Location & blurred presence": MapPin,
  "Chat & user-generated content": MessageCircle,
  "Push notifications": Bell,
  Analytics: BarChart3,
  "Data storage & retention": Database,
  "Your rights": Scale,
  "Account deletion": Trash2,
  Contact: Mail,
};

const SETTINGS_DELETE_PHRASE = "Settings → Delete Account";

/**
 * Renders a legal section's plain-text body, upgrading two known substrings
 * (the Settings deep link, the support mailto) to real interactive links —
 * without altering the wording, which comes entirely from
 * PRIVACY_LEGAL_SECTIONS. Every other section renders as plain text.
 */
function renderLegalBody(title: string, body: string): React.ReactNode {
  if (title === "Account deletion") {
    const settingsIdx = body.indexOf(SETTINGS_DELETE_PHRASE);
    const emailIdx = body.indexOf(SUPPORT_EMAIL);
    if (settingsIdx === -1 || emailIdx === -1) return body;
    return (
      <>
        {body.slice(0, settingsIdx)}
        <Link to="/settings" className="underline">
          {SETTINGS_DELETE_PHRASE}
        </Link>
        {body.slice(settingsIdx + SETTINGS_DELETE_PHRASE.length, emailIdx)}
        <a className="underline" href={`mailto:${SUPPORT_EMAIL}?subject=Account%20deletion`}>
          {SUPPORT_EMAIL}
        </a>
        {body.slice(emailIdx + SUPPORT_EMAIL.length)}
      </>
    );
  }
  if (title === "Contact") {
    const emailIdx = body.indexOf(SUPPORT_EMAIL);
    if (emailIdx === -1) return body;
    return (
      <>
        {body.slice(0, emailIdx)}
        <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>
          {SUPPORT_EMAIL}
        </a>
        {body.slice(emailIdx + SUPPORT_EMAIL.length)}
      </>
    );
  }
  return body;
}

function Privacy() {
  const { t } = useTranslation();
  const icons = {
    data: Database,
    use: Shield,
    location: MapPin,
    sharing: Share2,
    retention: Trash2,
    contact: Mail,
  };
  const sections = ["data", "use", "location", "sharing", "retention", "contact"] as const;

  return (
    <MobileFrame showLegal={false}>
      <ScreenHeader title={t("privacy.title")} subtitle={t("privacy.updated")} back />

      <div className="px-5 pb-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl gold-gradient text-gold-foreground flex items-center justify-center shrink-0">
            <Lock className="h-6 w-6" />
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{t("privacy.intro")}</p>
        </div>

        {sections.map((k) => {
          const Icon = icons[k];
          return (
            <section key={k} className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-lg">
                    {t(`privacy.sections.${k}.title` as any)}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                    {t(`privacy.sections.${k}.body` as any)}
                  </p>
                </div>
              </div>
            </section>
          );
        })}

        {PRIVACY_LEGAL_SECTIONS.map((s) => {
          const Icon = LEGAL_SECTION_ICONS[s.title] ?? Shield;
          return (
            <section key={s.title} className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-lg">{s.title}</h2>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                    {renderLegalBody(s.title, s.body)}
                  </p>
                </div>
              </div>
            </section>
          );
        })}

        <div className="pt-4 flex justify-center gap-4 text-xs text-muted-foreground">
          <Link to="/terms" className="underline">
            {t("common.terms")}
          </Link>
          <Link to="/support" className="underline">
            {t("common.support")}
          </Link>
        </div>
      </div>
    </MobileFrame>
  );
}
