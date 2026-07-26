import tzLookup from "tz-lookup";

/**
 * Resolves the IANA timezone (e.g. "Asia/Jerusalem") for a coordinate,
 * entirely client-side — no network call.
 */
export function timezoneForCoords(lat: number, lng: number): string {
  return tzLookup(lat, lng);
}

/**
 * Converts a "YYYY-MM-DDTHH:mm"-shaped local wall-clock string into the
 * correct UTC instant *for a given IANA timezone* — not the device's own
 * timezone, which is what `new Date(dateTimeLocal)` would otherwise use.
 *
 * Standard Intl-based technique: format a guess instant in the target zone,
 * measure the offset between what that prints and what we wanted, and
 * correct for it. One correction pass is enough except right at a DST
 * transition, so we iterate twice to converge.
 */
export function zonedTimeToUtc(dateTimeLocal: string, timeZone: string): Date {
  const [datePart, timePart] = dateTimeLocal.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const wantedUtcMs = Date.UTC(year, month - 1, day, hour, minute);

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  function offsetMs(guessUtcMs: number): number {
    const parts = formatter.formatToParts(new Date(guessUtcMs));
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    const asIfUtc = Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour"),
      get("minute"),
      get("second"),
    );
    return asIfUtc - guessUtcMs;
  }

  // Each pass re-anchors to the original wanted wall-clock time, not the
  // previous guess — chaining `guess -= offsetMs(guess)` would double-count
  // a stable (non-DST-boundary) offset instead of converging to it.
  let guess = wantedUtcMs;
  guess = wantedUtcMs - offsetMs(guess);
  guess = wantedUtcMs - offsetMs(guess); // second pass to settle DST-boundary edge cases
  return new Date(guess);
}
