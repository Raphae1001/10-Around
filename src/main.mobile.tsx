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
import {
  hydrateNativeSupabaseStorage,
  attachNativeStorageMirror,
} from "./lib/native-storage";

async function bootstrap() {
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
