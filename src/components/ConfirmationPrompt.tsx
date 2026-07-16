import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type ConfirmationRow = {
  id: string;
  minyan_id: string;
  role: "organizer" | "participant";
  answer: "yes" | "no" | null;
};

type Pending = ConfirmationRow & { address: string | null };

export function ConfirmationPrompt() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [queue, setQueue] = useState<Pending[]>([]);
  const current = queue[0];

  useEffect(() => {
    if (!user) return;
    let alive = true;
    const load = async () => {
      const { data } = await (supabase as any)
        .from("minyan_confirmations")
        .select("id, minyan_id, role, answer, minyanim(address)")
        .eq("user_id", user.id)
        .is("answer", null);
      if (!alive || !data) return;
      setQueue(
        data.map((r: any) => ({
          id: r.id,
          minyan_id: r.minyan_id,
          role: r.role,
          answer: r.answer,
          address: r.minyanim?.address ?? null,
        })),
      );
    };
    load();
    const ch = supabase
      .channel(`confirmations-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "minyan_confirmations",
          filter: `user_id=eq.${user.id}`,
        },
        () => load(),
      )
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, [user]);

  async function answer(value: "yes" | "no") {
    if (!current) return;
    const { error } = await (supabase as any).rpc("answer_confirmation", {
      _minyan_id: current.minyan_id,
      _answer: value,
    });
    if (error) {
      toast.error(t("confirm.saveError"), { description: error.message });
      return;
    }
    if (current.role === "participant") {
      toast.success(value === "yes" ? t("confirm.trustPlus") : t("confirm.gotIt"));
    } else {
      toast.success(value === "yes" ? t("confirm.started") : t("confirm.notStarted"));
    }
    setQueue((q) => q.slice(1));
  }

  if (!current) return null;

  const isOrganizer = current.role === "organizer";
  const place = current.address ?? t("confirm.yourMinyan");
  const title = isOrganizer ? t("confirm.organizerTitle") : t("confirm.participantTitle");
  const desc = isOrganizer
    ? t("confirm.organizerDesc", { place })
    : t("confirm.participantDesc", { place });

  return (
    <AlertDialog open onOpenChange={() => {}}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{desc}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => answer("no")}>{t("common.no")}</AlertDialogCancel>
          <AlertDialogAction onClick={() => answer("yes")}>{t("common.yes")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
