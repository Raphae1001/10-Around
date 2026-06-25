import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { NATIVE_REDIRECT } from "@/lib/native-auth";

/**
 * Public OAuth callback page.
 *
 * Three modes:
 *   1. ?native=1 (opened inside SFSafariViewController / Chrome Custom Tab):
 *      re-emit the URL as a minyannow:// deep link so iOS hands control back
 *      to the native shell, where App.addListener('appUrlOpen') restores the
 *      session.
 *   2. Universal link / direct browser navigation with session params:
 *      let Supabase parse the URL (detectSessionInUrl=true) and route home.
 *   3. No params: behave as a "you can close this tab" landing page.
 */
export const Route = createFileRoute("/auth/callback")({
  // SSR off — this page only runs after a provider redirect carrying tokens
  // in the URL fragment, which the server cannot see.
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
      const isNativeBridge = url.searchParams.get("native") === "1";

      // 1) Native bridge: forward fragment + query to the custom scheme.
      if (isNativeBridge) {
        const forwardParams = new URLSearchParams();
        url.searchParams.forEach((v, k) => {
          if (k !== "native") forwardParams.set(k, v);
        });
        const deepLink =
          NATIVE_REDIRECT +
          (forwardParams.toString() ? `?${forwardParams.toString()}` : "") +
          (hash ? `#${hash}` : "");
        setMessage("Returning to MinyanNow…");
        // location.replace so the browser history doesn't trap the user here.
        window.location.replace(deepLink);
        return;
      }

      // 2) Web flow: let Supabase consume the URL.
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
