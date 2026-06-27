import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Shield, Lock, Database, MapPin, Share2, Trash2, Mail, ChevronLeft, UserPlus, Bell, BarChart3, Scale } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — MinyanNow" },
      { name: "description", content: "MinyanNow privacy policy: what data we collect, how we use it, and your rights." },
      { property: "og:title", content: "Privacy Policy — MinyanNow" },
      { property: "og:description", content: "Transparent data practices for the global minyan network." },
    ],
  }),
  component: Privacy,
});

const SUPPORT_EMAIL = "support@minyannow.com";

// EN-only legally-required sections, appended below the translated marketing
// overview. Legal text is intentionally not auto-translated for the v1 launch.
const LEGAL_SECTIONS: { icon: typeof UserPlus; title: string; body: React.ReactNode }[] = [
  {
    icon: UserPlus,
    title: "Account creation & authentication",
    body: (
      <>
        We support sign-in with Apple, Google, and email/password. When you create an account we store your email
        address and a unique user identifier. If you sign in with Apple or Google, we receive your basic profile
        (name, avatar) from the provider and nothing else. We never receive your provider password.
      </>
    ),
  },
  {
    icon: MapPin,
    title: "Location",
    body: (
      <>
        MinyanNow uses your device location only while the app is in use, and only to show nearby minyanim
        and let you create one where you stand. We do not track your location in the background. You can
        revoke this permission at any time in your device settings.
      </>
    ),
  },
  {
    icon: Bell,
    title: "Push notifications",
    body: (
      <>
        If you allow notifications, we store an anonymous push token associated with your account so we can alert
        you about nearby minyanim, kaddish requests, and confirmation prompts. The token contains no personal
        information and is deleted when you uninstall the app or delete your account.
      </>
    ),
  },
  {
    icon: BarChart3,
    title: "Analytics",
    body: (
      <>
        With your consent, we use Google Analytics 4 and Microsoft Clarity to understand which features are used
        and where the app can be improved. We disable Google Signals and ad personalization, do not send any
        personal identifiers, and IP addresses are anonymized. You can disable analytics at any time from
        Settings → Analytics.
      </>
    ),
  },
  {
    icon: Database,
    title: "Data storage & retention",
    body: (
      <>
        Account data, minyan records, and chat messages are stored on secure managed Postgres infrastructure
        (Supabase) protected by row-level security. Data is encrypted in transit (HTTPS) and at
        rest. Live minyanim are automatically deleted 40 minutes after their start time; travel presence is
        deleted at the end of your travel window.
      </>
    ),
  },
  {
    icon: Scale,
    title: "Your rights",
    body: (
      <>
        You have the right to access, correct, export, or delete your data at any time. Under GDPR (EU), CCPA
        (California), and similar laws, you can also restrict or object to processing. Most rights can be
        exercised directly in the app; for anything else, contact us at the email below.
      </>
    ),
  },
  {
    icon: Trash2,
    title: "Account deletion",
    body: (
      <>
        You can delete your account at any time from{" "}
        <Link to="/settings" className="underline">Settings → Delete Account</Link>. Deletion is immediate and
        permanent: your profile, push tokens, participation history, chat membership, and minyanim you created
        are removed. If you cannot sign in, email{" "}
        <a className="underline" href={`mailto:${SUPPORT_EMAIL}?subject=Account%20deletion`}>{SUPPORT_EMAIL}</a>{" "}
        from the address on your account and we will process the deletion manually within 30 days.
      </>
    ),
  },
  {
    icon: Mail,
    title: "Contact",
    body: (
      <>
        Questions or requests about your data? Email{" "}
        <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </>
    ),
  },
];

function Privacy() {
  const { t } = useTranslation();
  const icons = { data: Database, use: Shield, location: MapPin, sharing: Share2, retention: Trash2, contact: Mail };
  const sections = ["data", "use", "location", "sharing", "retention", "contact"] as const;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ChevronLeft className="h-4 w-4" /> {t("common.back")}
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="h-12 w-12 rounded-2xl gold-gradient text-gold-foreground flex items-center justify-center">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-3xl tracking-tight">{t("privacy.title")}</h1>
            <p className="text-xs text-muted-foreground">{t("privacy.updated")}</p>
          </div>
        </div>

        <p className="mt-6 text-base text-muted-foreground leading-relaxed">{t("privacy.intro")}</p>

        <div className="mt-8 space-y-4">
          {sections.map((k) => {
            const Icon = icons[k];
            return (
              <section key={k} className="rounded-2xl border border-border bg-surface p-5">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h2 className="font-display text-lg">{t(`privacy.sections.${k}.title` as any)}</h2>
                    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{t(`privacy.sections.${k}.body` as any)}</p>
                  </div>
                </div>
              </section>
            );
          })}

          {LEGAL_SECTIONS.map((s) => (
            <section key={s.title} className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h2 className="font-display text-lg">{s.title}</h2>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{s.body}</p>
                </div>
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 flex justify-center gap-4 text-xs text-muted-foreground">
          <Link to="/terms" className="underline">Terms</Link>
          <Link to="/support" className="underline">Support</Link>
        </div>
      </div>
    </div>
  );
}
