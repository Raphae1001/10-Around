import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, LifeBuoy, Mail, Bug, Flag, UserX, HelpCircle } from "lucide-react";
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

const FAQ: { q: string; a: string }[] = [
  {
    q: "I'm not receiving notifications",
    a: "Push delivery is not live yet — Settings → Notifications explains that preferences are saved locally for a future update. When push ships, also allow system notifications for MinyanNow on your device.",
  },
  {
    q: "Nearby minyanim aren't showing",
    a: 'MinyanNow needs your location to show minyanim near you. Open Settings → Location and allow access "While Using" the app.',
  },
  {
    q: "How do I change the language?",
    a: "Open Settings → Language and pick from the 14 supported languages. The change is instant.",
  },
  {
    q: "How do I create a minyan?",
    a: "Tap the gold + button in the bottom nav, choose a prayer, set the location and time, and tap Create. Other users nearby will see it immediately.",
  },
  {
    q: "Can I cancel a minyan I created?",
    a: "Yes. Open the minyan, tap Cancel. Scheduled minyanim cannot be canceled less than 20 minutes before their start time to protect joiners.",
  },
  { q: "Is MinyanNow free?", a: "Yes. MinyanNow is free to use." },
];

function Support() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-2xl gold-gradient text-gold-foreground flex items-center justify-center">
            <LifeBuoy className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-3xl tracking-tight">Support</h1>
            <p className="text-xs text-muted-foreground">We're here to help.</p>
          </div>
        </div>

        <Card icon={Mail} title="Contact us">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Email{" "}
            <a className="underline text-foreground" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>{" "}
            and we'll get back to you as soon as we can. Please include your device, app version,
            and a short description of what happened.
          </p>
        </Card>

        <Card icon={HelpCircle} title="Frequently asked questions">
          <div className="space-y-4">
            {FAQ.map((f) => (
              <div key={f.q}>
                <div className="text-sm font-semibold">{f.q}</div>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card icon={Bug} title="Report a bug">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Found something broken? Email{" "}
            <a
              className="underline text-foreground"
              href={`mailto:${SUPPORT_EMAIL}?subject=Bug%20report`}
            >
              {SUPPORT_EMAIL}
            </a>{" "}
            with:
          </p>
          <ul className="mt-2 text-sm text-muted-foreground list-disc pl-5 space-y-1">
            <li>What you were trying to do</li>
            <li>What happened instead</li>
            <li>Device + OS version (e.g. iPhone 15, iOS 17.4)</li>
            <li>App version (Settings → About)</li>
            <li>A screenshot if you have one</li>
          </ul>
        </Card>

        <Card icon={Flag} title="Report inappropriate content">
          <p className="text-sm text-muted-foreground leading-relaxed">
            MinyanNow has zero tolerance for harassment, hate speech, fake minyanim, or content that
            targets other users. In a chat, tap the flag on a message to report it in-app. You can
            also email{" "}
            <a
              className="underline text-foreground"
              href={`mailto:${SUPPORT_EMAIL}?subject=Content%20report`}
            >
              {SUPPORT_EMAIL}
            </a>
            . Reports are reviewed within 24 hours and we take action against accounts that violate
            our{" "}
            <Link to="/terms" className="underline text-foreground">
              terms
            </Link>
            .
          </p>
        </Card>

        <Card icon={UserX} title="Account assistance & deletion">
          <p className="text-sm text-muted-foreground leading-relaxed">
            You can delete your account at any time from{" "}
            <Link to="/settings" className="underline text-foreground">
              Settings → Delete Account
            </Link>
            . Deletion is permanent and removes your profile, presence data, push tokens,
            participation history, and chat membership. If you cannot delete from the app, email{" "}
            <a
              className="underline text-foreground"
              href={`mailto:${SUPPORT_EMAIL}?subject=Account%20deletion`}
            >
              {SUPPORT_EMAIL}
            </a>{" "}
            and we will process the deletion manually.
          </p>
        </Card>

        <div className="mt-10 flex justify-center gap-4 text-xs text-muted-foreground">
          <Link to="/privacy" className="underline">
            Privacy
          </Link>
          <Link to="/terms" className="underline">
            Terms
          </Link>
        </div>
      </div>
    </div>
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
    <section className="rounded-2xl border border-border bg-surface p-5 mb-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-lg mb-2">{title}</h2>
          {children}
        </div>
      </div>
    </section>
  );
}
