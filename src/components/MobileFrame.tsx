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

function isNativeShell() {
  if (typeof window === "undefined") return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cap = (window as any).Capacitor;
  return !!cap?.isNativePlatform?.();
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
  const native = isNativeShell();

  return (
    <div
      className={`min-h-dvh w-full flex items-stretch justify-center ${
        native ? "bg-background" : "bg-muted/40"
      }`}
    >
      <div
        className={`relative w-full h-dvh max-h-dvh ${bgClass} ${className} flex flex-col overflow-hidden ${
          native
            ? ""
            : "max-w-[440px] sm:max-w-[440px] md:max-w-[440px] md:my-6 md:h-[calc(100dvh-3rem)] md:max-h-[calc(100dvh-3rem)] md:rounded-3xl md:shadow-2xl"
        }`}
      >
        <div
          className={`flex-1 min-h-0 flex flex-col overflow-x-hidden ${
            bg === "map"
              ? "overflow-hidden"
              : "overflow-y-auto overscroll-y-contain"
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
