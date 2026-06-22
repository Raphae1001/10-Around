import { useEffect, useState } from "react";
import { toast } from "sonner";
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

/** Listens for unanswered minyan_confirmations belonging to the user and prompts them. */
export function ConfirmationPrompt() {
  const { user } = useAuth();
  const [queue, setQueue] = useState<Pending[]>([]);
  const current = queue[0];

  // Fetch all pending confirmations for me
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
        { event: "INSERT", schema: "public", table: "minyan_confirmations", filter: `user_id=eq.${user.id}` },
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
      toast.error("Could not save your answer", { description: error.message });
      return;
    }
    if (current.role === "participant") {
      toast.success(value === "yes" ? "Trust +2 — thanks!" : "Got it");
    } else {
      toast.success(value === "yes" ? "Minyan confirmed started" : "Marked as not started");
    }
    setQueue((q) => q.slice(1));
  }

  if (!current) return null;

  const isOrganizer = current.role === "organizer";
  const title = isOrganizer ? "Did the minyan start?" : "Did you make it to the minyan?";
  const desc = isOrganizer
    ? `Confirm that "${current.address ?? "your minyan"}" started so attendees can be marked.`
    : `Be honest — your answer affects your trust score. Location: ${current.address ?? "—"}.`;

  return (
    <AlertDialog open onOpenChange={() => {}}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{desc}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => answer("no")}>No</AlertDialogCancel>
          <AlertDialogAction onClick={() => answer("yes")}>Yes</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
