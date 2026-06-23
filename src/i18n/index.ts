import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import fr from "./locales/fr.json";
import he from "./locales/he.json";
import es from "./locales/es.json";

export const SUPPORTED_LANGS = [
  { code: "en", label: "English", native: "English", flag: "🇬🇧" },
  { code: "fr", label: "French", native: "Français", flag: "🇫🇷" },
  { code: "he", label: "Hebrew", native: "עברית", flag: "🇮🇱" },
  { code: "es", label: "Spanish", native: "Español", flag: "🇪🇸" },
] as const;

export type LangCode = (typeof SUPPORTED_LANGS)[number]["code"];

const isBrowser = typeof window !== "undefined";

// Init once (idempotent — re-imports during HMR won't re-init).
// On SSR we ALWAYS render English to avoid hydration mismatches; the client
// then switches to the user's saved language after mount via applySavedLang().
if (!i18n.isInitialized) {
  const chain = isBrowser ? i18n.use(initReactI18next) : i18n.use(initReactI18next);
  chain.init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      he: { translation: he },
      es: { translation: es },
    },
    lng: "en",
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LANGS.map((l) => l.code),
    load: "languageOnly",
    interpolation: { escapeValue: false },
    returnNull: false,
    react: { useSuspense: false },
  });
}

// Keep <html lang> and dir attributes in sync with the active language (client-only).
function syncHtmlAttrs() {
  if (typeof document === "undefined") return;
  const lang = i18n.language || "en";
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
}
i18n.on("languageChanged", (lng) => {
  syncHtmlAttrs();
  if (isBrowser) {
    try {
      localStorage.setItem("minyannow.lang", lng);
    } catch {}
  }
});

// Switch to saved language after mount (client only).
// Default is English everywhere — we only honor an explicit user choice
// stored in localStorage. We deliberately ignore navigator.language so the
// UI stays coherent and predictable for everyone.
export function applySavedLang() {
  if (!isBrowser) return;
  let saved: string | null = null;
  try {
    saved = localStorage.getItem("minyannow.lang");
  } catch {}
  if (saved && SUPPORTED_LANGS.some((l) => l.code === saved) && saved !== i18n.language) {
    i18n.changeLanguage(saved);
  } else {
    syncHtmlAttrs();
  }
}


// Suppress accidental usage of the removed detector import.
void LanguageDetector;

export default i18n;
