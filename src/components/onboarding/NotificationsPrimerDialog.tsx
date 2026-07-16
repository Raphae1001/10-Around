import { useTranslation } from "react-i18next";
import { Bell } from "lucide-react";
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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAllow: () => void;
  onSkip: () => void;
};

export function NotificationsPrimerDialog({ open, onOpenChange, onAllow, onSkip }: Props) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[340px]">
        <AlertDialogHeader>
          <div className="mx-auto mb-2 h-12 w-12 rounded-2xl bg-gold-soft dark:bg-gold/20 flex items-center justify-center text-gold">
            <Bell className="h-6 w-6" />
          </div>
          <AlertDialogTitle className="text-center">
            {t("auth.notificationsPrimer.title")}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-center text-sm text-muted-foreground">
              <p>{t("auth.notificationsPrimer.body")}</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <AlertDialogAction
            onClick={onAllow}
            className="w-full gold-gradient text-gold-foreground border-0"
          >
            {t("auth.notificationsPrimer.allow")}
          </AlertDialogAction>
          <AlertDialogCancel onClick={onSkip} className="w-full mt-0">
            {t("common.skip")}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
