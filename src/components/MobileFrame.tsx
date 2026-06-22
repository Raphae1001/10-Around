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
      <div
        className={`relative w-full min-h-screen ${bgClass} ${className} flex flex-col overflow-hidden max-w-[440px] sm:max-w-[520px] md:max-w-[640px] lg:max-w-[860px] xl:max-w-[1100px] md:my-6 md:min-h-[calc(100vh-3rem)] md:rounded-3xl md:shadow-2xl`}
      >
        {/* Fake status bar — phones only */}
        <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[11px] font-medium opacity-80 md:hidden">
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
