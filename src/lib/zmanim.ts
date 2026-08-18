/**
 * Real halachic zmanim via kosher-zmanim (LGPL-3.0, TypeScript port of the
 * KosherJava library — https://github.com/BehindTheMath/KosherZmanim).
 *
 * "sepharade" intentionally reuses the same GRA-based sunrise/sunset
 * calculation as "ashkenaze" — there is no single codified, universally
 * accepted "Rav Ovadia Yosef" method in any open-source zmanim library, so
 * rather than fabricate one, both share the standard astronomical baseline
 * and only the label differs. "habad" uses the library's dedicated
 * Baal HaTanya methods, which are a real, distinct, natively supported
 * calculation (different sunrise/sunset definition, not just a relabeling).
 */
import { ComplexZmanimCalendar, GeoLocation } from "kosher-zmanim";
import { timezoneForCoords } from "@/lib/timezone";

export type ZmanimOpinion = "ashkenaze" | "sepharade" | "habad";

export type ZmanList = {
  alotHashachar: Date | null;
  netzHachama: Date | null;
  sofZmanShema: Date | null;
  sofZmanTefila: Date | null;
  chatzot: Date | null;
  minchaGedola: Date | null;
  minchaKetana: Date | null;
  plagHamincha: Date | null;
  shkiatHachama: Date | null;
  tzeitHakochavim: Date | null;
};

function toJsDate(d: { toJSDate?: () => Date } | Date | null): Date | null {
  if (!d) return null;
  if (d instanceof Date) return d;
  return d.toJSDate ? d.toJSDate() : null;
}

/**
 * Computes today's zmanim for a coordinate, per the chosen opinion.
 * `at` lets callers ask for a specific date (defaults to now); only the
 * date portion matters, the calendar always returns that day's zmanim.
 */
export function getZmanim(
  lat: number,
  lng: number,
  opinion: ZmanimOpinion,
  at: Date = new Date(),
): ZmanList {
  const tz = timezoneForCoords(lat, lng);
  const location = new GeoLocation("", lat, lng, 0, tz);
  const calendar = new ComplexZmanimCalendar(location);
  calendar.setDate(at);

  // The library's zero-arg TS overloads for getMinchaGedola/getMinchaKetana/
  // getPlagHamincha don't resolve correctly at the declared types (and
  // getSunrise/SetBaalHatanya are private) — pass sea-level sunrise/sunset
  // explicitly, matching the library's own documented default.
  const seaSunrise = calendar.getSeaLevelSunrise();
  const seaSunset = calendar.getSeaLevelSunset();

  if (opinion === "habad") {
    return {
      alotHashachar: toJsDate(calendar.getAlosBaalHatanya()),
      netzHachama: toJsDate(calendar.getSunrise()),
      sofZmanShema: toJsDate(calendar.getSofZmanShmaBaalHatanya()),
      sofZmanTefila: toJsDate(calendar.getSofZmanTfilaBaalHatanya()),
      chatzot: toJsDate(calendar.getChatzos()),
      minchaGedola: toJsDate(calendar.getMinchaGedolaBaalHatanya()),
      minchaKetana: toJsDate(calendar.getMinchaKetanaBaalHatanya()),
      plagHamincha: toJsDate(calendar.getPlagHaminchaBaalHatanya()),
      shkiatHachama: toJsDate(calendar.getSunset()),
      tzeitHakochavim: toJsDate(calendar.getTzaisBaalHatanya()),
    };
  }

  // ashkenaze + sepharade: same GRA-based astronomical baseline.
  return {
    alotHashachar: toJsDate(calendar.getAlos72()),
    netzHachama: toJsDate(calendar.getSunrise()),
    sofZmanShema: toJsDate(calendar.getSofZmanShmaGRA()),
    sofZmanTefila: toJsDate(calendar.getSofZmanTfilaGRA()),
    chatzot: toJsDate(calendar.getChatzos()),
    minchaGedola: toJsDate(calendar.getMinchaGedola(seaSunrise, seaSunset)),
    minchaKetana: toJsDate(calendar.getMinchaKetana(seaSunrise, seaSunset)),
    plagHamincha: toJsDate(calendar.getPlagHamincha(seaSunrise, seaSunset)),
    shkiatHachama: toJsDate(calendar.getSunset()),
    tzeitHakochavim: toJsDate(calendar.getTzais()),
  };
}

export type PrayerWindow = "shacharit" | "mincha" | "maariv";

/**
 * Real zmanim-based prayer window for the ad-hoc "Now" create flow — replaces
 * the rough solar-angle estimate in sun.ts for this one call site.
 * Shacharit: alot → chatzot. Mincha: chatzot → shkia. Maariv: shkia → alot.
 */
export function currentPrayerWindowZmanim(
  lat: number,
  lng: number,
  opinion: ZmanimOpinion,
  at: Date = new Date(),
): PrayerWindow {
  const z = getZmanim(lat, lng, opinion, at);
  if (!z.alotHashachar || !z.chatzot || !z.shkiatHachama) {
    // Extreme-latitude fallback where some zmanim don't resolve.
    const h = at.getHours();
    return h >= 5 && h < 12 ? "shacharit" : h < 18 ? "mincha" : "maariv";
  }
  const t = at.getTime();
  if (t >= z.alotHashachar.getTime() && t < z.chatzot.getTime()) return "shacharit";
  if (t >= z.chatzot.getTime() && t < z.shkiatHachama.getTime()) return "mincha";
  return "maariv";
}
