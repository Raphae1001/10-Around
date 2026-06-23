import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGS, type LangCode } from "@/i18n";
import { ChevronDown, Globe } from "lucide-react";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { i18n, t } = useTranslation();
  const current = (i18n.language?.split("-")[0] as LangCode) || "en";
  const active = SUPPORTED_LANGS.find((l) => l.code === current) ?? SUPPORTED_LANGS[0];

  return (
    <div>
      {!compact && (
        <div className="flex items-center gap-2 mb-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
          <Globe className="h-3.5 w-3.5" />
          {t("settings.chooseLanguage")}
        </div>
      )}
      <div className="relative rounded-2xl bg-surface border border-border overflow-hidden">
        <div className="flex items-center gap-3 p-4 pointer-events-none">
          <span className="text-xl leading-none">{active.flag}</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{active.native}</div>
            <div className="text-[11px] text-muted-foreground truncate">{active.label}</div>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
        <select
          aria-label="Choose language"
          value={current}
          onChange={(e) => i18n.changeLanguage(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        >
          {SUPPORTED_LANGS.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.flag} {lang.native} — {lang.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
