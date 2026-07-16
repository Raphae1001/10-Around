/** Normalise a city label to the travel-city route key (matches stay_city_key SQL). */
export function stayCityKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
