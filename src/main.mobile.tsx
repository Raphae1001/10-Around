// Capacitor / SPA bootstrap entry. Used by `vite.mobile.config.ts` to
// produce a static `dist-mobile/index.html` that Capacitor loads from disk.
// The SSR/Nitro build (vite.config.ts → dist/) is unchanged and still powers
// the hosted web deployment.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";

import "./styles.css";
import "./i18n";
import { getRouter } from "./router";
import { hydrateNativeSupabaseStorage, attachNativeStorageMirror } from "./lib/native-storage";

/**
 * Warm the TLS/DNS handshake to Supabase as early as possible (the URL is only
 * known at runtime via env, so it can't live in the static HTML). Fire-and-forget.
 */
function preconnectSupabase() {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!url || typeof document === "undefined") return;
  try {
    const origin = new URL(url).origin;
    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = origin;
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
  } catch {
    /* ignore malformed URL */
  }
}

async function bootstrap() {
  preconnectSupabase();

  // Native iPhone shell: lock page to the viewport (no pinch / pan of the whole app).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cap = typeof window !== "undefined" ? (window as any).Capacitor : null;
  if (cap?.isNativePlatform?.() === true) {
    document.documentElement.classList.add("capacitor-native");
    document.documentElement.addEventListener(
      "gesturestart",
      (e) => e.preventDefault(),
      { passive: false },
    );
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "viewport");
      document.head.appendChild(meta);
    }
    meta.setAttribute(
      "content",
      "width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover",
    );
  }

  // CRITICAL: hydrate Preferences → localStorage BEFORE the Supabase client
  // is constructed (it reads its initial session synchronously from
  // localStorage on first use). Otherwise an anonymous user whose
  // localStorage was evicted by the OS would silently lose their account.
  await hydrateNativeSupabaseStorage();

  const router = getRouter();

  const container = document.getElementById("root");
  if (!container) throw new Error("#root not found");

  createRoot(container).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );

  // Attach the localStorage → Preferences mirror after the client is
  // available. Fire-and-forget: never block first paint on this.
  void attachNativeStorageMirror();
}

void bootstrap();
