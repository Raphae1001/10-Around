import { useEffect } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type NotificationPayload = {
  kind: "grace_extended" | "minyan_cancelled";
  data: { prayer?: string; address?: string } | null;
};

/**
 * Root-mounted: fires a toast the instant a street-minyan grace/cancellation
 * notification lands for the signed-in user, wherever they are in the app.
 * Same subscribe-by-user-id pattern as ConfirmationPrompt.
 */
export function GraceNotificationToast() {
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

          if (row.kind === "minyan_cancelled") {
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
          } else {
            toast(
              t("notifications.items.graceExtendedTitle", {
                defaultValue: "Start delayed 10 min",
              }),
              {
                description: t("notifications.items.graceExtendedBody", {
                  prayer,
                  place,
                  defaultValue: `${prayer} at ${place} is starting 10 minutes later — still waiting for a minyan.`,
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
