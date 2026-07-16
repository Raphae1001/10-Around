/**
 * Human-readable relative time ("just now", "20 min ago", "2 h ago").
 * i18n via the caller's `t` — keys live under `time.*`.
 */
type TFn = (key: string, opts?: Record<string, unknown>) => string;

export function humanTimeAgo(input: Date | number | string | null | undefined, t: TFn): string {
  if (input == null) return t("time.unknown", { defaultValue: "—" });
  const ms = typeof input === "number" ? input : new Date(input).getTime();
  if (Number.isNaN(ms)) return t("time.unknown", { defaultValue: "—" });

  const diffSec = Math.round((Date.now() - ms) / 1000);

  if (diffSec < 45) return t("time.justNow", { defaultValue: "just now" });
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return t("time.minAgo", { count: diffMin, defaultValue: "{{count}} min ago" });
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return t("time.hourAgo", { count: diffHour, defaultValue: "{{count}} h ago" });
  const diffDay = Math.round(diffHour / 24);
  return t("time.dayAgo", { count: diffDay, defaultValue: "{{count}} d ago" });
}
