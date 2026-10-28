import { useTranslation } from "react-i18next";
import { Locate, MapPin } from "lucide-react";
import { tapLight } from "@/lib/haptics";

type Props = {
  /** Minyanim within 1 km that are live now or start within the hour. */
  minyanimCount: number;
  /** Next of those minyanim — display only. */
  nextMinyanLabel?: string | null;
  onOpenList: () => void;
  onRecenter?: () => void;
};

/**
 * Home map floating card — "N minyanim near you". Opens the list of those minyanim.
 */
export function HomePresenceCard({
  minyanimCount,
  nextMinyanLabel,
  onOpenList,
  onRecenter,
}: Props) {
  const { t } = useTranslation();
  const hasMinyanim = minyanimCount > 0;

  return (
    <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-col gap-3">
      <div className="flex justify-end">
        {onRecenter && (
          <button
            type="button"
            onClick={() => {
              tapLight();
              onRecenter();
            }}
            aria-label={t("home.recenter")}
            className="h-11 w-11 rounded-full bg-surface shadow-soft flex items-center justify-center text-ink transition-transform active:scale-[0.94]"
          >
            <Locate className="h-5 w-5" strokeWidth={2.2} />
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={onOpenList}
        aria-label={t("home.presence.openList")}
        className="w-full rounded-2xl bg-surface shadow-lifted overflow-hidden text-left transition-transform active:scale-[0.99]"
      >
        {hasMinyanim ? (
          <>
            <div className="px-4 pt-4 pb-3">
              <div className="text-[11px] font-medium uppercase tracking-widest text-ink-soft">
                {t("home.subtitleWithGps")}
              </div>
              <div className="mt-1 flex items-baseline gap-2 min-w-0">
                <span className="font-serif-brand text-[28px] leading-none text-ink tabular-nums">
                  {minyanimCount}
                </span>
                <span className="text-[13px] text-ink-soft truncate leading-snug">
                  {t("home.presence.minyanimNearby", { count: minyanimCount }).replace(
                    new RegExp(`^${minyanimCount}\\s*`),
                    "",
                  )}
                </span>
              </div>
            </div>
            <div className="border-t border-hairline px-4 py-4 flex items-center justify-between gap-2 min-w-0">
              <span className="text-[12px] text-ink-soft truncate">{nextMinyanLabel ?? " "}</span>
              <span className="text-[12px] font-semibold text-accent shrink-0">
                {t("home.presence.openList")}
              </span>
            </div>
          </>
        ) : (
          <div className="px-4 py-4">
            <div className="text-[15px] font-semibold text-ink leading-tight">
              {t("home.presence.emptyTitle")}
            </div>
            <div className="text-[12px] text-ink-soft mt-1 leading-snug flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{t("home.presence.emptySubtitle")}</span>
            </div>
          </div>
        )}
      </button>
    </div>
  );
}
