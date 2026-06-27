/**
 * Share helpers: native Capacitor share → Web Share API → WhatsApp deep
 * link → clipboard fallback. Never uses api.whatsapp.com and never tries
 * to render WhatsApp inside the app.
 */
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import { openExternal } from "@/lib/external";

/** Fallback origin for share links when no custom domain is configured yet. */
const DEFAULT_ORIGIN = import.meta.env.VITE_APP_URL as string | undefined;

/** Origin to use when generating shareable links. */
export function appOrigin(): string {
  if (typeof window !== "undefined") {
    const host = window.location?.hostname ?? "";
    if (host && host !== "localhost" && !host.startsWith("127.0.0.1")) {
      return window.location.origin;
    }
  }
  return DEFAULT_ORIGIN ?? (typeof window !== "undefined" ? window.location.origin : "");
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall through */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}

function isMobileUA(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android|iphone|ipad|ipod/i.test(navigator.userAgent || "");
}

/** WhatsApp share — wa.me on desktop, whatsapp:// deep link on mobile.
 *  Never uses api.whatsapp.com. */
export function shareWhatsApp(text: string, url?: string) {
  const full = url ? `${text}\n${url}` : text;
  const encoded = encodeURIComponent(full);
  const target = isMobileUA()
    ? `whatsapp://send?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
  const ok = openExternal(target);
  if (!ok) {
    void copyToClipboard(full).then((copied) => {
      toast(copied ? "Lien copié" : "Partage indisponible", {
        description: copied ? full : "Copiez ce lien manuellement : " + full,
      });
    });
  }
}

/** Preferred share entry point.
 *  Order: Capacitor native sheet → navigator.share → WhatsApp deep link → clipboard. */
export async function shareAny(opts: { title?: string; text: string; url?: string }) {
  const full = opts.url ? `${opts.text}\n${opts.url}` : opts.text;
  void import("@/lib/analytics").then(({ track }) => track("share_minyan"));

  // 1) Capacitor native share sheet (iOS/Android app).
  if (Capacitor.isNativePlatform()) {
    try {
      const { Share } = await import("@capacitor/share");
      await Share.share({ title: opts.title, text: opts.text, url: opts.url });
      return;
    } catch (e) {
      if ((e as { message?: string })?.message?.toLowerCase().includes("cancel")) return;
    }
  }

  // 2) Web Share API (mobile browsers, Safari, modern Chrome desktop).
  const nav = typeof navigator !== "undefined"
    ? (navigator as Navigator & { share?: (d: ShareData) => Promise<void> })
    : null;
  if (nav?.share) {
    try {
      await nav.share({ title: opts.title, text: opts.text, url: opts.url });
      return;
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return;
      // otherwise fall through to WhatsApp / clipboard
    }
  }

  // 3) WhatsApp deep link (wa.me on desktop, whatsapp:// on mobile).
  const encoded = encodeURIComponent(full);
  const wa = isMobileUA()
    ? `whatsapp://send?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
  if (openExternal(wa)) return;

  // 4) Clipboard fallback.
  const ok = await copyToClipboard(full);
  toast(ok ? "Lien copié dans le presse-papiers" : "Partage indisponible", {
    description: ok ? full : "Copiez ce lien manuellement : " + full,
    duration: 8000,
  });
}
