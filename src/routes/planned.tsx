import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays, Globe2, Loader2, Plus } from "lucide-react";
import { MobileFrame } from "@/components/MobileFrame";
import { EmptyState, ScreenHeader } from "@/components/ui-bits";
import { PlannedMinyanRow } from "@/components/PlannedMinyanRow";
import { useAuth } from "@/hooks/use-auth";
import { usePlannedMinyanim } from "@/hooks/use-planned-minyanim";
import { tapLight } from "@/lib/haptics";

export const Route = createFileRoute("/planned")({
  component: Planned,
});

/** Gold pill CTA — same family as the map FAB (rounded-2xl, soft gold shadow). */
function CreatePillButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={() => {
        tapLight();
        onClick();
      }}
      className="inline-flex items-center justify-center gap-1.5 min-h-11 px-3.5 rounded-2xl gold-gradient text-gold-foreground text-xs font-semibold shadow-[0_4px_14px_-3px_rgba(212,165,55,0.45)] transition-transform active:scale-[0.96] active:opacity-90"
    >
      <Plus className="h-3.5 w-3.5" strokeWidth={2.8} />
      {label}
    </button>
  );
}

function PlannedSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="px-6 flex items-center justify-between gap-3 mb-3">
        <h2 className="text-[13px] font-semibold tracking-tight text-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Planned() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { scheduled, stays, loading } = usePlannedMinyanim();

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  return (
    <MobileFrame>
      <ScreenHeader title={t("planned.title")} subtitle={t("planned.subtitle")} />

      <div className="flex-1 overflow-y-auto overscroll-y-contain pb-6 pt-1">
        {loading && scheduled.length === 0 && stays.length === 0 ? (
          <div className="flex justify-center pt-16">
            <Loader2 className="h-6 w-6 animate-spin text-gold" />
          </div>
        ) : (
          <>
            <PlannedSection
              title={t("planned.scheduledSection")}
              action={
                <CreatePillButton
                  label={t("planned.addScheduled")}
                  onClick={() => navigate({ to: "/create-scheduled" })}
                />
              }
            >
              {scheduled.length > 0 ? (
                <div className="mx-6 rounded-2xl bg-surface border border-border overflow-hidden shadow-card">
                  {scheduled.map((m, idx) => (
                    <PlannedMinyanRow
                      key={m.id}
                      m={m}
                      variant="scheduled"
                      isLast={idx === scheduled.length - 1}
                    />
                  ))}
                </div>
              ) : (
                <div className="px-6 py-1">
                  <EmptyState icon={CalendarDays} title={t("planned.emptyScheduled")} />
                </div>
              )}
            </PlannedSection>

            <PlannedSection
              title={t("planned.staySection")}
              action={
                <CreatePillButton
                  label={t("planned.addStay")}
                  onClick={() => navigate({ to: "/create-stay" })}
                />
              }
            >
              {stays.length > 0 ? (
                <div className="mx-6 rounded-2xl bg-surface border border-border overflow-hidden shadow-card">
                  {stays.map((m, idx) => (
                    <PlannedMinyanRow
                      key={m.id}
                      m={m}
                      variant="stay"
                      isLast={idx === stays.length - 1}
                    />
                  ))}
                </div>
              ) : (
                <div className="px-6 py-1">
                  <EmptyState icon={Globe2} title={t("planned.emptyStay")} />
                </div>
              )}
            </PlannedSection>
          </>
        )}
      </div>
    </MobileFrame>
  );
}
