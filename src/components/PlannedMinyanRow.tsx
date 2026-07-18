import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Calendar, Globe2, MapPin, Sunrise, Sun, Moon } from "lucide-react";
import type { MinyanRow } from "@/hooks/use-minyanim";
import { humanTimeAgo } from "@/lib/time";
import { stayCityKey } from "@/lib/stay";

function prayerIcon(prayer: string) {
  if (prayer === "shacharit") return Sunrise;
  if (prayer === "maariv") return Moon;
  return Sun;
}

function formatDate(iso: string | null, locale: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short" });
}

function formatDateTime(iso: string | null, locale: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Props = {
  m: MinyanRow;
  variant: "scheduled" | "stay";
  isLast?: boolean;
};

export function PlannedMinyanRow({ m, variant, isLast }: Props) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const PrayerIcon = prayerIcon(m.prayer);
  const present = m.present_count ?? 1;
  const prayerLabel = t(`prayer.${m.prayer}`, { defaultValue: m.prayer });

  const meta =
    variant === "scheduled"
      ? formatDateTime(m.scheduled_at, locale)
      : m.trip_start_date && m.trip_end_date
        ? t("planned.dateRange", {
            start: formatDate(m.trip_start_date, locale),
            end: formatDate(m.trip_end_date, locale),
          })
        : formatDate(m.trip_start_date, locale);

  const rowClass = `flex items-center gap-3.5 px-4 py-3.5 min-h-[72px] active:bg-surface-muted/60 relative ${
    !isLast ? "after:absolute after:left-16 after:right-0 after:bottom-0 after:h-px after:bg-hairline" : ""
  }`;

  const inner = (
    <>
      <div className="h-11 w-11 rounded-full flex items-center justify-center shrink-0 bg-surface-muted text-ink-soft">
        {variant === "stay" ? (
          <Globe2 className="h-5 w-5" strokeWidth={1.9} />
        ) : (
          <PrayerIcon className="h-5 w-5" strokeWidth={1.9} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-medium text-[15px] text-foreground truncate leading-snug">
          {m.address ?? t("home.unknownSpot")}
        </div>
        <div className="text-[13px] text-muted-foreground mt-0.5 truncate flex items-center gap-1.5">
          {variant === "scheduled" ? (
            <Calendar className="h-3 w-3 shrink-0 opacity-70" />
          ) : (
            <MapPin className="h-3 w-3 shrink-0 opacity-70" />
          )}
          <span className="truncate">{meta}</span>
          {variant === "scheduled" && (
            <>
              <span className="opacity-40">·</span>
              <span className="shrink-0">{prayerLabel}</span>
              <span className="opacity-40">·</span>
              <span className="shrink-0">
                {present}/10 {t("home.present")}
              </span>
            </>
          )}
        </div>
        {m.message && (
          <p className="text-[11px] text-muted-foreground mt-1 truncate italic">{m.message}</p>
        )}
      </div>
      {variant === "scheduled" && m.scheduled_at && (
        <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
          {humanTimeAgo(m.scheduled_at, t)}
        </span>
      )}
    </>
  );

  if (variant === "stay" && m.address) {
    return (
      <Link
        to="/travel-city/$cityKey"
        params={{ cityKey: stayCityKey(m.address) }}
        search={{
          from: m.trip_start_date ?? undefined,
          to: m.trip_end_date ?? undefined,
        }}
        className={rowClass}
      >
        {inner}
      </Link>
    );
  }

  return (
    <Link to="/minyan" search={{ id: m.id }} className={rowClass}>
      {inner}
    </Link>
  );
}
