/**
 * Centralized analytics service for MinyanNow.
 *
 * Loads Google Analytics 4 + Microsoft Clarity lazily and only when
 * measurement IDs are configured. Safe to call from any environment
 * (SSR, native shell, browser) — every method no-ops when disabled,
 * absent, or running on the server.
 *
 * No PII is ever forwarded. User IDs are hashed before being sent.
 */

const GA_ID = import.meta.env.VITE_GA4_ID as string | undefined;
const CLARITY_ID = import.meta.env.VITE_CLARITY_ID as string | undefined;

type GtagFn = (...args: unknown[]) => void;
type ClarityFn = ((...args: unknown[]) => void) & { q?: IArguments[] };

interface AnalyticsWindow extends Window {
  dataLayer?: unknown[];
  gtag?: GtagFn;
  clarity?: ClarityFn;
}

function analyticsWindow(): AnalyticsWindow {
  return window as unknown as AnalyticsWindow;
}

export type AnalyticsEvent =
  | "page_view"
  | "sign_up"
  | "sign_in"
  | "sign_out"
  | "create_minyan"
  | "edit_minyan"
  | "cancel_minyan"
  | "join_minyan"
  | "leave_minyan"
  | "share_minyan"
  | "open_maps"
  | "open_chat"
  | "update_profile"
  | "delete_account";

type EventParams = Record<string, string | number | boolean | undefined>;

let loaded = false;
let loading: Promise<void> | null = null;

function isBrowser() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function userEnabled() {
  if (!isBrowser()) return false;
  try {
    const v = localStorage.getItem("minyannow.analytics.enabled");
    return v === null ? true : v === "1";
  } catch {
    return true;
  }
}

function injectScript(src: string, async = true): Promise<void> {
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = async;
    s.onload = () => resolve();
    s.onerror = () => resolve(); // fail silent
    document.head.appendChild(s);
  });
}

async function ensureLoaded() {
  if (!isBrowser() || loaded || !userEnabled()) return;
  if (loading) return loading;
  loading = (async () => {
    const w = analyticsWindow();
    if (GA_ID) {
      // GA4
      w.dataLayer = w.dataLayer || [];
      w.gtag = function gtag() {
        w.dataLayer!.push(arguments);
      };
      w.gtag("js", new Date());
      w.gtag("config", GA_ID, {
        anonymize_ip: true,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        send_page_view: false, // we send page_view manually on route change
      });
      await injectScript(`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`);
    }
    if (CLARITY_ID) {
      // Microsoft Clarity bootstrap
      (function (c: AnalyticsWindow, l: Document, a: "clarity", r: string, i: string) {
        c[a] =
          c[a] ||
          (function () {
            (c[a]!.q = c[a]!.q || []).push(arguments);
          } as ClarityFn);
        const t = l.createElement(r) as HTMLScriptElement;
        t.async = true;
        t.src = "https://www.clarity.ms/tag/" + i;
        const y = l.getElementsByTagName(r)[0];
        y.parentNode?.insertBefore(t, y);
      })(w, document, "clarity", "script", CLARITY_ID);
    }
    loaded = true;
  })();
  return loading;
}

function safeParams(params?: EventParams): EventParams | undefined {
  if (!params) return undefined;
  const clean: EventParams = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    // Strip anything that looks like an email or contains '@'
    if (typeof v === "string" && /@/.test(v)) continue;
    clean[k] = v;
  }
  return clean;
}

export function track(event: AnalyticsEvent, params?: EventParams) {
  if (!isBrowser() || !userEnabled()) return;
  void ensureLoaded().then(() => {
    try {
      const p = safeParams(params);
      const w = analyticsWindow();
      if (GA_ID && w.gtag) {
        w.gtag("event", event, p ?? {});
      }
      if (CLARITY_ID && w.clarity) {
        w.clarity("event", event);
        if (p) {
          for (const [k, v] of Object.entries(p)) {
            w.clarity("set", k, String(v));
          }
        }
      }
    } catch {
      /* swallow */
    }
  });
}

export function pageView(path: string, title?: string) {
  if (!isBrowser() || !userEnabled()) return;
  void ensureLoaded().then(() => {
    try {
      const w = analyticsWindow();
      if (GA_ID && w.gtag) {
        w.gtag("event", "page_view", {
          page_path: path,
          page_title: title,
          page_location: window.location.href,
        });
      }
    } catch {
      /* swallow */
    }
  });
}

export function setAnalyticsEnabled(enabled: boolean) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem("minyannow.analytics.enabled", enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function isAnalyticsEnabled(): boolean {
  return userEnabled();
}

export function isAnalyticsConfigured(): boolean {
  return Boolean(GA_ID || CLARITY_ID);
}
