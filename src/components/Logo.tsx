export function Logo({ size = 56, glow = false }: { size?: number; glow?: boolean }) {
  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-2xl bg-dark-surface ${
        glow ? "shadow-fab" : "shadow-soft"
      }`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 32 32" width={size * 0.62} height={size * 0.62} fill="none">
        {/* Star of David — white interlocking triangles */}
        <path d="M16 5 L26 22 L6 22 Z" stroke="#ffffff" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M16 27 L6 10 L26 10 Z" stroke="#ffffff" strokeWidth="1.6" strokeLinejoin="round" />
        <circle cx="16" cy="16" r="1.2" className="fill-accent" />
      </svg>
    </div>
  );
}

/** Brand wordmark — Fraunces, uniform ink (no bicolor). */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-serif-brand font-medium tracking-tight text-ink ${className}`}>
      MinyanNow
    </span>
  );
}
