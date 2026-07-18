import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

/**
 * Minimal in-app legal footer. Renders under the BottomNav and provides
 * App Store / Google Play / GDPR-required links to Privacy, Terms, and
 * Support. Styled with existing tokens — no branding or color change.
 */
export function LegalFooter() {
  const { t } = useTranslation();
  return (
    <div className="px-4 pb-3 pt-1 flex items-center justify-center gap-3 text-[10px] text-muted-foreground">
      <Link to="/privacy" className="hover:text-foreground transition-colors">
        {t("common.privacy")}
      </Link>
      <span aria-hidden>·</span>
      <Link to="/terms" className="hover:text-foreground transition-colors">
        {t("common.terms")}
      </Link>
      <span aria-hidden>·</span>
      <Link to="/support" className="hover:text-foreground transition-colors">
        {t("common.support")}
      </Link>
    </div>
  );
}
