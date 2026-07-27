/**
 * Native bridge: GPS, push notifications, calendar (.ics), share.
 * Falls back to web APIs when not running inside Capacitor.
 */
import { Capacitor } from "@capacitor/core";

export const isNative = () => Capacitor.isNativePlatform();

// ---------- Geolocation ----------
export type LocationPermissionState = "granted" | "denied" | "prompt";

/** Read permission state without triggering a system prompt. */
export async function checkLocationPermission(): Promise<LocationPermissionState> {
  if (isNative()) {
    const { Geolocation } = await import("@capacitor/geolocation");
    const perm = await Geolocation.checkPermissions();
    if (perm.location === "granted") return "granted";
    if (perm.location === "denied") return "denied";
    return "prompt";
  }
  if (typeof navigator === "undefined" || !navigator.permissions?.query) return "prompt";
  try {
    const result = await navigator.permissions.query({ name: "geolocation" });
    return result.state as LocationPermissionState;
  } catch {
    return "prompt";
  }
}

/** Trigger the OS/browser permission prompt. Call only after user consent in-app. */
export async function requestLocationPermission(): Promise<boolean> {
  if (isNative()) {
    const { Geolocation } = await import("@capacitor/geolocation");
    const req = await Geolocation.requestPermissions();
    return req.location === "granted";
  }
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(false);
    navigator.geolocation.getCurrentPosition(
      () => resolve(true),
      () => resolve(false),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: Infinity },
    );
  });
}

/** Open the OS settings page for this app (needed when location was permanently denied). */
export async function openAppSettings(): Promise<void> {
  if (!isNative()) return;
  // @capacitor/app dropped openUrl (Capacitor 8), and @capacitor/browser's Browser.open
  // only accepts http(s) — it rejects custom schemes outright. WKWebView itself still
  // hands an unrecognized scheme like this to the OS on a plain window.open, which is
  // exactly what's needed for a settings deep link (no plugin call involved).
  // iOS: app-settings: opens this app's Settings pane.
  // Android: same URL is handled by Capacitor as APPLICATION_DETAILS_SETTINGS on recent runtimes.
  window.open("app-settings:", "_system");
}

export async function getCurrentPosition(opts?: { highAccuracy?: boolean }): Promise<{
  lat: number;
  lng: number;
  accuracy?: number;
} | null> {
  // Default = fast coarse fix. High-accuracy GPS can take several seconds to
  // acquire a first lock; for "minyanim near me" (≥200m / ~1km blur) a coarse
  // fix is plenty and lets the map paint pins/halos almost instantly. Callers
  // that need precision (e.g. dropping an exact create pin) pass highAccuracy.
  const highAccuracy = opts?.highAccuracy ?? false;
  if (isNative()) {
    const { Geolocation } = await import("@capacitor/geolocation");
    const perm = await Geolocation.checkPermissions();
    if (perm.location !== "granted") {
      const req = await Geolocation.requestPermissions();
      if (req.location !== "granted") return null;
    }
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: highAccuracy,
      timeout: highAccuracy ? 10000 : 6000,
      maximumAge: 60000,
    });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
  }
  // Web fallback
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: highAccuracy, timeout: highAccuracy ? 10000 : 6000, maximumAge: 60000 },
    );
  });
}

// ---------- Push notifications ----------
export async function registerPushNotifications(onToken: (token: string) => void) {
  if (!isNative()) {
    // Web push fallback: ask for browser notification permission
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      await Notification.requestPermission();
    }
    return;
  }
  const { PushNotifications } = await import("@capacitor/push-notifications");
  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== "granted") return;
  await PushNotifications.register();
  PushNotifications.addListener("registration", (token) => onToken(token.value));
}

// ---------- Add to Calendar (universal .ics) ----------
export function downloadIcs(opts: {
  title: string;
  description?: string;
  location?: string;
  start: Date;
  durationMinutes?: number;
}) {
  const dur = opts.durationMinutes ?? 60;
  const end = new Date(opts.start.getTime() + dur * 60 * 1000);
  const fmt = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//10 Around//EN",
    "BEGIN:VEVENT",
    `UID:${Date.now()}@minyannow`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(opts.start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${opts.title}`,
    opts.description ? `DESCRIPTION:${opts.description.replace(/\n/g, "\\n")}` : "",
    opts.location ? `LOCATION:${opts.location}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${opts.title.replace(/[^a-z0-9]+/gi, "-")}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- Share ----------
export async function nativeShare(opts: { title?: string; text?: string; url?: string }) {
  if (isNative()) {
    const { Share } = await import("@capacitor/share");
    await Share.share(opts);
    return;
  }
  if (
    typeof navigator !== "undefined" &&
    (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }).share
  ) {
    await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share(opts);
  }
}
