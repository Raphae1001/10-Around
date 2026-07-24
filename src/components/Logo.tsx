/** "10" mark — ten Jews, one tap. Tile and numerals both follow the live theme/accent. */
export function Logo({ size = 56, glow = false }: { size?: number; glow?: boolean }) {
  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-2xl bg-surface ${
        glow ? "shadow-fab" : "shadow-soft"
      }`}
      style={{ width: size, height: size }}
    >
      <span
        className="font-sans font-extrabold leading-none text-accent"
        style={{ fontSize: size * 0.5, letterSpacing: "-0.03em" }}
      >
        10
      </span>
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
