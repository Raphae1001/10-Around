import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Logo, Wordmark } from "@/components/Logo";
import { Apple, Loader2, Mail } from "lucide-react";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  component: Auth,
});

function Auth() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const [mode, setMode] = useState<"choose" | "email">("choose");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupMode, setSignupMode] = useState(false);

  // Already signed in? Go home.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/home" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) navigate({ to: "/home" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function oauth(provider: "google" | "apple") {
    setBusy(provider);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin + "/home",
      });
      if (result.error) {
        toast.error("Sign-in failed", { description: (result.error as Error).message });
        setBusy(null);
        return;
      }
      // If redirected, browser is leaving. Otherwise session is set.
      if (!result.redirected) navigate({ to: "/home" });
    } catch (e) {
      toast.error("Sign-in failed", { description: (e as Error).message });
      setBusy(null);
    }
  }

  async function emailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy("email");
    try {
      if (signupMode) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/home` },
        });
        if (error) throw error;
        toast.success("Check your inbox to confirm your email.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/home" });
      }
    } catch (err) {
      toast.error("Auth failed", { description: (err as Error).message });
    } finally {
      setBusy(null);
    }
  }

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
          {mode === "choose" ? (
            <>
              <button
                onClick={() => oauth("apple")}
                disabled={!!busy}
                className="flex items-center justify-center gap-3 w-full bg-foreground text-background font-semibold py-4 rounded-2xl shadow-lift disabled:opacity-60"
              >
                {busy === "apple" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Apple className="h-5 w-5" />}
                Continue with Apple
              </button>
              <button
                onClick={() => oauth("google")}
                disabled={!!busy}
                className="flex items-center justify-center gap-3 w-full bg-surface border border-border font-semibold py-4 rounded-2xl shadow-soft disabled:opacity-60"
              >
                {busy === "google" ? <Loader2 className="h-5 w-5 animate-spin" /> : <GoogleIcon />}
                Continue with Google
              </button>
              <button
                onClick={() => setMode("email")}
                className="flex items-center justify-center gap-3 w-full bg-surface border border-border font-semibold py-4 rounded-2xl shadow-soft"
              >
                <Mail className="h-5 w-5" /> Continue with email
              </button>
            </>
          ) : (
            <form onSubmit={emailSubmit} className="space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full rounded-2xl border border-border bg-surface p-4 text-sm outline-none focus:border-gold"
              />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min 6 chars)"
                className="w-full rounded-2xl border border-border bg-surface p-4 text-sm outline-none focus:border-gold"
              />
              <button
                type="submit"
                disabled={!!busy}
                className="w-full bg-foreground text-background font-semibold py-4 rounded-2xl shadow-lift disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {busy === "email" && <Loader2 className="h-4 w-4 animate-spin" />}
                {signupMode ? "Create account" : "Sign in"}
              </button>
              <div className="flex justify-between text-xs text-muted-foreground pt-1">
                <button type="button" onClick={() => setMode("choose")}>← Back</button>
                <button type="button" onClick={() => setSignupMode((s) => !s)} className="underline">
                  {signupMode ? "I already have an account" : "Create an account"}
                </button>
              </div>
            </form>
          )}

          <p className="text-[11px] text-muted-foreground text-center pt-4 leading-relaxed">
            By continuing you agree to our Terms & Privacy.
            <br />
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
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.6 14.6 2.6 12 2.6 6.8 2.6 2.6 6.8 2.6 12s4.2 9.4 9.4 9.4c5.4 0 9-3.8 9-9.1 0-.6-.1-1.1-.2-1.6H12z"
      />
    </svg>
  );
}
