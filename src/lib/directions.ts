/** Opens turn-by-turn directions in the user's preferred maps app. */
export function openDirections(lat: number, lng: number, label?: string) {
  const dest = `${lat},${lng}`;
  // Universal Google Maps URL — iOS will offer Apple Maps / Google Maps app if installed.
  const url = `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=walking${
    label ? `&destination_place_id=${encodeURIComponent(label)}` : ""
  }`;
  window.open(url, "_blank");
}
