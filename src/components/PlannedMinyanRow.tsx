import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Calendar, ChevronRight, Globe2 } from "lucide-react";
import type { MinyanRow } from "@/hooks/use-minyanim";
import { stayCityKey } from "@/lib/stay";

function formatScheduledLine(iso: string | null, locale: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startThat - startToday) / 86_400_000);
  const time = d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (dayDiff === 0) return `${rtf.format(0, "day")} ${time}`;
  if (dayDiff === 1) return `${rtf.format(1, "day")} ${time}`;
  return d.toLocaleString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string | null, locale: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short" });
}

type Props = {
  m: MinyanRow;
  variant: "scheduled" | "stay";
  isLast?: boolean;
  /** False while the stay's destination screen is feature-flagged off — renders the row inert instead of dead-ending on tap. */
  linkable?: boolean;
};

export function PlannedMinyanRow({ m, variant, isLast, linkable = true }: Props) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const present = m.present_count ?? 1;
  const prayerLabel = t(`prayer.${m.prayer}`, { defaultValue: m.prayer });
  const place = m.address ?? t("home.unknownSpot");

  const title = variant === "scheduled" ? `${prayerLabel} · ${place}` : place;

  const subtitle =
    variant === "scheduled"
      ? `${formatScheduledLine(m.scheduled_at, locale)} · ${present}/10`
      : m.trip_start_date && m.trip_end_date
        ? t("planned.dateRange", {
            start: formatDate(m.trip_start_date, locale),
            end: formatDate(m.trip_end_date, locale),
          })
        : formatDate(m.trip_start_date, locale);

  const rowClass = `flex items-center gap-3.5 px-4 py-3.5 min-h-[72px] active:bg-surface-muted/60 relative ${
    !isLast
      ? "after:absolute after:left-16 after:right-0 after:bottom-0 after:h-px after:bg-hairline"
      : ""
  }`;

  const inner = (
    <>
      <div className="h-11 w-11 rounded-full flex items-center justify-center shrink-0 bg-surface-muted text-ink-soft">
        {variant === "stay" ? (
          <Globe2 className="h-5 w-5" strokeWidth={1.9} />
        ) : (
          <Calendar className="h-5 w-5" strokeWidth={1.9} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-[15px] text-ink truncate leading-snug">{title}</div>
        <div className="text-[13px] text-ink-soft mt-0.5 truncate">{subtitle}</div>
      </div>
      {linkable && <ChevronRight className="h-4 w-4 text-ink-soft/60 shrink-0" strokeWidth={1.8} />}
    </>
  );

  if (variant === "stay" && !linkable) {
    return <div className={rowClass}>{inner}</div>;
  }

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
