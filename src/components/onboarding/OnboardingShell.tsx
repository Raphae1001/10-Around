import type { ReactNode } from "react";
import { BRAND_BG } from "@/lib/brand";

type Props = {
  children: ReactNode;
  footer?: ReactNode;
};

/**
 * Shared layout for the sequential /auth onboarding steps. These steps use
 * the fixed, non-theme-adaptive brand palette (see src/lib/brand.ts), so the
 * shell itself must stay a fixed light background too — `bg-background`
 * would flip to near-black under dark mode while BRAND_TEXT stays fixed
 * dark, making the heading/subtitle unreadable.
 */
export function OnboardingShell({ children, footer }: Props) {
  return (
    <div
      className="min-h-dvh w-full flex items-stretch justify-center"
      style={{ backgroundColor: "#f0f0f2" }}
    >
      <div
        className="relative w-full max-w-[440px] min-h-dvh flex flex-col"
        style={{ backgroundColor: BRAND_BG }}
      >
        <div className="flex-1 flex flex-col px-8 pt-14 pb-6">{children}</div>
        {footer && <div className="px-6 pb-10 pt-4 shrink-0">{footer}</div>}
      </div>
    </div>
  );
}
