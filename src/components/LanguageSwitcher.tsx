import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGS, type LangCode } from "@/i18n";
import { Check, Globe } from "lucide-react";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { i18n, t } = useTranslation();
  const current = (i18n.language?.split("-")[0] as LangCode) || "en";

  return (
    <div>
      {!compact && (
        <div className="flex items-center gap-2 mb-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
          <Globe className="h-3.5 w-3.5" />
          {t("settings.chooseLanguage")}
        </div>
      )}
      <div className="rounded-2xl bg-surface border border-border divide-y divide-border overflow-hidden">
        {SUPPORTED_LANGS.map((lang) => {
          const active = current === lang.code;
          return (
            <button
              key={lang.code}
              onClick={() => i18n.changeLanguage(lang.code)}
              className="w-full p-4 flex items-center gap-3 text-left transition-colors hover:bg-muted/40"
            >
              <span className="text-xl leading-none">{lang.flag}</span>
              <div className="flex-1">
                <div className="text-sm font-semibold">{lang.native}</div>
                <div className="text-[11px] text-muted-foreground">{lang.label}</div>
              </div>
              {active && (
                <div className="h-6 w-6 rounded-full bg-gold text-gold-foreground flex items-center justify-center">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
