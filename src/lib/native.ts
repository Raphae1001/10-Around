/**
 * Native bridge: GPS, push notifications, calendar (.ics), share.
 * Falls back to web APIs when not running inside Capacitor.
 */
import { Capacitor } from "@capacitor/core";

export const isNative = () => Capacitor.isNativePlatform();

// ---------- Geolocation ----------
export async function getCurrentPosition(): Promise<{ lat: number; lng: number; accuracy?: number } | null> {
  if (isNative()) {
    const { Geolocation } = await import("@capacitor/geolocation");
    const perm = await Geolocation.checkPermissions();
    if (perm.location !== "granted") {
      const req = await Geolocation.requestPermissions();
      if (req.location !== "granted") return null;
    }
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
  }
  // Web fallback
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
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
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MinyanNow//EN",
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
  ].filter(Boolean).join("\r\n");

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
  if (typeof navigator !== "undefined" && (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }).share) {
    await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share(opts);
  }
}
