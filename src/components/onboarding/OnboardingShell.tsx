import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  footer?: ReactNode;
};

/** Shared layout for the sequential /auth onboarding steps. */
export function OnboardingShell({ children, footer }: Props) {
  return (
    <div className="min-h-dvh w-full bg-muted/40 flex items-stretch justify-center">
      <div className="relative w-full max-w-[440px] min-h-dvh bg-background flex flex-col">
        <div className="flex-1 flex flex-col px-8 pt-14 pb-6">{children}</div>
        {footer && <div className="px-6 pb-10 pt-4 shrink-0">{footer}</div>}
      </div>
    </div>
  );
}
