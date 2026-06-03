import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo, Wordmark } from "@/components/Logo";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MinyanLive — Real-Time Global Minyan Network" },
      { name: "description", content: "Find, join, or create a minyan anywhere in the world, in real time." },
    ],
  }),
  component: Splash,
});

function Splash() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 200);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="min-h-screen w-full bg-muted/40 flex items-stretch justify-center">
      <div className="relative w-full max-w-[440px] min-h-screen navy-gradient text-white overflow-hidden flex flex-col">
        {/* ambient orbs */}
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gold/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-sky/10 blur-3xl" />

        {/* world dots */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.08]" viewBox="0 0 400 800">
          {Array.from({ length: 120 }).map((_, i) => {
            const x = (i * 53) % 400;
            const y = (i * 97) % 800;
            return <circle key={i} cx={x} cy={y} r={1} fill="white" />;
          })}
        </svg>

        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center relative">
          <div className={`transition-all duration-700 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
            <div className="relative inline-block float-slow">
              <span className="absolute inset-0 rounded-2xl bg-gold/40 blur-xl" />
              <Logo size={72} glow />
            </div>
            <h1 className="mt-8 font-display text-5xl tracking-tight">
              <Wordmark />
            </h1>
            <p className="mt-3 text-sm text-white/70 max-w-xs mx-auto">
              Real-Time Global Minyan Network
            </p>
          </div>

          <div className="absolute bottom-32 left-0 right-0 flex justify-center">
            <div className="flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-white/40">
              <span className="h-2 w-2 rounded-full bg-gold live-dot" />
              Connecting communities
            </div>
          </div>
        </div>

        <div className="px-6 pb-10 space-y-3 relative">
          <Link
            to="/onboarding"
            className="block w-full text-center gold-gradient text-gold-foreground font-semibold py-4 rounded-2xl shadow-glow-gold"
          >
            Begin
          </Link>
          <Link to="/auth" className="block text-center text-white/60 text-sm py-2">
            I already have an account
          </Link>
        </div>
      </div>
    </div>
  );
}
