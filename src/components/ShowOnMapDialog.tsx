import { useCallback, useRef, useState } from "react";
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

/**
 * Permission asked every time, right before a minyan or trip place is published:
 * that place (the creator's current position or the address they chose) becomes
 * visible to people nearby. The creator can decline and nothing is published.
 */
export function useShowOnMapConfirm() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const ask = useCallback(
    () =>
      new Promise<boolean>((resolve) => {
        resolver.current = resolve;
        setOpen(true);
      }),
    [],
  );

  const settle = (ok: boolean) => {
    setOpen(false);
    resolver.current?.(ok);
    resolver.current = null;
  };

  const dialog = (
    <AlertDialog open={open} onOpenChange={(next) => !next && settle(false)}>
      <AlertDialogContent className="max-w-[340px] max-h-[85vh] overflow-y-auto">
        <AlertDialogHeader>
          <div className="mx-auto mb-2 h-12 w-12 rounded-2xl bg-gold-soft dark:bg-gold/20 flex items-center justify-center text-gold">
            <MapPin className="h-6 w-6" />
          </div>
          <AlertDialogTitle className="text-center">{t("create.showOnMap.title")}</AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            {t("create.showOnMap.body")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <AlertDialogAction
            onClick={() => settle(true)}
            className="w-full bg-accent text-accent-foreground border-0 hover:bg-accent"
          >
            {t("create.showOnMap.confirm")}
          </AlertDialogAction>
          <AlertDialogCancel onClick={() => settle(false)} className="w-full mt-0">
            {t("create.showOnMap.cancel")}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { ask, dialog };
}
