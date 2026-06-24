/** Share helpers: WhatsApp deep-link + native fallback. */
import { nativeShare } from "@/lib/native";

const PUBLISHED_ORIGIN = "https://global-minyan-connect.lovable.app";

export function appOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return PUBLISHED_ORIGIN;
}

export function shareWhatsApp(text: string, url?: string) {
  const full = url ? `${text}\n${url}` : text;
  const wa = `https://wa.me/?text=${encodeURIComponent(full)}`;
  if (typeof window !== "undefined") window.open(wa, "_blank", "noopener,noreferrer");
}

export async function shareAny(opts: { title?: string; text: string; url?: string }) {
  try {
    await nativeShare(opts);
  } catch {
    shareWhatsApp(opts.text, opts.url);
  }
}
