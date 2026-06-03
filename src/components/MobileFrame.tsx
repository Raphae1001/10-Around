import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

interface Props {
  children: ReactNode;
  showNav?: boolean;
  bg?: "default" | "navy" | "map";
  className?: string;
}

export function MobileFrame({ children, showNav = true, bg = "default", className = "" }: Props) {
  const bgClass =
    bg === "navy" ? "navy-gradient text-white" : bg === "map" ? "map-tile" : "bg-background";

  return (
    <div className="min-h-screen w-full bg-muted/40 flex items-stretch justify-center">
      <div className={`relative w-full max-w-[440px] min-h-screen ${bgClass} ${className} flex flex-col overflow-hidden`}>
        {/* status bar */}
        <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[11px] font-medium opacity-80">
          <span>9:41</span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-70" />
            <span>LTE</span>
            <span className="ml-1">100%</span>
          </span>
        </div>
        <div className="flex-1 flex flex-col">{children}</div>
        {showNav && <BottomNav />}
      </div>
    </div>
  );
}
