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

// EN-only legally-required sections (not auto-translated for the v1 launch).
const LEGAL_SECTIONS: { icon: typeof UserPlus; title: string; body: React.ReactNode }[] = [
  {
    icon: UserPlus,
    title: "Account creation & authentication",
    body: (
      <>
        You can sign in with Apple or Google, or continue as a guest using anonymous
        authentication. We store a unique user identifier and your display name (and an optional
        avatar if you add one). Guest accounts can be upgraded to Apple or Google sign-in at any
        time from Profile without losing your history.
      </>
    ),
  },
  {
    icon: MapPin,
    title: "Location & blurred presence",
    body: (
      <>
        Your device location is used only while the app is in use — to show nearby minyanim, let you
        create one where you stand, and (if you enable presence) count people in your area. We never
        store your exact GPS coordinates for density counting. Instead we store only a blurred zone
        (geohash, roughly ~1 km) that cannot be reversed to a street address. We do not track your
        location in the background. You can revoke location access at any time in your device
        settings, and adjust presence in Settings.
      </>
    ),
  },
  {
    icon: MessageCircle,
    title: "Chat & user-generated content",
    body: (
      <>
        If you join a minyan or trip chat, messages you send are stored so other members of that
        thread can see them. You can report inappropriate messages from inside the chat. We review
        reports and may remove content or suspend accounts that violate our Terms.
      </>
    ),
  },
  {
    icon: Bell,
    title: "Push notifications",
    body: (
      <>
        When push delivery is enabled in a future update, we may store an anonymous device push
        token associated with your account so we can alert you about nearby minyanim and related
        prompts. The token contains no personal information and is deleted when you uninstall the
        app or delete your account. Preference toggles in Settings are saved locally until delivery
        ships.
      </>
    ),
  },
  {
    icon: BarChart3,
    title: "Analytics",
    body: (
      <>
        With your consent, we use Google Analytics 4 and Microsoft Clarity to understand which
        features are used and where the app can be improved. We disable Google Signals and ad
        personalization, do not send personal identifiers, and IP addresses are anonymized. You can
        disable analytics at any time from Settings → Analytics.
      </>
    ),
  },
  {
    icon: Database,
    title: "Data storage & retention",
    body: (
      <>
        Account data, minyan records, presence zones, and chat messages are stored on secure managed
        Postgres infrastructure (Supabase) protected by row-level security. Data is encrypted in
        transit (HTTPS) and at rest. Live street minyanim expire automatically after their time
        window; presence rows and tokens are removed when you delete your account.
      </>
    ),
  },
  {
    icon: Scale,
    title: "Your rights",
    body: (
      <>
        You have the right to access, correct, export, or delete your data at any time. Under GDPR
        (EU), CCPA (California), and similar laws, you can also restrict or object to processing.
        Most rights can be exercised directly in the app; for anything else, contact us at the email
        below.
      </>
    ),
  },
  {
    icon: Trash2,
    title: "Account deletion",
    body: (
      <>
        You can delete your account at any time from{" "}
        <Link to="/settings" className="underline">
          Settings → Delete Account
        </Link>
        . Deletion is immediate and permanent: your profile, presence zone, push tokens,
        participation history, chat membership, messages you sent (where cascaded), and minyanim you
        created are removed. If you cannot sign in, email{" "}
        <a className="underline" href={`mailto:${SUPPORT_EMAIL}?subject=Account%20deletion`}>
          {SUPPORT_EMAIL}
        </a>{" "}
        and we will process the deletion manually within 30 days.
      </>
    ),
  },
  {
    icon: Mail,
    title: "Contact",
    body: (
      <>
        Questions or requests about your data? Email{" "}
        <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>
          {SUPPORT_EMAIL}
        </a>
        .
      </>
    ),
  },
];

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

        {LEGAL_SECTIONS.map((s) => (
          <section key={s.title} className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <s.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-lg">{s.title}</h2>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{s.body}</p>
              </div>
            </div>
          </section>
        ))}

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
