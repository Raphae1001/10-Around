import { useTranslation } from "react-i18next";
import { ChevronUp, Loader2, Locate, MapPin, Sparkles, Users } from "lucide-react";
import { humanTimeAgo } from "@/lib/time";
import { tapLight } from "@/lib/haptics";

type Props = {
  activeCount: number | null;
  neighborhood: string | null;
  lastUpdatedAt: number | null;
  loading: boolean;
  minyanimCount: number;
  onOpenList: () => void;
  onRecenter?: () => void;
};

/**
 * Bottom presence card on the home map.
 * - Honest counter: shows real active-member count (server already applies the
 *   privacy threshold, so a low count surfaces as the "never empty" state).
 * - Named zone: neighborhood from reverse geocoding.
 * - Human time: "updated 2 min ago".
 * - Never empty: encouraging copy when nobody's around yet.
 * Tapping opens the nearby minyanim list (secondary access).
 */
export function HomePresenceCard({
  activeCount,
  neighborhood,
  lastUpdatedAt,
  loading,
  minyanimCount,
  onOpenList,
  onRecenter,
}: Props) {
  const { t } = useTranslation();

  const hasPresence = (activeCount ?? 0) > 0;
  const updated = lastUpdatedAt ? humanTimeAgo(lastUpdatedAt, t) : null;

  const title = hasPresence
    ? t("home.presence.count", { count: activeCount ?? 0 })
    : t("home.presence.emptyTitle");

  const subtitleParts: string[] = [];
  if (hasPresence) {
    if (neighborhood) subtitleParts.push(neighborhood);
    if (updated) subtitleParts.push(t("home.presence.updated", { time: updated }));
  } else {
    subtitleParts.push(t("home.presence.emptySubtitle"));
  }
  const subtitle = subtitleParts.join(" · ");

  return (
    <div className="absolute bottom-4 left-4 right-20 z-20 flex items-end gap-2.5">
      <button
        type="button"
        onClick={onOpenList}
        aria-label={t("home.presence.openList")}
        className="flex-1 min-w-0 flex items-center gap-3 rounded-3xl bg-surface/75 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-[0_8px_32px_-6px_rgba(0,0,0,0.28)] px-4 py-3.5 text-left transition-transform active:scale-[0.985]"
      >
        <div
          className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 ${
            hasPresence ? "bg-gold/15 text-gold" : "bg-muted text-muted-foreground"
          }`}
        >
          {loading && activeCount === null ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : hasPresence ? (
            <Users className="h-5 w-5" />
          ) : (
            <Sparkles className="h-5 w-5" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="font-medium text-[15px] text-foreground leading-tight truncate">
            {title}
          </div>
          {subtitle && (
            <div className="text-[12px] text-muted-foreground leading-snug truncate flex items-center gap-1 mt-0.5">
              {hasPresence && neighborhood && <MapPin className="h-3 w-3 shrink-0" />}
              <span className="truncate">{subtitle}</span>
            </div>
          )}
        </div>

        <div className="shrink-0 flex flex-col items-center text-muted-foreground">
          <ChevronUp className="h-4 w-4" />
          {minyanimCount > 0 && (
            <span className="text-[10px] font-semibold text-gold leading-none mt-0.5">
              {minyanimCount}
            </span>
          )}
        </div>
      </button>

      {onRecenter && (
        <button
          type="button"
          onClick={() => {
            tapLight();
            onRecenter();
          }}
          aria-label={t("home.recenter")}
          className="h-12 w-12 shrink-0 rounded-2xl bg-surface/80 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-[0_6px_20px_-4px_rgba(0,0,0,0.25)] flex items-center justify-center text-foreground transition-transform active:scale-[0.94]"
        >
          <Locate className="h-5 w-5" strokeWidth={2.2} />
        </button>
      )}
    </div>
  );
}
