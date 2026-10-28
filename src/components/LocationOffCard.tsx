import { useTranslation } from "react-i18next";
import { MapPinOff } from "lucide-react";

type Props = {
  /** The user refused location: only the iOS Settings app can turn it back on. */
  denied: boolean;
  onTurnOn: () => void;
};

/** Shown on the home map when location is off: explains what is missing and offers to turn it on. */
export function LocationOffCard({ denied, onTurnOn }: Props) {
  const { t } = useTranslation();
  return (
    <div className="absolute bottom-4 left-4 right-4 z-20 rounded-2xl bg-surface shadow-lifted px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-gold/10 text-gold flex items-center justify-center shrink-0">
          <MapPinOff className="h-[18px] w-[18px]" />
        </div>
        <div className="min-w-0">
          <div className="text-[15px] font-semibold text-ink leading-snug">
            {t("home.locationOff.title")}
          </div>
          <p className="text-[12px] text-ink-soft mt-1 leading-snug">
            {t("home.locationOff.body")}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onTurnOn}
        className="mt-3 w-full h-11 rounded-xl bg-accent text-accent-foreground font-semibold text-[15px] active:scale-[0.99] transition-transform"
      >
        {denied ? t("home.locationOff.openSettings") : t("home.locationOff.turnOn")}
      </button>
    </div>
  );
}
