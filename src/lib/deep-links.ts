import { isNative } from "@/lib/native-auth";

type Navigator = {
  navigate: (opts: { to: string; search?: Record<string, unknown> }) => void;
};

/**
 * Routes an incoming universal/app link (https://.../minyan/{id}, .../travel-city/{key})
 * tapped while the app is already running to the matching in-app screen,
 * instead of leaving the app on whatever screen it happened to be on.
 * Cold-start opens (app not yet running) are handled by the OS launching
 * straight into this same listener once Capacitor finishes bootstrapping.
 *
 * The `minyannow://auth-callback` scheme is deliberately ignored here — it's
 * consumed by its own short-lived listener in native-auth.ts during the
 * OAuth flow, torn down as soon as sign-in resolves.
 */
export function initDeepLinkHandler(router: Navigator): () => void {
  if (!isNative()) return () => {};

  let handle: { remove: () => void } | null = null;
  let cancelled = false;

  void import("@capacitor/app").then(({ App }) => {
    if (cancelled) return;
    void App.addListener("appUrlOpen", ({ url }) => {
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        return;
      }
      if (parsed.protocol === "minyannow:") return; // handled by native-auth.ts

      const minyanMatch = parsed.pathname.match(/^\/minyan\/([^/]+)/);
      if (minyanMatch) {
        router.navigate({ to: "/minyan", search: { id: minyanMatch[1] } });
        return;
      }
      const travelMatch = parsed.pathname.match(/^\/travel-city\/([^/]+)/);
      if (travelMatch) {
        router.navigate({ to: `/travel-city/${travelMatch[1]}` });
      }
    }).then((h) => {
      if (cancelled) h.remove();
      else handle = h;
    });
  });

  return () => {
    cancelled = true;
    handle?.remove();
  };
}
