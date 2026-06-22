export function Logo({ size = 56, glow = false }: { size?: number; glow?: boolean }) {
  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-2xl bg-surface border border-border ${
        glow ? "shadow-glow-gold" : "shadow-soft"
      }`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 32 32"
        width={size * 0.62}
        height={size * 0.62}
        fill="none"
        className="text-navy"
      >
        {/* Star of David — two interlocking thin triangles */}
        <path
          d="M16 5 L26 22 L6 22 Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M16 27 L6 10 L26 10 Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        {/* Tiny gold center dot */}
        <circle cx="16" cy="16" r="1.2" className="fill-gold" />
      </svg>
    </div>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display tracking-tight ${className}`}>
      Minyan<span className="text-gold">Now</span>
    </span>
  );
}
