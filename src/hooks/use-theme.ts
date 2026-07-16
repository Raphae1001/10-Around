import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

type Theme = "light" | "dark";

const STORAGE_KEY = "minyannow-theme";

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    /* private mode / WKWebView storage pressure */
  }
  return null;
}

function persistTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
  if (Capacitor.isNativePlatform()) {
    void import("@capacitor/preferences")
      .then(({ Preferences }) => Preferences.set({ key: STORAGE_KEY, value: theme }))
      .catch(() => {});
  }
}

async function syncNativeChrome(theme: Theme) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    // Style.Dark = light content (for dark backgrounds); Style.Light = dark content.
    await StatusBar.setStyle({ style: theme === "dark" ? Style.Dark : Style.Light });
    // Android / some iOS builds honor background color.
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
  const [theme, setTheme] = useState<Theme>(() => readStoredTheme() ?? getSystemTheme());

  useEffect(() => {
    applyTheme(theme);
    persistTheme(theme);
  }, [theme]);

  // Restore from Preferences if localStorage was empty (iOS storage eviction).
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cancelled = false;
    void import("@capacitor/preferences")
      .then(async ({ Preferences }) => {
        const { value } = await Preferences.get({ key: STORAGE_KEY });
        if (cancelled) return;
        if (value === "dark" || value === "light") {
          if (readStoredTheme() == null) {
            persistTheme(value);
            setTheme(value);
            applyTheme(value);
          }
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = () => {
    setTheme((t) => {
      const next: Theme = t === "dark" ? "light" : "dark";
      // Apply immediately so the first paint after tap isn't one frame late
      // (important on WKWebView where batched updates can feel like "nothing happened").
      applyTheme(next);
      persistTheme(next);
      return next;
    });
  };

  return { theme, setTheme, toggle };
}

/** Call once at app root to apply the saved theme before first paint. */
export function initTheme() {
  if (typeof window === "undefined") return;
  applyTheme(readStoredTheme() ?? getSystemTheme());
}
