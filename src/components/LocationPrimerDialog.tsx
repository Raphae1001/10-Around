import { useTranslation } from "react-i18next";
import { MapPin } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Props = {
  open: boolean;
  /** The only way out: the system permission request always follows this screen. */
  onAllow: () => void;
};

export function LocationPrimerDialog({ open, onAllow }: Props) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-[340px] max-h-[85vh] overflow-y-auto">
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
            className="w-full bg-accent text-accent-foreground border-0 hover:bg-accent"
          >
            {t("home.locationPrimer.allow")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
