/** Opens turn-by-turn directions in Google Maps (web or installed app).
 *  Uses the universal Maps URL — Google picks the best travel mode automatically,
 *  and on mobile the OS hands off to the Google Maps / Apple Maps app if installed. */
export function openDirections(lat: number, lng: number, label?: string) {
  const dest = `${lat},${lng}`;
  const params = new URLSearchParams({ api: "1", destination: dest });
  if (label) params.set("destination_place_id", label);
  // No travelmode param = Google Maps default (driving), user can switch in the UI.
  const url = `https://www.google.com/maps/dir/?${params.toString()}`;
  if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
}
