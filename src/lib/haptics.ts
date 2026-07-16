import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

/** Light tap — row tap, button press. */
export const tapLight = () => Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});

/** Medium tap — pull-to-refresh trigger. */
export const tapMedium = () => Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});

/** Success — join confirmed. */
export const successHaptic = () =>
  Haptics.notification({ type: NotificationType.Success }).catch(() => {});
