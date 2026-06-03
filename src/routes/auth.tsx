import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo, Wordmark } from "@/components/Logo";
import { Phone, Apple } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: Auth,
});

function Auth() {
  return (
    <div className="min-h-screen w-full bg-muted/40 flex items-stretch justify-center">
      <div className="relative w-full max-w-[440px] min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <Logo size={56} />
          <h1 className="mt-6 font-display text-3xl">
            Welcome to <Wordmark />
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-xs">
            Sign in to join your community's live minyan network.
          </p>
        </div>

        <div className="px-6 pb-10 space-y-3">
          <Link to="/home" className="flex items-center justify-center gap-3 w-full bg-foreground text-background font-semibold py-4 rounded-2xl shadow-lift">
            <Apple className="h-5 w-5" /> Continue with Apple
          </Link>
          <Link to="/home" className="flex items-center justify-center gap-3 w-full bg-surface border border-border font-semibold py-4 rounded-2xl shadow-soft">
            <GoogleIcon /> Continue with Google
          </Link>
          <Link to="/home" className="flex items-center justify-center gap-3 w-full bg-surface border border-border font-semibold py-4 rounded-2xl shadow-soft">
            <Phone className="h-5 w-5" /> Continue with phone
          </Link>
          <p className="text-[11px] text-muted-foreground text-center pt-4 leading-relaxed">
            By continuing you agree to our Terms & Privacy.<br />
            We only share location when you choose to.
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.6 14.6 2.6 12 2.6 6.8 2.6 2.6 6.8 2.6 12s4.2 9.4 9.4 9.4c5.4 0 9-3.8 9-9.1 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}
