import { ReactNode } from "react";

interface Pin {
  x: number; // %
  y: number;
  tone: "gold" | "sky" | "urgent" | "success";
  label?: string;
  pulse?: boolean;
  size?: "sm" | "md" | "lg";
}

const toneBg: Record<Pin["tone"], string> = {
  gold: "gold-gradient text-gold-foreground",
  sky: "bg-sky text-navy",
  urgent: "bg-urgent text-white",
  success: "bg-success text-white",
};
const toneRing: Record<Pin["tone"], string> = {
  gold: "text-gold",
  sky: "text-sky",
  urgent: "text-urgent",
  success: "text-success",
};

export function MapCanvas({
  pins = [],
  children,
  className = "",
  height = "h-[420px]",
}: {
  pins?: Pin[];
  children?: ReactNode;
  className?: string;
  height?: string;
}) {
  return (
    <div className={`relative w-full ${height} map-tile overflow-hidden ${className}`}>
      {/* roads */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 400 400"
        preserveAspectRatio="none"
      >
        <path
          d="M0,260 C100,200 200,300 400,220"
          stroke="currentColor"
          className="text-foreground/10"
          strokeWidth="14"
          fill="none"
        />
        <path
          d="M0,260 C100,200 200,300 400,220"
          stroke="currentColor"
          className="text-background"
          strokeWidth="6"
          fill="none"
        />
        <path
          d="M120,0 C140,150 80,280 180,400"
          stroke="currentColor"
          className="text-foreground/10"
          strokeWidth="10"
          fill="none"
        />
        <path
          d="M120,0 C140,150 80,280 180,400"
          stroke="currentColor"
          className="text-background"
          strokeWidth="4"
          fill="none"
        />
        <path
          d="M260,0 C240,180 320,260 280,400"
          stroke="currentColor"
          className="text-foreground/10"
          strokeWidth="10"
          fill="none"
        />
        <path
          d="M260,0 C240,180 320,260 280,400"
          stroke="currentColor"
          className="text-background"
          strokeWidth="4"
          fill="none"
        />
      </svg>

      {pins.map((p, i) => {
        const sz = p.size === "lg" ? "h-12 w-12" : p.size === "sm" ? "h-7 w-7" : "h-10 w-10";
        return (
          <div
            key={i}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            <div className={`relative ${sz}`}>
              {p.pulse && (
                <span
                  className={`absolute inset-0 rounded-full ${toneRing[p.tone]} live-pulse-ring`}
                  style={{ background: "currentColor" }}
                />
              )}
              <div
                className={`relative h-full w-full rounded-full ${toneBg[p.tone]} flex items-center justify-center text-[11px] font-bold shadow-lift border-2 border-background`}
              >
                {p.label ?? "✡"}
              </div>
            </div>
          </div>
        );
      })}

      {/* user dot */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <span className="absolute inset-0 rounded-full bg-sky/40 live-pulse-ring" />
        <div className="relative h-4 w-4 rounded-full bg-sky border-2 border-background shadow-lift" />
      </div>

      {children}
    </div>
  );
}
