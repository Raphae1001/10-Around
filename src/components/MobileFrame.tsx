import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { LegalFooter } from "./LegalFooter";
import { isNativeApp } from "@/lib/platform";

interface Props {
  children: ReactNode;
  showNav?: boolean;
  showLegal?: boolean;
  bg?: "default" | "navy" | "map";
  className?: string;
}

/**
 * App chrome:
 * - Native (iOS/Android): full-bleed fixed height, safe-area padding
 * - Web: phone-frame on desktop, full width on small screens, normal scroll
 */
export function MobileFrame({
  children,
  showNav = true,
  showLegal = true,
  bg = "default",
  className = "",
}: Props) {
  const bgClass =
    bg === "navy" ? "navy-gradient text-white" : bg === "map" ? "map-tile" : "bg-background";
  const native = isNativeApp();

  return (
    <div
      className={`w-full flex items-stretch justify-center ${
        native ? "h-full bg-background" : "min-h-dvh bg-muted/40"
      }`}
    >
      <div
        className={`relative w-full max-w-full flex flex-col overflow-hidden ${bgClass} ${className} ${
          native
            ? "h-full"
            : "min-h-dvh h-dvh max-h-dvh max-w-[440px] md:my-6 md:h-[calc(100dvh-3rem)] md:max-h-[calc(100dvh-3rem)] md:rounded-3xl md:shadow-2xl"
        }`}
        style={
          native && bg !== "map"
            ? { paddingTop: "env(safe-area-inset-top)" }
            : undefined
        }
      >
        <div
          className={`flex-1 min-h-0 flex flex-col overflow-x-hidden ${
            bg === "map" ? "overflow-hidden" : "overflow-y-auto overscroll-y-contain"
          }`}
        >
          {children}
          {showLegal && bg !== "map" && <LegalFooter />}
        </div>
        {showNav && <BottomNav />}
      </div>
    </div>
  );
}
