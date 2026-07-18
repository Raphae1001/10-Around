import { useTranslation } from "react-i18next";

type NameKind = "first" | "last";

type Props = {
  kind: NameKind;
  value: string;
  onChange: (value: string) => void;
  onContinue: () => void;
  autoFocus?: boolean;
};

export function NameStep({ kind, value, onChange, onContinue, autoFocus = true }: Props) {
  const { t } = useTranslation();
  const isFirst = kind === "first";
  const label = isFirst ? t("auth.firstName") : t("auth.lastName");
  const placeholder = isFirst
    ? t("auth.firstNamePlaceholder")
    : t("auth.lastNamePlaceholder");
  const autoComplete = isFirst ? "given-name" : "family-name";

  return (
    <>
      <div className="flex-1 flex flex-col">
        <div className="text-center mb-10">
          <h1 className="font-semibold text-3xl text-foreground tracking-tight">{label}</h1>
        </div>

        <label className="block">
          <span className="sr-only">{label}</span>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            autoComplete={autoComplete}
            autoFocus={autoFocus}
            maxLength={40}
            enterKeyHint="done"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onContinue();
              }
            }}
            className="w-full rounded-2xl border border-border bg-surface p-4 text-base text-foreground outline-none transition-shadow placeholder:text-muted-foreground/60 focus:border-gold focus:ring-2 focus:ring-gold/20"
          />
        </label>
      </div>

      <div className="pt-6">
        <button
          type="button"
          onClick={onContinue}
          className="w-full gold-gradient text-gold-foreground font-semibold py-4 rounded-2xl shadow-glow-gold transition-transform active:scale-[0.99]"
        >
          {t("common.continue")}
        </button>
      </div>
    </>
  );
}
