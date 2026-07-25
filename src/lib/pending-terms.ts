/**
 * Bridges the terms-acceptance timestamp across a full-page OAuth redirect
 * (web only — native never unmounts, so React state survives there). Set
 * right when the user accepts terms in WelcomeTermsStep; consumed once,
 * either by auth.tsx's own finalize step (guest/native-OAuth) or by
 * auth.callback.tsx (web OAuth, which is a different mounted route).
 */
const KEY = "minyan:pending-terms-accepted-at";

export function setPendingTermsAcceptedAt(iso: string): void {
  try {
    sessionStorage.setItem(KEY, iso);
  } catch {
    /* sessionStorage unavailable — best effort only */
  }
}

export function takePendingTermsAcceptedAt(): string | null {
  try {
    const v = sessionStorage.getItem(KEY);
    if (v) sessionStorage.removeItem(KEY);
    return v;
  } catch {
    return null;
  }
}
