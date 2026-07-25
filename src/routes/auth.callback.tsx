import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { takePendingTermsAcceptedAt } from "@/lib/pending-terms";

/**
 * Web OAuth callback (Apple/Google via supabase.auth.signInWithOAuth).
 * The native app doesn't use this route — it catches the OAuth redirect via
 * a `minyannow://auth-callback` deep link instead (see lib/native-auth.ts).
 */
export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState<string>("Finalizing sign-in…");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (typeof window === "undefined") return;

      const url = new URL(window.location.href);
      const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
      const params = new URLSearchParams(hash || url.search.slice(1));
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      const code = url.searchParams.get("code");

      try {
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
        } else if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        }
      } catch (err) {
        console.error("[auth/callback] session restore failed:", err);
      }

      if (cancelled) return;

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const acceptedAt = takePendingTermsAcceptedAt();
        if (acceptedAt) {
          const { error: upErr } = await supabase
            .from("profiles")
            .update({ terms_accepted_at: acceptedAt })
            .eq("id", data.session.user.id);
          if (upErr) console.warn("profile update failed", upErr);
        }
        navigate({ to: "/home", replace: true });
      } else {
        setMessage("Sign-in did not complete. Returning…");
        setTimeout(() => navigate({ to: "/auth", replace: true }), 1200);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="min-h-dvh w-full flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p>{message}</p>
      </div>
    </div>
  );
}
