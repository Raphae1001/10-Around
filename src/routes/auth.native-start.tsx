import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { lovable } from "@/integrations/lovable";

/**
 * Hosted bridge page used by the native Capacitor app to enter the
 * Lovable-managed OAuth broker (same path the web app uses).
 *
 * Why this exists:
 *   - Web sign-in goes through `lovable.auth.signInWithOAuth(...)`, which
 *     hits Lovable's broker (`/~oauth/initiate`). The broker holds the
 *     Google/Apple client secrets.
 *   - Calling `supabase.auth.signInWithOAuth(...)` directly from native
 *     bypasses the broker → Supabase returns `missing OAuth secret`.
 *
 * Flow:
 *   Capacitor app  →  Browser.open(/auth/native-start?provider=google)
 *   This page      →  lovable.auth.signInWithOAuth(provider, redirect_uri=/auth/callback?native=1)
 *   Broker         →  Google
 *   Google         →  Broker
 *   Broker         →  /auth/callback?native=1#access_token=…
 *   /auth/callback →  location.replace("minyannow://auth/callback#…")
 *   iOS/Android    →  appUrlOpen  →  supabase.auth.setSession(...)
 */
export const Route = createFileRoute("/auth/native-start")({
  ssr: false,
  component: NativeStart,
});

function NativeStart() {
  const [message, setMessage] = useState("Opening sign-in…");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const provider = (url.searchParams.get("provider") ?? "google") as
      | "google"
      | "apple";

    const redirect_uri = `${window.location.origin}/auth/callback?native=1`;

    (async () => {
      try {
        const result = await lovable.auth.signInWithOAuth(provider, {
          redirect_uri,
        });
        // Successful flow does a full-page redirect — we never reach here.
        if (result?.error) {
          console.error("[native-start] broker error:", result.error);
          setMessage(
            `Sign-in failed: ${
              (result.error as Error)?.message ?? "unknown error"
            }`,
          );
        }
      } catch (e) {
        console.error("[native-start] unexpected:", e);
        setMessage("Sign-in failed. You can close this window.");
      }
    })();
  }, []);

  return (
    <div className="min-h-dvh w-full flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p>{message}</p>
      </div>
    </div>
  );
}
