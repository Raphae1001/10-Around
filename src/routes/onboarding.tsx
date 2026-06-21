import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Logo, Wordmark } from "@/components/Logo";
import { MapPin, Zap, Users, Globe2, ChevronRight } from "lucide-react";

const DOMAIN = "https://global-minyan-connect.lovable.app";

const steps = [
  {
    icon: MapPin,
    title: "A minyan near you, in seconds.",
    body: "One tap shows every live minyan forming around you — street, café, airport, anywhere.",
    tone: "sky" as const,
  },
  {
    icon: Zap,
    title: "Missing one? Start it on the spot.",
    body: "Drop a pin where you stand. Nearby Jews are pinged instantly — a minyan from zero in under 10 seconds.",
    tone: "gold" as const,
  },
  {
    icon: Users,
    title: "Be the 10th. Complete the prayer.",
    body: "When a minyan is one person short, your presence is what makes it happen.",
    tone: "urgent" as const,
  },
  {
    icon: Globe2,
    title: "Wherever you go, you're never alone.",
    body: "Real-time Jewish coordination across every city, airport and hotel in the world.",
    tone: "gold" as const,
  },
];

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Welcome to MinyanStreet — Start a Minyan Anywhere" },
      {
        name: "description",
        content:
          "Discover how MinyanStreet connects you to live minyanim around the world. Street, airport, hotel — find or start a minyan in seconds.",
      },
      {
        property: "og:title",
        content: "Welcome to MinyanStreet — Start a Minyan Anywhere",
      },
      {
        property: "og:description",
        content:
          "Discover how MinyanStreet connects you to live minyanim around the world. Street, airport, hotel — find or start a minyan in seconds.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${DOMAIN}/onboarding` },
      { name: "twitter:card", content: "summary" },
      {
        name: "twitter:title",
        content: "Welcome to MinyanStreet",
      },
      {
        name: "twitter:description",
        content:
          "Find or start a minyan anywhere in the world — in under 10 seconds.",
      },
      { name: "robots", content: "index, follow" },
    ],
    links: [
      { rel: "canonical", href: `${DOMAIN}/onboarding` },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: "How to Start or Join a Minyan with MinyanStreet",
          description:
            "A step-by-step guide to finding live minyanim or starting your own minyan anywhere in the world.",
          step: [
            {
              "@type": "HowToStep",
              name: "Find a minyan near you",
              text: "Open the app and see every live minyan forming around you — street, café, airport, anywhere.",
            },
            {
              "@type": "HowToStep",
              name: "Start a minyan on the spot",
              text: "Drop a pin where you stand. Nearby Jews are pinged instantly — a minyan from zero in under 10 seconds.",
            },
            {
              "@type": "HowToStep",
              name: "Complete the prayer",
              text: "When a minyan is one person short, your presence is what makes it happen.",
            },
            {
              "@type": "HowToStep",
              name: "Stay connected everywhere",
              text: "Real-time Jewish coordination across every city, airport and hotel in the world.",
            },
          ],
        }),
      },
    ],
  }),
  component: Onboarding,
});

function HeroSlide({ onNext }: { onNext: () => void }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative w-full max-w-[440px] min-h-screen navy-gradient text-white overflow-hidden flex flex-col">
      {/* Animated background dots */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.08]" viewBox="0 0 400 800">
        {Array.from({ length: 120 }).map((_, i) => {
          const x = (i * 53) % 400;
          const y = (i * 97) % 800;
          return <circle key={i} cx={x} cy={y} r={1} fill="white" />;
        })}
      </svg>

      {/* Floating orbs */}
      <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gold/20 blur-3xl float-slow" />
      <div className="absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-sky/10 blur-3xl float-slow" style={{ animationDelay: "2s" }} />

      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center relative">
        {/* Live pulse rings around logo */}
        <div className={`transition-all duration-700 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <div className="relative inline-block mb-8">
            <span className="absolute inset-0 rounded-3xl bg-gold/30 blur-2xl animate-ping" style={{ animationDuration: "3s" }} />
            <span className="absolute -inset-4 rounded-3xl bg-gold/10 blur-xl animate-ping" style={{ animationDuration: "3s", animationDelay: "0.5s" }} />
            <div className="relative float-slow">
              <Logo size={88} glow />
            </div>
          </div>

          <h1 className="font-display text-4xl tracking-tight leading-tight">
            <Wordmark />
          </h1>
          <p className="mt-5 text-lg text-white/90 max-w-xs mx-auto leading-snug font-medium">
            Start a minyan{" "}
            <span className="text-gold">everywhere, every moment</span>.
          </p>
          <p className="mt-3 text-sm text-white/50 max-w-xs mx-auto leading-relaxed">
            Street · Airport · Hotel · Anywhere
          </p>

          <div className="mt-8 flex justify-center">
            <div className="flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-white/40">
              <MapPin className="h-3 w-3 text-gold" />
              10 Jews, 1 tap, anywhere
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 pb-10 space-y-3 relative z-10">
        <button
          onClick={onNext}
          className="block w-full text-center gold-gradient text-gold-foreground font-semibold py-4 rounded-2xl shadow-glow-gold flex items-center justify-center gap-2"
        >
          See how it works
          <ChevronRight className="h-4 w-4" />
        </button>
        <Link to="/auth" className="block text-center text-white/60 text-sm py-2">
          Skip intro
        </Link>
      </div>
    </div>
  );
}

function ContentSlide({
  step,
  i,
  onNext,
  onPrev,
}: {
  step: (typeof steps)[number];
  i: number;
  onNext: () => void;
  onPrev: () => void;
}) {
  const Icon = step.icon;
  const last = i === steps.length - 1;

  return (
    <div className="relative w-full max-w-[440px] min-h-screen bg-background flex flex-col">
      <div className="flex items-center justify-between px-6 pt-6">
        <Wordmark className="text-base" />
        <Link to="/auth" className="text-xs text-muted-foreground">
          Skip
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="relative mb-10">
          <div
            className={`absolute inset-0 blur-3xl opacity-50 rounded-full ${
              step.tone === "gold"
                ? "bg-gold/40"
                : step.tone === "urgent"
                ? "bg-urgent/30"
                : "bg-sky/40"
            }`}
          />
          <div
            className={`relative h-32 w-32 rounded-3xl flex items-center justify-center shadow-lift ${
              step.tone === "gold"
                ? "gold-gradient"
                : step.tone === "urgent"
                ? "bg-urgent/10"
                : "sky-gradient"
            }`}
          >
            <Icon
              className={`h-14 w-14 ${
                step.tone === "gold"
                  ? "text-navy"
                  : step.tone === "urgent"
                  ? "text-urgent"
                  : "text-navy"
              }`}
              strokeWidth={1.6}
            />
          </div>
          {step.tone !== "gold" && (
            <span className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-gold live-dot" />
          )}
        </div>

        <h2 className="font-display text-3xl leading-tight max-w-xs">
          {step.title}
        </h2>
        <p className="mt-3 text-sm text-muted-foreground max-w-xs">
          {step.body}
        </p>
      </div>

      <div className="px-6 pb-10">
        <div className="flex items-center justify-center gap-1.5 mb-6">
          {steps.map((_, idx) => (
            <span
              key={idx}
              className={`h-1.5 rounded-full transition-all ${
                idx === i ? "w-8 bg-gold" : "w-1.5 bg-border"
              }`}
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
            onClick={onNext}
            className="w-full text-center bg-foreground text-background font-semibold py-4 rounded-2xl shadow-lift"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}

function Onboarding() {
  const [i, setI] = useState(-1); // -1 = hero slide

  if (i === -1) {
    return (
      <div className="min-h-screen w-full bg-muted/40 flex items-stretch justify-center">
        <HeroSlide onNext={() => setI(0)} />
      </div>
    );
  }

  const step = steps[i];

  return (
    <div className="min-h-screen w-full bg-muted/40 flex items-stretch justify-center">
      <ContentSlide
        step={step}
        i={i}
        onNext={() => setI((v) => Math.min(v + 1, steps.length - 1))}
        onPrev={() => setI((v) => Math.max(v - 1, -1))}
      />
    </div>
  );
}
