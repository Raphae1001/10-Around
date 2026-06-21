export function Logo({ size = 56, glow = false }: { size?: number; glow?: boolean }) {
  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-2xl gold-gradient text-navy ${
        glow ? "shadow-glow-gold" : "shadow-soft"
      }`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 32 32" width={size * 0.62} height={size * 0.62} fill="none">
        {/* pin */}
        <path
          d="M16 3c-5 0-9 3.8-9 8.7 0 6.2 9 17.3 9 17.3s9-11.1 9-17.3C25 6.8 21 3 16 3z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          fill="none"
        />
        {/* star of david inside */}
        <path
          d="M16 8.2l2.2 3.8h-4.4L16 8.2zm0 7.6l-2.2-3.8h4.4L16 15.8z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display tracking-tight ${className}`}>
      Minyan<span className="text-gold">Street</span>
    </span>
  );
}
