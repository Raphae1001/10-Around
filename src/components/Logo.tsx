/**
 * "10" mark — ten Jews, one tap. This is the exact brand asset
 * (public/logo/logo-10.png): fixed white tile + fixed blue numerals,
 * not theme-adaptive — it should look identical in light and dark mode.
 */
export function Logo({ size = 56, glow = false }: { size?: number; glow?: boolean }) {
  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-2xl overflow-hidden ${
        glow ? "shadow-fab" : "shadow-soft"
      }`}
      style={{ width: size, height: size }}
    >
      <img
        src="/logo/logo-10.png"
        alt="MinyanNow"
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
}: {
  className?: string;
  legacyFont?: boolean;
}) {
  return (
    <span
      className={`font-serif-brand font-medium tracking-tight ${className}`}
      style={legacyFont ? { fontFamily: "var(--font-display)" } : undefined}
    >
      MinyanNow
    </span>
  );
}
