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
