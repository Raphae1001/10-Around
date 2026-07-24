import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Logo, Wordmark } from "@/components/Logo";
import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MinyanNow — Start a minyan, anywhere, right now" },
      {
        name: "description",
        content:
          "Create or join a minyan in the street, at the airport, anywhere in the world — in seconds.",
      },
    ],
  }),
  component: Splash,
});

// Fixed brand blue sampled from the logo mark (public/logo/logo-10.png) —
// this screen is a fixed-palette brand moment, not theme-adaptive.
const BRAND_BLUE = "#006dfe";

function Splash() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [checking, setChecking] = useState(true);

  // Skip the marketing splash entirely if the user already has a session
  // (typical for returning users after the first onboarding). Redirect runs
  // before paint so there's no visible flash.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) {
        navigate({ to: "/home", replace: true });
      } else {
        setChecking(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    if (checking) return;
    const tmr = setTimeout(() => setShow(true), 200);
    return () => clearTimeout(tmr);
  }, [checking]);

  if (checking) {
    return <div className="min-h-dvh w-full bg-white" />;
  }
  return (
    <div className="min-h-dvh w-full bg-white flex items-stretch justify-center">
      <div className="relative w-full max-w-[440px] min-h-dvh bg-white overflow-hidden flex flex-col">
        <div
          className="absolute -top-24 -left-24 h-72 w-72 rounded-full blur-3xl"
          style={{ backgroundColor: `${BRAND_BLUE}1f` }}
        />
        <div
          className="absolute -bottom-32 -right-20 h-80 w-80 rounded-full blur-3xl"
          style={{ backgroundColor: `${BRAND_BLUE}14` }}
        />

        <svg className="absolute inset-0 w-full h-full opacity-[0.05]" viewBox="0 0 400 800">
          {Array.from({ length: 120 }).map((_, i) => {
            const x = (i * 53) % 400;
            const y = (i * 97) % 800;
            return <circle key={i} cx={x} cy={y} r={1} fill={BRAND_BLUE} />;
          })}
        </svg>

        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center relative">
          <div
            className={`transition-all duration-700 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}
          >
            <div className="relative inline-block float-slow">
              <span
                className="absolute inset-0 rounded-2xl blur-xl"
                style={{ backgroundColor: `${BRAND_BLUE}40` }}
              />
              <Logo size={72} glow />
            </div>
            <h1 className="mt-8 font-semibold text-5xl tracking-tight">
              <Wordmark className="text-ink" />
            </h1>
            <p className="mt-4 text-base text-ink-soft max-w-xs mx-auto leading-snug">
              <Trans
                i18nKey="splash.tagline"
                components={{ gold: <span style={{ color: BRAND_BLUE }} /> }}
              />
            </p>
            <p className="mt-1 text-xs text-ink-soft/70 max-w-xs mx-auto">
              {t("splash.places")}
            </p>
          </div>

          <div className="absolute bottom-32 left-0 right-0 flex justify-center">
            <div
              className="flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase"
              style={{ color: `${BRAND_BLUE}99` }}
            >
              <MapPin className="h-3 w-3" style={{ color: BRAND_BLUE }} />
              {t("splash.mission")}
            </div>
          </div>
        </div>

        <div className="px-6 pb-10 space-y-3 relative">
          <Link
            to="/onboarding"
            className="block w-full text-center text-white font-semibold py-4 rounded-2xl shadow-lg"
            style={{ backgroundColor: BRAND_BLUE, boxShadow: `0 8px 24px -8px ${BRAND_BLUE}80` }}
          >
            {t("splash.begin")}
          </Link>
          <Link to="/auth" className="block text-center text-ink-soft/70 text-sm py-2">
            {t("splash.haveAccount")}
          </Link>
        </div>
      </div>
    </div>
  );
}
