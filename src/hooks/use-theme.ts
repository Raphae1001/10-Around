import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { isDaytime } from "@/lib/sun";

type Theme = "light" | "dark";
/** "auto" follows sunrise/sunset at the user's last known location. */
type ThemeMode = Theme | "auto";

const STORAGE_KEY = "minyannow-theme";
/** Written by useGeolocation on every GPS fix — reused here so auto mode
 * never has to request location permission itself. */
const LAST_POSITION_KEY = "minyan:last-position";
const RECHECK_MS = 10 * 60 * 1000; // re-evaluate sun position every 10 min

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readLastPosition(): { lat: number; lng: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LAST_POSITION_KEY);
    if (!raw) return null;
    const pos = JSON.parse(raw) as { lat?: number; lng?: number };
    if (typeof pos.lat === "number" && typeof pos.lng === "number") {
      return { lat: pos.lat, lng: pos.lng };
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Sun position at the last known location; system preference until a fix exists. */
function resolveAutoTheme(): Theme {
  const pos = readLastPosition();
  if (!pos) return getSystemTheme();
  return isDaytime(pos.lat, pos.lng) ? "light" : "dark";
}

function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "auto";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    /* private mode / WKWebView storage pressure */
  }
  return "auto";
}

function resolveTheme(mode: ThemeMode): Theme {
  return mode === "auto" ? resolveAutoTheme() : mode;
}

function persistMode(mode: ThemeMode) {
  try {
    if (mode === "auto") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
  if (Capacitor.isNativePlatform()) {
    void import("@capacitor/preferences")
      .then(({ Preferences }) =>
        mode === "auto"
          ? Preferences.remove({ key: STORAGE_KEY })
          : Preferences.set({ key: STORAGE_KEY, value: mode }),
      )
      .catch(() => {});
  }
}

async function syncNativeChrome(theme: Theme) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
    // Style.Dark = light content (for dark backgrounds); Style.Light = dark content.
    await StatusBar.setStyle({ style: theme === "dark" ? Style.Dark : Style.Light });
    // Android honors background color when not overlaying.
    await StatusBar.setBackgroundColor({
      color: theme === "dark" ? "#1A1A2E" : "#FFFFFF",
    }).catch(() => {});
  } catch {
    /* StatusBar plugin unavailable in simulator edge cases */
  }
}

/** Apply theme to the DOM. Safe to call before React mounts. */
export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const body = document.body;
  root.classList.toggle("dark", theme === "dark");
  body?.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  if (body) body.style.colorScheme = theme;
  void syncNativeChrome(theme);
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => readStoredMode());
  const [theme, setTheme] = useState<Theme>(() => resolveTheme(mode));

  useEffect(() => {
    const next = resolveTheme(mode);
    setTheme(next);
    applyTheme(next);
  }, [mode]);

  // Auto mode: re-check the sun position periodically and whenever the app
  // comes back to the foreground (covers "opened the app at a different
  // time of day" without needing a location permission request of our own).
  useEffect(() => {
    if (mode !== "auto") return;
    const recheck = () => {
      const next = resolveAutoTheme();
      setTheme((prev) => {
        if (prev === next) return prev;
        applyTheme(next);
        return next;
      });
    };
    const interval = setInterval(recheck, RECHECK_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") recheck();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [mode]);

  // Restore from Preferences if localStorage was empty (iOS storage eviction).
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cancelled = false;
    void import("@capacitor/preferences")
      .then(async ({ Preferences }) => {
        const { value } = await Preferences.get({ key: STORAGE_KEY });
        if (cancelled) return;
        if ((value === "dark" || value === "light") && readStoredMode() === "auto") {
          persistMode(value);
          setMode(value);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  /** Explicit override, opposite of what's currently shown (auto or manual). */
  const toggle = () => {
    setMode((prevMode) => {
      const current = resolveTheme(prevMode);
      const next: Theme = current === "dark" ? "light" : "dark";
      // Apply immediately so the first paint after tap isn't one frame late
      // (important on WKWebView where batched updates can feel like "nothing happened").
      applyTheme(next);
      setTheme(next);
      persistMode(next);
      return next;
    });
  };

  return { theme, mode, toggle };
}

/** Call once at app root to apply the saved/auto theme before first paint. */
export function initTheme() {
  if (typeof window === "undefined") return;
  applyTheme(resolveTheme(readStoredMode()));
}
