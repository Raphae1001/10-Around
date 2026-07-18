/**
 * Cross-platform shell helpers.
 * - Web (SSR / browser): scrollable page, pinch-zoom allowed for a11y
 * - Capacitor iOS / Android: fixed viewport, no page pan/zoom (true app feel)
 */
import { Capacitor } from "@capacitor/core";

export type AppPlatform = "ios" | "android" | "web";

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

export function appPlatform(): AppPlatform {
  const p = Capacitor.getPlatform();
  if (p === "ios" || p === "android") return p;
  return "web";
}

/** Call once at native SPA boot (main.mobile.tsx). No-op on web SSR. */
export async function applyNativeShell(): Promise<void> {
  if (typeof document === "undefined" || !isNativeApp()) return;

  const platform = appPlatform();
  const root = document.documentElement;
  root.classList.add("capacitor-native", `platform-${platform}`);

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

  // Block iOS Safari gesture zoom inside WKWebView.
  root.addEventListener("gesturestart", (e) => e.preventDefault(), { passive: false });

  try {
    const { StatusBar } = await import("@capacitor/status-bar");
    // Content draws edge-to-edge; CSS env(safe-area-inset-*) pads chrome.
    await StatusBar.setOverlaysWebView({ overlay: true });
  } catch {
    /* plugin unavailable in some simulators */
  }
}
