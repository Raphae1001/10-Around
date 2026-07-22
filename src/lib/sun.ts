/**
 * Solar elevation via the NOAA solar position formula — no network call,
 * no external service, works fully offline. Accurate to within a couple of
 * minutes around sunrise/sunset, which is plenty for a day/night UI switch.
 * Everything is computed from UTC clock fields, so device timezone never
 * enters the calculation — only latitude/longitude do.
 */
function solarElevationDeg(dateUtc: Date, lat: number, lng: number): number {
  const start = Date.UTC(dateUtc.getUTCFullYear(), 0, 0);
  const doy = Math.floor((dateUtc.getTime() - start) / 86_400_000);
  const hourFrac =
    dateUtc.getUTCHours() + dateUtc.getUTCMinutes() / 60 + dateUtc.getUTCSeconds() / 3600;
  const gamma = ((2 * Math.PI) / 365) * (doy - 1 + (hourFrac - 12) / 24);

  const eqtime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  const timeUtcMin = hourFrac * 60;
  const trueSolarTime = (((timeUtcMin + eqtime + 4 * lng) % 1440) + 1440) % 1440;
  const haDeg = trueSolarTime / 4 - 180;
  const ha = (haDeg * Math.PI) / 180;

  const latRad = (lat * Math.PI) / 180;
  let cosZenith = Math.sin(latRad) * Math.sin(decl) + Math.cos(latRad) * Math.cos(decl) * Math.cos(ha);
  cosZenith = Math.max(-1, Math.min(1, cosZenith));
  const zenithDeg = (Math.acos(cosZenith) * 180) / Math.PI;
  return 90 - zenithDeg;
}

/** -0.833° matches the conventional visual sunrise/sunset moment (atmospheric refraction + solar disc radius). */
const SUNSET_ELEVATION_DEG = -0.833;

/** True while the sun is above the horizon at this location, right now (or at `at`). */
export function isDaytime(lat: number, lng: number, at: Date = new Date()): boolean {
  return solarElevationDeg(at, lat, lng) > SUNSET_ELEVATION_DEG;
}

/** -16.1° ≈ 72 minutes before sunrise — the standard alot hashachar (halachic dawn) approximation. */
const ALOT_ELEVATION_DEG = -16.1;

/**
 * Declination/equation-of-time vary slowly over a day, so — like the NOAA
 * sunrise formula — we evaluate them once at local solar noon (hourFrac=12)
 * rather than at the exact instant, which keeps sunrise/sunset closed-form
 * (no iterative solve) while staying accurate to a couple of minutes.
 */
function solarCoeffsAtNoon(dateUtc: Date): { eqtime: number; decl: number } {
  const start = Date.UTC(dateUtc.getUTCFullYear(), 0, 0);
  const doy = Math.floor((dateUtc.getTime() - start) / 86_400_000);
  const gamma = ((2 * Math.PI) / 365) * (doy - 1);

  const eqtime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  return { eqtime, decl };
}

/** Minutes-since-UTC-midnight at which the sun crosses `elevationDeg`, plus solar noon. Null at extreme latitudes where it never does. */
function crossingTimesUtcMin(
  dateUtc: Date,
  lat: number,
  lng: number,
  elevationDeg: number,
): { rise: number; set: number; noon: number } | null {
  const { eqtime, decl } = solarCoeffsAtNoon(dateUtc);
  const latRad = (lat * Math.PI) / 180;
  const solarNoon = 720 - 4 * lng - eqtime;
  const cosH0 =
    (Math.sin((elevationDeg * Math.PI) / 180) - Math.sin(latRad) * Math.sin(decl)) /
    (Math.cos(latRad) * Math.cos(decl));
  if (cosH0 < -1 || cosH0 > 1) return null;
  const ha0Deg = (Math.acos(cosH0) * 180) / Math.PI;
  return { rise: solarNoon - 4 * ha0Deg, set: solarNoon + 4 * ha0Deg, noon: solarNoon };
}

export type PrayerWindow = "shacharit" | "mincha" | "maariv";

/**
 * Shacharit: alot hashachar (dawn) → chatzot (halachic midday, i.e. solar noon).
 * Mincha: chatzot → shkia (sunset). The gap most poskim call "mincha gedola"
 * (starting ~30–60 min after chatzot) has no separate bucket here — it's
 * folded into mincha since shacharit has already ended by chatzot.
 * Maariv: shkia → the next alot hashachar.
 */
export function currentPrayerWindow(
  lat: number,
  lng: number,
  at: Date = new Date(),
): PrayerWindow {
  const shkia = crossingTimesUtcMin(at, lat, lng, SUNSET_ELEVATION_DEG);
  const alot = crossingTimesUtcMin(at, lat, lng, ALOT_ELEVATION_DEG);
  if (!shkia || !alot) return isDaytime(lat, lng, at) ? "shacharit" : "maariv";

  const nowMin = at.getUTCHours() * 60 + at.getUTCMinutes() + at.getUTCSeconds() / 60;
  if (nowMin >= alot.rise && nowMin < shkia.noon) return "shacharit";
  if (nowMin >= shkia.noon && nowMin < shkia.set) return "mincha";
  return "maariv";
}
