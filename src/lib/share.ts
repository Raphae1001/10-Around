/** Share helpers: native share sheet first, WhatsApp deep-link fallback. */
import { nativeShare } from "@/lib/native";

const PUBLISHED_ORIGIN = "https://global-minyan-connect.lovable.app";

export function appOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return PUBLISHED_ORIGIN;
}

function isMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android|iphone|ipad|ipod/i.test(navigator.userAgent);
}

/** WhatsApp-specific share. Uses wa.me which is the most compatible URL.
 *  api.whatsapp.com is often blocked by ad-blockers/firewalls — wa.me is the recommended one. */
export function shareWhatsApp(text: string, url?: string) {
  const full = url ? `${text}\n${url}` : text;
  const wa = `https://wa.me/?text=${encodeURIComponent(full)}`;
  if (typeof window !== "undefined") window.open(wa, "_blank", "noopener,noreferrer");
}

/** Preferred share entry point: tries OS-native share sheet first (mobile),
 *  then web Share API (Chrome/Edge desktop), and only falls back to wa.me. */
export async function shareAny(opts: { title?: string; text: string; url?: string }) {
  // 1) Native (Capacitor) share — opens the OS share sheet on iOS/Android.
  try {
    await nativeShare(opts);
    return;
  } catch {
    /* fall through */
  }
  // 2) Web Share API — available on mobile browsers and modern desktop Chrome/Edge.
  if (
    typeof navigator !== "undefined" &&
    typeof (navigator as Navigator & { share?: (data: ShareData) => Promise<void> }).share === "function"
  ) {
    try {
      await (navigator as Navigator & { share: (data: ShareData) => Promise<void> }).share({
        title: opts.title,
        text: opts.text,
        url: opts.url,
      });
      return;
    } catch {
      /* user cancelled or unsupported — fall through */
    }
  }
  // 3) Last resort: WhatsApp deep-link.
  shareWhatsApp(opts.text, opts.url);
}
