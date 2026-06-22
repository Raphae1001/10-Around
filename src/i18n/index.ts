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

// Init once (idempotent — re-imports during HMR won't re-init).
if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        fr: { translation: fr },
        he: { translation: he },
        es: { translation: es },
      },
      fallbackLng: "en",
      supportedLngs: SUPPORTED_LANGS.map((l) => l.code),
      load: "languageOnly",
      interpolation: { escapeValue: false },
      detection: {
        order: ["localStorage", "navigator"],
        lookupLocalStorage: "minyannow.lang",
        caches: ["localStorage"],
      },
      returnNull: false,
    });
}

// Keep <html lang> and dir attributes in sync with the active language.
function syncHtmlAttrs() {
  if (typeof document === "undefined") return;
  const lang = i18n.language || "en";
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
}
syncHtmlAttrs();
i18n.on("languageChanged", syncHtmlAttrs);

export default i18n;
