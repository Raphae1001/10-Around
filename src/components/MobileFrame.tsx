import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { LegalFooter } from "./LegalFooter";

interface Props {
  children: ReactNode;
  showNav?: boolean;
  showLegal?: boolean;
  bg?: "default" | "navy" | "map";
  className?: string;
}

export function MobileFrame({
  children,
  showNav = true,
  showLegal = true,
  bg = "default",
  className = "",
}: Props) {
  const bgClass =
    bg === "navy" ? "navy-gradient text-white" : bg === "map" ? "map-tile" : "bg-background";

  return (
    <div className="min-h-dvh w-full bg-muted/40 flex items-stretch justify-center">
      <div
        className={`relative w-full min-h-dvh ${bgClass} ${className} flex flex-col overflow-hidden max-w-[440px] sm:max-w-[520px] md:max-w-[640px] lg:max-w-[860px] xl:max-w-[1100px] md:my-6 md:min-h-[calc(100dvh-3rem)] md:rounded-3xl md:shadow-2xl`}
      >
        <div className="flex-1 flex flex-col min-h-0">{children}</div>
        {showNav && <BottomNav />}
        {showLegal && <LegalFooter />}
      </div>
    </div>
  );
}
