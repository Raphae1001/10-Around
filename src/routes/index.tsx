import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Logo, Wordmark } from "@/components/Logo";
import { useEffect, useState } from "react";
import { MapPin, ArrowRight } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { BRAND_BLUE, BRAND_TEXT, BRAND_TEXT_SOFT, BRAND_HALO, BRAND_SHADOW } from "@/lib/brand";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "10 Around — Start a minyan, anywhere, right now" },
      {
        name: "description",
        content:
          "Create or join a minyan in the street, at the airport, anywhere in the world — in seconds.",
      },
    ],
  }),
  component: Splash,
});

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
          className="absolute -top-32 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full blur-3xl"
          style={{ backgroundColor: BRAND_HALO }}
        />
        <svg className="absolute inset-0 w-full h-full opacity-[0.05]" viewBox="0 0 400 800">
          {Array.from({ length: 90 }).map((_, i) => {
            const x = (i * 53) % 400;
            const y = (i * 97) % 800;
            return <circle key={i} cx={x} cy={y} r={1} fill={BRAND_BLUE} />;
          })}
        </svg>

        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center relative">
          <div
            className={`transition-all duration-700 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}
          >
            <Logo size={72} />
            <h1 className="mt-8 text-5xl tracking-tight">
              <Wordmark style={{ color: BRAND_TEXT, fontWeight: 700 }} />
            </h1>
            <p className="mt-4 text-base max-w-xs mx-auto leading-snug" style={{ color: BRAND_TEXT }}>
              <Trans
                i18nKey="splash.tagline"
                components={{ gold: <span style={{ color: BRAND_BLUE }} /> }}
              />
            </p>
            <p className="mt-1 text-xs max-w-xs mx-auto" style={{ color: BRAND_TEXT_SOFT }}>
              {t("splash.places")}
            </p>
          </div>

          <div className="absolute bottom-32 left-0 right-0 flex justify-center">
            <div
              className="flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase"
              style={{ color: BRAND_BLUE }}
            >
              <MapPin className="h-3 w-3" />
              {t("splash.mission")}
            </div>
          </div>
        </div>

        <div className="px-6 pb-10 space-y-3 relative">
          <Link
            to="/onboarding"
            className="flex items-center justify-center gap-2 w-full h-14 text-white font-semibold rounded-2xl"
            style={{ backgroundColor: BRAND_BLUE, boxShadow: BRAND_SHADOW }}
          >
            {t("splash.begin")}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/auth" className="block text-center text-sm py-2" style={{ color: BRAND_TEXT_SOFT }}>
            {t("splash.haveAccount")}
          </Link>
        </div>
      </div>
    </div>
  );
}
