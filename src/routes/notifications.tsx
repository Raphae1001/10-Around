import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader, LiveBadge, EmptyState } from "@/components/ui-bits";
import { AlertTriangle, Bell, CheckCircle2, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/notifications")({ component: Notifications });

type NotificationRow = {
  id: string;
  minyan_id: string | null;
  kind: "minyan_confirmed_arriving" | "minyan_needs_decision" | "minyan_cancelled";
  data: { prayer?: string; address?: string } | null;
  created_at: string;
};

function Notifications() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void supabase
      .from("user_notifications")
      .select("id, minyan_id, kind, data, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (cancelled) return;
        setRows((data as NotificationRow[]) ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <MobileFrame>
      <ScreenHeader
        title={t("notifications.title")}
        subtitle={t("notifications.subtitle")}
        right={<LiveBadge>{t("common.live")}</LiveBadge>}
      />

      <div className="px-6 space-y-3 pb-8">
        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            {t("common.loading")}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Bell}
            title={t("notifications.emptyTitle", { defaultValue: "No notifications yet" })}
            description={t("notifications.emptyDesc", {
              defaultValue: "You'll see updates here about minyanim you've joined.",
            })}
          />
        ) : (
          rows.map((n) => {
            const prayer = t(`prayer.${n.data?.prayer}`, {
              defaultValue: n.data?.prayer ?? "",
            });
            const place = n.data?.address ?? t("confirm.yourMinyan");
            const isCancelled = n.kind === "minyan_cancelled";
            const isDecision = n.kind === "minyan_needs_decision";
            const title = isCancelled
              ? t("notifications.items.cancelledTitle", { defaultValue: "Minyan cancelled" })
              : isDecision
                ? t("notifications.items.decisionTitle", { defaultValue: "Minyan not confirmed yet" })
                : t("notifications.items.arrivingTitle", { defaultValue: "Minyan confirmed!" });
            const body = isCancelled
              ? t("notifications.items.cancelledBody", {
                  prayer,
                  place,
                  defaultValue: `${prayer} at ${place} was cancelled — not enough people joined in time.`,
                })
              : isDecision
                ? t("notifications.items.decisionBody", {
                    prayer,
                    place,
                    defaultValue: `Not enough people yet for ${prayer} at ${place} — is there a minyan?`,
                  })
                : t("notifications.items.arrivingBody", {
                    prayer,
                    place,
                    defaultValue: `${prayer} starting soon — meet at ${place}.`,
                  });
            const Icon = isCancelled ? AlertTriangle : isDecision ? HelpCircle : CheckCircle2;
            const time = new Date(n.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={n.id}
                className={`rounded-2xl border p-4 shadow-soft ${isCancelled ? "border-urgent/30 bg-urgent/5" : "border-border bg-surface"}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 ${isCancelled ? "bg-urgent/10 text-urgent" : "gold-gradient text-gold-foreground"}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold leading-tight">{title}</h3>
                      <span className="text-[10px] text-muted-foreground shrink-0">{time}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-snug">{body}</p>
                    {n.minyan_id && !isCancelled && (
                      <div className="mt-3">
                        <Link
                          to="/minyan"
                          search={{ id: n.minyan_id }}
                          className="text-xs font-semibold rounded-xl px-3.5 py-2 bg-foreground text-background inline-block"
                        >
                          {t("notifications.items.viewMinyan", { defaultValue: "View" })}
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </MobileFrame>
  );
}
