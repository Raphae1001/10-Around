import { BRAND_SHADOW } from "@/lib/brand";

/**
 * "10" mark — ten Jews, one tap. This is the exact brand asset
 * (public/logo/logo-10.png): fixed white tile + fixed blue numerals,
 * not theme-adaptive — it should look identical in light and dark mode.
 * Shadow is a single flat neutral gray, never warm/colored — this icon
 * already reads as an app icon on its own; it doesn't need a glow.
 */
export function Logo({ size = 56 }: { size?: number }) {
  return (
    <div
      className="relative inline-flex items-center justify-center rounded-2xl overflow-hidden"
      style={{ width: size, height: size, boxShadow: BRAND_SHADOW }}
    >
      <img
        src="/logo/logo-10.png"
        alt="10 Around"
        width={size}
        height={size}
        className="h-full w-full object-cover"
      />
    </div>
  );
}

/**
 * Brand wordmark — Fraunces, uniform ink (no bicolor). Pass className to
 * override the default text-ink (e.g. on a fixed dark background).
 * legacyFont restores the pre-Helvetica-Neue Fraunces stack (--font-display)
 * for spots that should keep the original wordmark typeface.
 */
export function Wordmark({
  className = "text-ink",
  legacyFont = false,
  style,
}: {
  className?: string;
  legacyFont?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={`font-serif-brand font-medium tracking-tight ${className}`}
      style={{ ...(legacyFont ? { fontFamily: "var(--font-display)" } : {}), ...style }}
    >
      10 Around
    </span>
  );
}
