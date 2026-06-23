import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import fr from "./locales/fr.json";
import he from "./locales/he.json";
import es from "./locales/es.json";
import ru from "./locales/ru.json";
import pt from "./locales/pt.json";
import de from "./locales/de.json";
import it from "./locales/it.json";
import yi from "./locales/yi.json";
import ar from "./locales/ar.json";
import nl from "./locales/nl.json";
import pl from "./locales/pl.json";
import uk from "./locales/uk.json";
import ro from "./locales/ro.json";

export const SUPPORTED_LANGS = [
  { code: "en", label: "English",     native: "English",    flag: "🇬🇧" },
  { code: "fr", label: "French",      native: "Français",   flag: "🇫🇷" },
  { code: "he", label: "Hebrew",      native: "עברית",      flag: "🇮🇱" },
  { code: "es", label: "Spanish",     native: "Español",    flag: "🇪🇸" },
  { code: "ru", label: "Russian",     native: "Русский",    flag: "🇷🇺" },
  { code: "pt", label: "Portuguese",  native: "Português",  flag: "🇵🇹" },
  { code: "de", label: "German",      native: "Deutsch",    flag: "🇩🇪" },
  { code: "it", label: "Italian",     native: "Italiano",   flag: "🇮🇹" },
  { code: "yi", label: "Yiddish",     native: "ייִדיש",      flag: "🇮🇱" },
  { code: "ar", label: "Arabic",      native: "العربية",    flag: "🇸🇦" },
  { code: "nl", label: "Dutch",       native: "Nederlands", flag: "🇳🇱" },
  { code: "pl", label: "Polish",      native: "Polski",     flag: "🇵🇱" },
  { code: "uk", label: "Ukrainian",   native: "Українська", flag: "🇺🇦" },
  { code: "ro", label: "Romanian",    native: "Română",     flag: "🇷🇴" },
] as const;

export type LangCode = (typeof SUPPORTED_LANGS)[number]["code"];

const RTL_LANGS = new Set<LangCode>(["he", "yi", "ar"]);

const isBrowser = typeof window !== "undefined";

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en }, fr: { translation: fr }, he: { translation: he },
      es: { translation: es }, ru: { translation: ru }, pt: { translation: pt },
      de: { translation: de }, it: { translation: it }, yi: { translation: yi },
      ar: { translation: ar }, nl: { translation: nl }, pl: { translation: pl },
      uk: { translation: uk }, ro: { translation: ro },
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

function syncHtmlAttrs() {
  if (typeof document === "undefined") return;
  const lang = (i18n.language || "en") as LangCode;
  document.documentElement.lang = lang;
  document.documentElement.dir = RTL_LANGS.has(lang) ? "rtl" : "ltr";
}
i18n.on("languageChanged", (lng) => {
  syncHtmlAttrs();
  if (isBrowser) {
    try { localStorage.setItem("minyannow.lang", lng); } catch {}
  }
});

export function applySavedLang() {
  if (!isBrowser) return;
  let saved: string | null = null;
  try { saved = localStorage.getItem("minyannow.lang"); } catch {}
  if (saved && SUPPORTED_LANGS.some((l) => l.code === saved) && saved !== i18n.language) {
    i18n.changeLanguage(saved);
  } else {
    syncHtmlAttrs();
  }
}

export default i18n;
