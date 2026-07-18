import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Shield,
  Lock,
  Database,
  MapPin,
  Share2,
  Trash2,
  Mail,
  ChevronLeft,
  UserPlus,
  Bell,
  BarChart3,
  Scale,
  MessageCircle,
} from "lucide-react";
import { SUPPORT_EMAIL } from "@/lib/support-email";
import { navigateBack } from "@/lib/navigate-back";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — MinyanNow" },
      {
        name: "description",
        content: "MinyanNow privacy policy: what data we collect, how we use it, and your rights.",
      },
      { property: "og:title", content: "Privacy Policy — MinyanNow" },
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
        MinyanNow uses anonymous authentication: you enter a first and last name to create a
        session. We store a unique user identifier and your display name (and an optional avatar if
        you add one). We do not require an email address or a third-party social login (Apple,
        Google, etc.) at this time.
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
  const router = useRouter();
  const navigate = useNavigate();
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
    <div className="min-h-dvh bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <button
          type="button"
          onClick={() =>
            navigateBack(router.history, () => {
              void navigate({ to: "/settings" });
            })
          }
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ChevronLeft className="h-4 w-4" /> {t("common.back")}
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="h-12 w-12 rounded-2xl gold-gradient text-gold-foreground flex items-center justify-center">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-semibold text-3xl tracking-tight">{t("privacy.title")}</h1>
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
                <div className="flex-1">
                  <h2 className="font-semibold text-lg">{s.title}</h2>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{s.body}</p>
                </div>
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 flex justify-center gap-4 text-xs text-muted-foreground">
          <Link to="/terms" className="underline">
            Terms
          </Link>
          <Link to="/support" className="underline">
            Support
          </Link>
        </div>
      </div>
    </div>
  );
}
