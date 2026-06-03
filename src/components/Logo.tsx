export function Logo({ size = 56, glow = false }: { size?: number; glow?: boolean }) {
  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-2xl gold-gradient text-navy ${
        glow ? "shadow-glow-gold" : "shadow-soft"
      }`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 32 32" width={size * 0.6} height={size * 0.6} fill="none">
        <path d="M16 3 L28 10 V22 L16 29 L4 22 V10 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="16" cy="16" r="3" fill="currentColor" />
      </svg>
    </div>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display tracking-tight ${className}`}>
      Minyan<span className="text-gold">Live</span>
    </span>
  );
}
