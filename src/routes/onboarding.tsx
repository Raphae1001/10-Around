import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BRAND_BLUE, BRAND_TEXT, BRAND_TEXT_SOFT, BRAND_HALO, BRAND_SHADOW } from "@/lib/brand";
import { MapPin, Users, Sunrise, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Welcome to 10 Around — Start a Minyan Anywhere" },
      {
        name: "description",
        content:
          "Find or start a minyan in seconds — in the street, at the airport, in a hotel, anywhere in the world. 10 Jews, 1 tap.",
      },
      { property: "og:title", content: "10 Around — A minyan, anywhere, in seconds" },
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
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  const next = () => {
    if (step < TOTAL_STEPS) setStep(step + 1);
    else navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-dvh w-full bg-white flex items-stretch justify-center">
      <div className="relative w-full max-w-[440px] min-h-dvh bg-white overflow-hidden flex flex-col">
        {/* Barely-there halo + dot field — a detail you notice after, not before. */}
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full blur-3xl pointer-events-none"
          style={{ backgroundColor: BRAND_HALO }}
        />
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.05] pointer-events-none"
          viewBox="0 0 400 800"
        >
          {Array.from({ length: 90 }).map((_, i) => {
            const x = (i * 53) % 400;
            const y = (i * 97) % 800;
            return <circle key={i} cx={x} cy={y} r={1} fill={BRAND_BLUE} />;
          })}
        </svg>

        <div className="relative flex justify-between items-center px-6 pt-6">
          <div className="flex gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <span
                key={i}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: i === step - 1 ? 24 : 6,
                  backgroundColor: i === step - 1 ? BRAND_BLUE : "#e4e6ea",
                }}
              />
            ))}
          </div>
          <Link to="/auth" className="text-xs" style={{ color: BRAND_TEXT_SOFT }}>
            {t("common.skip")}
          </Link>
        </div>

        <div className="relative flex-1 flex flex-col">
          {step === 1 && (
            <ContentSlide
              icon={<MapPin className="h-8 w-8" />}
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
            className="w-full h-14 flex items-center justify-center gap-2 text-white font-semibold rounded-2xl"
            style={{ backgroundColor: BRAND_BLUE, boxShadow: BRAND_SHADOW }}
          >
            {step === TOTAL_STEPS ? t("onboarding.join") : t("common.continue")}
            <ArrowRight className="h-4 w-4" />
          </button>
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="block w-full text-center text-sm py-1"
              style={{ color: BRAND_TEXT_SOFT }}
            >
              {t("common.back")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ContentSlide({
  icon,
  kicker,
  title,
  subtitle,
  body,
  tags,
}: {
  icon: React.ReactNode;
  kicker: string;
  title: string;
  subtitle: string;
  body: string;
  tags: string;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
      <div
        className="h-16 w-16 rounded-2xl flex items-center justify-center text-white"
        style={{ backgroundColor: BRAND_BLUE, boxShadow: BRAND_SHADOW }}
      >
        {icon}
      </div>
      <p className="mt-6 text-[11px] tracking-[0.3em] uppercase" style={{ color: BRAND_BLUE }}>
        {kicker}
      </p>
      <h2
        className="mt-2 font-bold text-4xl tracking-tight leading-tight"
        style={{ color: BRAND_TEXT }}
      >
        {title}
      </h2>
      <p className="mt-4 text-lg font-medium max-w-xs leading-snug" style={{ color: BRAND_TEXT }}>
        {subtitle}
      </p>
      <p className="mt-2 text-sm max-w-xs leading-relaxed" style={{ color: BRAND_TEXT_SOFT }}>
        {body}
      </p>
      <p className="mt-6 text-[11px] tracking-[0.05em] max-w-xs" style={{ color: BRAND_BLUE }}>
        {tags}
      </p>
    </div>
  );
}
