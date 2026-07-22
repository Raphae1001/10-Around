import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Logo, Wordmark } from "@/components/Logo";
import { MapPin, Users, Sunrise, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Welcome to MinyanNow — Start a Minyan Anywhere" },
      {
        name: "description",
        content:
          "Find or start a minyan in seconds — in the street, at the airport, in a hotel, anywhere in the world. 10 Jews, 1 tap.",
      },
      { property: "og:title", content: "MinyanNow — A minyan, anywhere, in seconds" },
      {
        property: "og:description",
        content: "Join the global network of Jews who never miss a minyan, wherever they are.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Onboarding,
});

const TOTAL_STEPS = 3;

function Onboarding() {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  const next = () => {
    if (step < TOTAL_STEPS) setStep(step + 1);
    else navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-dvh w-full bg-muted/40 flex items-stretch justify-center">
      <div className="relative w-full max-w-[440px] min-h-dvh navy-gradient text-white overflow-hidden flex flex-col">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gold/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-sky/10 blur-3xl pointer-events-none" />
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.08] pointer-events-none"
          viewBox="0 0 400 800"
        >
          {Array.from({ length: 120 }).map((_, i) => {
            const x = (i * 53) % 400;
            const y = (i * 97) % 800;
            return <circle key={i} cx={x} cy={y} r={1} fill="white" />;
          })}
        </svg>

        <div className="relative flex justify-between items-center px-6 pt-6">
          <div className="flex gap-1.5">
            {step > 0 &&
              Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === step - 1 ? "w-6 bg-gold" : "w-1.5 bg-white/25"
                  }`}
                />
              ))}
          </div>
          <Link to="/auth" className="text-xs text-white/60">
            {t("common.skip")}
          </Link>
        </div>

        <div className="relative flex-1 flex flex-col">
          {step === 0 && <HeroSlide />}
          {step === 1 && (
            <ContentSlide
              icon={<MapPin className="h-8 w-8" />}
              iconClass="gold-gradient text-gold-foreground"
              kicker={t("onboarding.step1Kicker")}
              title={t("onboarding.step1Title")}
              subtitle={t("onboarding.step1Subtitle")}
              body={t("onboarding.step1Body")}
              tags={t("onboarding.step1Tags")}
            />
          )}
          {step === 2 && (
            <ContentSlide
              icon={<Users className="h-8 w-8" />}
              iconClass="bg-urgent text-white"
              kicker={t("onboarding.step2Kicker")}
              title={t("onboarding.step2Title")}
              subtitle={t("onboarding.step2Subtitle")}
              body={t("onboarding.step2Body")}
              tags={t("onboarding.step2Tags")}
            />
          )}
          {step === 3 && (
            <ContentSlide
              icon={<Sunrise className="h-8 w-8" />}
              iconClass="bg-sky text-white"
              kicker={t("onboarding.step3Kicker")}
              title={t("onboarding.step3Title")}
              subtitle={t("onboarding.step3Subtitle")}
              body={t("onboarding.step3Body")}
              tags={t("onboarding.step3Tags")}
            />
          )}
        </div>

        <div className="relative px-6 pb-10 space-y-3">
          <button
            onClick={next}
            className="w-full flex items-center justify-center gap-2 gold-gradient text-gold-foreground font-semibold py-4 rounded-2xl shadow-glow-gold"
          >
            {step === 0
              ? t("onboarding.begin")
              : step === TOTAL_STEPS
                ? t("onboarding.join")
                : t("common.continue")}

            <ArrowRight className="h-4 w-4" />
          </button>
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="block w-full text-center text-white/50 text-sm py-1"
            >
              {t("common.back")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function HeroSlide() {
  const { t } = useTranslation();
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
      <div className="float-slow">
        <Logo size={64} glow />
      </div>
      <p className="mt-6 text-[11px] tracking-[0.3em] uppercase text-gold/80">
        {t("onboarding.welcome")}
      </p>
      <h2 className="mt-2 font-semibold text-4xl tracking-tight leading-tight">
        <Wordmark className="text-white" />
      </h2>
      <p className="mt-4 text-base text-white/75 max-w-xs leading-relaxed">
        {t("onboarding.tagline")}
      </p>
      <p className="mt-2 text-sm text-white/60 max-w-xs mx-auto leading-relaxed">
        {t("onboarding.heroBody")}
      </p>
      <p className="mt-4 text-[11px] tracking-[0.15em] uppercase text-gold/70">
        {t("onboarding.places")}
      </p>
    </div>
  );
}

function ContentSlide({
  icon,
  iconClass,
  kicker,
  title,
  subtitle,
  body,
  tags,
}: {
  icon: React.ReactNode;
  iconClass: string;
  kicker: string;
  title: string;
  subtitle: string;
  body: string;
  tags: string;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
      <div
        className={`h-16 w-16 rounded-2xl flex items-center justify-center shadow-glow-gold ${iconClass}`}
      >
        {icon}
      </div>
      <p className="mt-6 text-[11px] tracking-[0.3em] uppercase text-gold/80">{kicker}</p>
      <h2 className="mt-2 font-semibold text-4xl tracking-tight leading-tight">{title}</h2>
      <p className="mt-4 text-lg font-medium text-white/90 max-w-xs leading-snug">{subtitle}</p>
      <p className="mt-2 text-sm text-white/60 max-w-xs leading-relaxed">{body}</p>
      <p className="mt-6 text-[11px] tracking-[0.05em] text-gold/70 max-w-xs">{tags}</p>
    </div>
  );
}
