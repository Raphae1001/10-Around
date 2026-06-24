import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, FileText } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — MinyanNow" },
      { name: "description", content: "Terms governing your use of MinyanNow — community guidelines, responsibilities, and liability." },
      { property: "og:title", content: "Terms of Service — MinyanNow" },
      { property: "og:description", content: "Terms governing your use of MinyanNow." },
    ],
  }),
  component: Terms,
});

const SECTIONS: { title: string; body: string }[] = [
  {
    title: "1. Acceptance of terms",
    body: "By creating an account or using MinyanNow you agree to these terms. If you do not agree, please do not use the app.",
  },
  {
    title: "2. Eligibility & accounts",
    body: "You must be at least 13 years old to use MinyanNow. You are responsible for the activity on your account and for keeping your credentials secure.",
  },
  {
    title: "3. User responsibilities",
    body: "You agree to provide accurate information, to use the service in good faith, and to respect the privacy and dignity of other users. Do not impersonate others, submit fake locations, or attempt to disrupt the service.",
  },
  {
    title: "4. Minyan creation guidelines",
    body: "When you create a minyan you commit to providing a real, accessible location and an honest time window. Do not create test, fake, joke, or commercial minyanim. Cancel a scheduled minyan as soon as you know it will not happen.",
  },
  {
    title: "5. Community behavior",
    body: "MinyanNow is a respectful community of Jewish daveners. Harassment, hate speech, discriminatory content, sexual content, advertising, or any content that targets, mocks, or excludes other users is prohibited. Moderators may remove content and suspend accounts that violate these rules.",
  },
  {
    title: "6. Reporting",
    body: "If you see content or behavior that violates these terms, please contact us at support@minyannow.com. We review reports and take action where appropriate.",
  },
  {
    title: "7. Service availability",
    body: "We work hard to keep MinyanNow available, but we do not guarantee uninterrupted service. Features may change, be added, or be removed without notice. We may perform maintenance that briefly interrupts the service.",
  },
  {
    title: "8. Limitation of liability",
    body: "MinyanNow is provided \"as is\" without warranty of any kind. To the maximum extent allowed by law, we are not liable for any indirect, incidental, or consequential damages arising from your use of the app, including reliance on minyan times, locations, or attendance counts.",
  },
  {
    title: "9. Termination",
    body: "You may delete your account at any time from Settings → Delete Account. We may suspend or terminate accounts that violate these terms or that pose a risk to other users.",
  },
  {
    title: "10. Changes to these terms",
    body: "We may update these terms from time to time. Material changes will be communicated through the app. Continued use of MinyanNow after changes take effect constitutes acceptance of the updated terms.",
  },
  {
    title: "11. Contact",
    body: "Questions about these terms? Email support@minyannow.com.",
  },
];

function Terms() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ChevronLeft className="h-4 w-4" /> Back
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-2xl gold-gradient text-gold-foreground flex items-center justify-center">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-3xl tracking-tight">Terms of Service</h1>
            <p className="text-xs text-muted-foreground">Last updated: June 2026</p>
          </div>
        </div>

        <div className="space-y-4">
          {SECTIONS.map((s) => (
            <section key={s.title} className="rounded-2xl border border-border bg-surface p-5">
              <h2 className="font-display text-lg">{s.title}</h2>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{s.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-10 flex justify-center gap-4 text-xs text-muted-foreground">
          <Link to="/privacy" className="underline">Privacy</Link>
          <Link to="/support" className="underline">Support</Link>
        </div>
      </div>
    </div>
  );
}
