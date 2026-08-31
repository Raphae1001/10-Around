/**
 * Launch gate: non-core / legacy prototype screens (old travel mockups,
 * synagogue finder, siddur, shabbat times, kaddish, the old /map, the
 * diagnostic /maps-test) stay in the codebase but are hidden from the
 * product. Flip to `true` to re-enable without deleting routes.
 */
export const LEGACY_SCREENS_ENABLED = false;

/**
 * Travel/Stay: signal a multi-day trip abroad (create-stay.tsx), see who
 * else is in that city for overlapping dates and join the city chat
 * (travel-city.$cityKey.tsx). Independent of LEGACY_SCREENS_ENABLED — this
 * is the real, Supabase-backed feature, not a prototype.
 */
export const TRAVEL_STAY_ENABLED = true;
