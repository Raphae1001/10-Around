/** Share helpers: native share sheet first, wa.me fallback, clipboard last.
 *  We never use api.whatsapp.com (often blocked by ad-blockers/firewalls). */
import { nativeShare } from "@/lib/native";
import { toast } from "sonner";

const PUBLISHED_ORIGIN = "https://global-minyan-connect.lovable.app";

export function appOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return PUBLISHED_ORIGIN;
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

/** wa.me deep-link (never api.whatsapp.com). */
export function shareWhatsApp(text: string, url?: string) {
  const full = url ? `${text}\n${url}` : text;
  const wa = `https://wa.me/?text=${encodeURIComponent(full)}`;
  if (typeof window !== "undefined") {
    const w = window.open(wa, "_blank", "noopener,noreferrer");
    if (!w) {
      void copyToClipboard(full).then((ok) => {
        toast(ok ? "Lien copié dans le presse-papiers" : "Impossible de partager", {
          description: ok ? full : "Copie manuelle requise",
        });
      });
    }
  }
}

/** Preferred share entry point. Tries OS-native → Web Share → wa.me → clipboard. */
export async function shareAny(opts: { title?: string; text: string; url?: string }) {
  const full = opts.url ? `${opts.text}\n${opts.url}` : opts.text;

  // 1) Native (Capacitor) share — OS share sheet on iOS/Android.
  try {
    await nativeShare(opts);
    return;
  } catch { /* fall through */ }

  // 2) Web Share API — mobile + modern desktop.
  const nav = typeof navigator !== "undefined"
    ? (navigator as Navigator & { share?: (d: ShareData) => Promise<void> })
    : null;
  if (nav?.share) {
    try {
      await nav.share({ title: opts.title, text: opts.text, url: opts.url });
      return;
    } catch (e) {
      // user cancelled? bail silently
      if ((e as DOMException)?.name === "AbortError") return;
      /* otherwise fall through */
    }
  }

  // 3) wa.me deep-link (never api.whatsapp.com)
  try {
    const wa = `https://wa.me/?text=${encodeURIComponent(full)}`;
    const w = window.open(wa, "_blank", "noopener,noreferrer");
    if (w) return;
  } catch { /* fall through */ }

  // 4) Last resort: copy to clipboard + toast.
  const ok = await copyToClipboard(full);
  toast(ok ? "Lien copié dans le presse-papiers" : "Partage indisponible", {
    description: ok ? full : "Copiez ce lien manuellement : " + full,
    duration: 8000,
  });
}
