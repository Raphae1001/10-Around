import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Logo, Wordmark } from "@/components/Logo";
import { MapPin, Zap, Users, Plane, Globe2 } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
});

const steps = [
  {
    icon: MapPin,
    title: "Find a minyan in seconds",
    body: "See live minyanim near you anywhere in the world.",
    tone: "sky" as const,
  },
  {
    icon: Zap,
    title: "Create one in under 10 seconds",
    body: "Pick a prayer, drop a pin. Nearby Jews are notified instantly.",
    tone: "gold" as const,
  },
  {
    icon: Users,
    title: "Help complete a minyan nearby",
    body: "When one person is missing, your presence completes the prayer.",
    tone: "urgent" as const,
  },
  {
    icon: Plane,
    title: "Travel without worry",
    body: "Airports, hotels, conferences — there's almost always a minyan.",
    tone: "sky" as const,
  },
  {
    icon: Globe2,
    title: "One global community",
    body: "Real-time coordination across every Jewish community.",
    tone: "gold" as const,
  },
];

function Onboarding() {
  const [i, setI] = useState(0);
  const step = steps[i];
  const Icon = step.icon;
  const last = i === steps.length - 1;

  return (
    <div className="min-h-screen w-full bg-muted/40 flex items-stretch justify-center">
      <div className="relative w-full max-w-[440px] min-h-screen bg-background flex flex-col">
        <div className="flex items-center justify-between px-6 pt-6">
          <Wordmark className="text-base" />
          <Link to="/auth" className="text-xs text-muted-foreground">Skip</Link>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="relative mb-10">
            <div className={`absolute inset-0 blur-3xl opacity-50 rounded-full ${step.tone === "gold" ? "bg-gold/40" : step.tone === "urgent" ? "bg-urgent/30" : "bg-sky/40"}`} />
            <div className={`relative h-32 w-32 rounded-3xl flex items-center justify-center shadow-lift ${step.tone === "gold" ? "gold-gradient" : step.tone === "urgent" ? "bg-urgent/10" : "sky-gradient"}`}>
              <Icon className={`h-14 w-14 ${step.tone === "gold" ? "text-navy" : step.tone === "urgent" ? "text-urgent" : "text-navy"}`} strokeWidth={1.6} />
            </div>
            {step.tone !== "gold" && (
              <span className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-gold live-dot" />
            )}
          </div>

          <h2 className="font-display text-3xl leading-tight max-w-xs">{step.title}</h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-xs">{step.body}</p>
        </div>

        <div className="px-6 pb-10">
          <div className="flex items-center justify-center gap-1.5 mb-6">
            {steps.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all ${idx === i ? "w-8 bg-gold" : "w-1.5 bg-border"}`}
              />
            ))}
          </div>
          {last ? (
            <Link
              to="/auth"
              className="block w-full text-center bg-foreground text-background font-semibold py-4 rounded-2xl shadow-lift"
            >
              Join the network
            </Link>
          ) : (
            <button
              onClick={() => setI((v) => v + 1)}
              className="w-full text-center bg-foreground text-background font-semibold py-4 rounded-2xl shadow-lift"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
