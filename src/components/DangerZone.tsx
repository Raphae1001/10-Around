import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { track } from "@/lib/analytics";
import { deleteAccountAndLeave, goToWelcomeAfterLeave, signOutAndLeave } from "@/lib/leave-account";
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

/** Sign-out + delete-account controls for /settings. `isAnonymous` is passed
 * in rather than read via useAuth() here, to avoid a second independent
 * auth-state subscription alongside the one Settings already holds. */
export function DangerZone({ isAnonymous }: { isAnonymous: boolean }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const signingOutRef = useRef(false);

  async function signOut() {
    // Guards a double-tap: navigation is instant now, so nothing else
    // disables the button in between the click and the route change.
    if (signingOutRef.current) return;
    signingOutRef.current = true;
    track("sign_out");
    try {
      await queryClient.cancelQueries();
    } catch {}
    try {
      queryClient.clear();
    } catch {}
    // Navigate first (client-side, no reload) so the account teardown keeps
    // running in the background instead of blocking the screen transition.
    navigate({ to: "/onboarding" });
    try {
      if (isAnonymous) {
        await deleteAccountAndLeave();
      } else {
        await signOutAndLeave();
      }
    } catch (e) {
      toast.error(t("common.couldNotSignOut"), { description: (e as Error).message });
    }
  }

  async function handleDelete() {
    if (confirmText !== "DELETE") return;
    setDeleting(true);
    const timeout = setTimeout(() => {
      setDeleting(false);
      toast.error(t("common.deleteTimedOut"));
    }, 20000);
    try {
      await deleteAccountAndLeave();
      track("delete_account");
      try {
        await queryClient.cancelQueries();
      } catch {}
      try {
        queryClient.clear();
      } catch {}
      clearTimeout(timeout);
      toast.success(t("common.accountDeleted"));
      goToWelcomeAfterLeave();
    } catch (e) {
      clearTimeout(timeout);
      toast.error(t("common.couldNotDeleteAccount"), { description: (e as Error).message });
      setDeleting(false);
    }
  }

  return (
    <>
      <button
        onClick={signOut}
        className="w-full text-center text-sm text-muted-foreground py-4 rounded-2xl border border-border bg-surface active:bg-muted/50 transition-colors"
      >
        {t("common.signOut")}
      </button>

      <button
        onClick={() => {
          setConfirmText("");
          setDeleteOpen(true);
        }}
        className="w-full flex items-center justify-center gap-2 text-center text-sm text-destructive py-4 rounded-2xl border border-destructive/30 bg-destructive/5 active:opacity-80 transition-opacity"
      >
        <Trash2 className="h-4 w-4" /> {t("settings.deleteAccount")}
      </button>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(v) => {
          if (!deleting) setDeleteOpen(v);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("settings.deleteAccountTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("settings.deleteAccountDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            disabled={deleting}
            className="w-full rounded-xl border border-border bg-surface p-3 text-sm outline-none focus:border-urgent"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmText !== "DELETE" || deleting}
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
              className="bg-urgent text-white hover:bg-urgent/90"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("settings.deleteForever")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
