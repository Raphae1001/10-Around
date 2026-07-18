import { useTranslation } from "react-i18next";
import { Loader2, Locate, MapPin } from "lucide-react";
import { humanTimeAgo } from "@/lib/time";
import { tapLight } from "@/lib/haptics";

type Props = {
  activeCount: number | null;
  neighborhood: string | null;
  lastUpdatedAt: number | null;
  loading: boolean;
  minyanimCount: number;
  /** Nearest live minyan — display only (hero footer). */
  nextMinyanLabel?: string | null;
  onOpenList: () => void;
  onRecenter?: () => void;
};

/**
 * Home map floating card — template Variante C (exact structure).
 */
export function HomePresenceCard({
  activeCount,
  neighborhood,
  lastUpdatedAt,
  loading,
  minyanimCount,
  nextMinyanLabel,
  onOpenList,
  onRecenter,
}: Props) {
  const { t } = useTranslation();

  const hasPresence = (activeCount ?? 0) > 0;
  const updated = lastUpdatedAt ? humanTimeAgo(lastUpdatedAt, t) : null;
  const count = activeCount ?? 0;

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
        {hasPresence ? (
          <>
            <div className="px-4 pt-4 pb-3">
              <div className="text-[11px] font-medium uppercase tracking-widest text-ink-soft">
                {t("home.subtitleWithGps")}
              </div>
              <div className="mt-1 flex items-baseline gap-2 min-w-0">
                {loading && activeCount === null ? (
                  <Loader2 className="h-7 w-7 animate-spin text-accent shrink-0" />
                ) : (
                  <span className="font-serif-brand text-[28px] leading-none text-ink tabular-nums">
                    {count}
                  </span>
                )}
                <span className="text-[13px] text-ink-soft truncate leading-snug">
                  {t("home.presence.count", { count }).replace(new RegExp(`^${count}\\s*`), "")}
                  {neighborhood ? ` · ${neighborhood}` : ""}
                </span>
              </div>
            </div>
            <div className="border-t border-hairline px-4 py-4 flex items-center justify-between gap-2 min-w-0">
              <span className="text-[12px] text-ink-soft truncate">
                {nextMinyanLabel
                  ? nextMinyanLabel
                  : updated
                    ? t("home.presence.updated", { time: updated })
                    : "\u00a0"}
              </span>
              {minyanimCount > 0 && (
                <span className="text-[12px] font-semibold text-accent shrink-0">
                  {t("home.presence.openList")}
                </span>
              )}
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
