import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays, Loader2, Plane, Plus } from "lucide-react";
import { MobileFrame } from "@/components/MobileFrame";
import { EmptyState } from "@/components/ui-bits";
import { PlannedMinyanRow } from "@/components/PlannedMinyanRow";
import { useAuth } from "@/hooks/use-auth";
import { usePlannedMinyanim } from "@/hooks/use-planned-minyanim";
import { tapLight } from "@/lib/haptics";
import { LEGACY_SCREENS_ENABLED } from "@/lib/feature-flags";

export const Route = createFileRoute("/planned")({
  component: Planned,
});

function CreateTextButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={() => {
        tapLight();
        onClick();
      }}
      className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent active:opacity-70"
    >
      <Plus className="h-3.5 w-3.5" strokeWidth={2.8} />
      {label}
    </button>
  );
}

function PlannedSection({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="px-6 flex items-center justify-between gap-3 mb-1">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
          {title}
        </h2>
        {action}
      </div>
      {hint && <p className="px-6 text-[12px] text-ink-soft/80 mb-3 leading-snug">{hint}</p>}
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
      <div className="px-6 pt-2 pb-4">
        <h1 className="font-serif-brand text-[28px] text-ink leading-tight">{t("planned.title")}</h1>
        <p className="text-[13px] text-ink-soft mt-1">{t("planned.subtitle")}</p>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-y-contain pb-6 pt-1">
        {loading && scheduled.length === 0 && stays.length === 0 ? (
          <div className="flex justify-center pt-16">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        ) : (
          <>
            <PlannedSection
              title={t("planned.scheduledSection")}
              hint={t("planned.scheduledHint")}
              action={
                <CreateTextButton
                  label={t("planned.addScheduled")}
                  onClick={() => navigate({ to: "/create-scheduled" })}
                />
              }
            >
              {scheduled.length > 0 ? (
                <div className="mx-6 rounded-2xl bg-surface shadow-soft overflow-hidden">
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
                <div className="px-6">
                  <EmptyState
                    icon={CalendarDays}
                    title={t("planned.emptyScheduled")}
                    action={
                      <button
                        type="button"
                        onClick={() => {
                          tapLight();
                          navigate({ to: "/create-scheduled" });
                        }}
                        className="text-[13px] font-semibold text-accent active:opacity-70"
                      >
                        {t("planned.addScheduled")}
                      </button>
                    }
                  />
                </div>
              )}
            </PlannedSection>

            {(LEGACY_SCREENS_ENABLED || stays.length > 0) && (
              <PlannedSection
                title={t("planned.staySection")}
                hint={t("planned.travelHint")}
                action={
                  LEGACY_SCREENS_ENABLED ? (
                    <CreateTextButton
                      label={t("planned.addStay")}
                      onClick={() => navigate({ to: "/create-stay" })}
                    />
                  ) : undefined
                }
              >
                {stays.length > 0 ? (
                  <div className="mx-6 rounded-2xl bg-surface shadow-soft overflow-hidden">
                    {stays.map((m, idx) => (
                      <PlannedMinyanRow
                        key={m.id}
                        m={m}
                        variant="stay"
                        isLast={idx === stays.length - 1}
                        linkable={LEGACY_SCREENS_ENABLED}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="px-6">
                    <EmptyState
                      icon={Plane}
                      title={t("planned.emptyStay")}
                      action={
                        <button
                          type="button"
                          onClick={() => {
                            tapLight();
                            navigate({ to: "/create-stay" });
                          }}
                          className="text-[13px] font-semibold text-accent active:opacity-70"
                        >
                          {t("planned.addStay")}
                        </button>
                      }
                    />
                  </div>
                )}
              </PlannedSection>
            )}
          </>
        )}
      </div>
    </MobileFrame>
  );
}
