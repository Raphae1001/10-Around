import { useEffect } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type NotificationPayload = {
  kind: "minyan_confirmed_arriving" | "minyan_needs_decision" | "minyan_cancelled";
  data: { prayer?: string; address?: string } | null;
};

/**
 * Root-mounted: fires a toast the instant a street-minyan confirmation
 * notification lands for the signed-in user, wherever they are in the app.
 * Same subscribe-by-user-id pattern as ConfirmationPrompt.
 */
export function MinyanNotificationToast() {
  const { t } = useTranslation();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`user-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as NotificationPayload;
          const prayer = t(`prayer.${row.data?.prayer}`, {
            defaultValue: row.data?.prayer ?? "",
          });
          const place = row.data?.address ?? t("confirm.yourMinyan");

          if (row.kind === "minyan_confirmed_arriving") {
            toast.success(
              t("notifications.items.arrivingTitle", { defaultValue: "Minyan confirmed!" }),
              {
                description: t("notifications.items.arrivingBody", {
                  prayer,
                  place,
                  defaultValue: `${prayer} starting soon — meet at ${place}.`,
                }),
              },
            );
          } else if (row.kind === "minyan_needs_decision") {
            toast(
              t("notifications.items.decisionTitle", { defaultValue: "Minyan not confirmed yet" }),
              {
                description: t("notifications.items.decisionBody", {
                  prayer,
                  place,
                  defaultValue: `Not enough people yet for ${prayer} at ${place} — is there a minyan?`,
                }),
              },
            );
          } else {
            toast.error(
              t("notifications.items.cancelledTitle", { defaultValue: "Minyan cancelled" }),
              {
                description: t("notifications.items.cancelledBody", {
                  prayer,
                  place,
                  defaultValue: `${prayer} at ${place} was cancelled — not enough people joined in time.`,
                }),
              },
            );
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, t]);

  return null;
}
