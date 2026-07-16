import { useTranslation } from "react-i18next";
import { MapPin } from "lucide-react";
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
  onLater?: () => void;
  /** When false, hide the "Not now" dismiss (e.g. mandatory onboarding). Default true. */
  showLater?: boolean;
};

export function LocationPrimerDialog({
  open,
  onOpenChange,
  onAllow,
  onLater,
  showLater = true,
}: Props) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[340px]">
        <AlertDialogHeader>
          <div className="mx-auto mb-2 h-12 w-12 rounded-2xl bg-gold-soft dark:bg-gold/20 flex items-center justify-center text-gold">
            <MapPin className="h-6 w-6" />
          </div>
          <AlertDialogTitle className="text-center">
            {t("home.locationPrimer.title")}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-center text-sm text-muted-foreground">
              <p>{t("home.locationPrimer.body")}</p>
              <p className="text-xs">{t("home.locationPrimer.privacy")}</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <AlertDialogAction
            onClick={onAllow}
            className="w-full gold-gradient text-gold-foreground border-0"
          >
            {t("home.locationPrimer.allow")}
          </AlertDialogAction>
          {showLater && (
            <AlertDialogCancel onClick={onLater} className="w-full mt-0">
              {t("home.locationPrimer.later")}
            </AlertDialogCancel>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
