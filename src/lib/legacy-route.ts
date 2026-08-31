import { redirect } from "@tanstack/react-router";
import { LEGACY_SCREENS_ENABLED, TRAVEL_STAY_ENABLED } from "@/lib/feature-flags";

/** Redirects to /home when legacy screens are gated off (launch focus). */
export function guardLegacyScreen() {
  if (!LEGACY_SCREENS_ENABLED) {
    throw redirect({ to: "/home" });
  }
}

/** Redirects to /home when the Travel/Stay flow is gated off. */
export function guardTravelStayScreen() {
  if (!TRAVEL_STAY_ENABLED) {
    throw redirect({ to: "/home" });
  }
}
