/** Opens turn-by-turn directions in Google Maps (or the OS-default maps app).
 *  Strategy:
 *   - iOS: try Google Maps app scheme (comgooglemaps://) first, fallback to Apple Maps.
 *   - Android: try geo: intent (lets the user pick Google Maps / Waze / etc.).
 *   - Desktop / fallback: open the universal Google Maps web URL.
 *  Some restrictive networks (school/office filters, strict ad-blockers) block
 *  www.google.com — there's nothing the app can do about that. */
export function openDirections(lat: number, lng: number, label?: string) {
  if (typeof window === "undefined") return;
  const dest = `${lat},${lng}`;
  const ua = navigator.userAgent || "";
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isAndroid = /android/i.test(ua);

  const params = new URLSearchParams({ api: "1", destination: dest });
  if (label) params.set("destination_place_id", label);
  const webUrl = `https://www.google.com/maps/dir/?${params.toString()}`;

  // On native installs, try app schemes first.
  if (isIOS) {
    const gmaps = `comgooglemaps://?daddr=${dest}&directionsmode=driving`;
    const apple = `maps://?daddr=${encodeURIComponent(dest)}`;
    // Try Google Maps app, fall back to Apple Maps then web after a short delay.
    const t = setTimeout(() => window.open(apple, "_blank"), 500);
    window.location.href = gmaps;
    setTimeout(() => { clearTimeout(t); window.open(webUrl, "_blank", "noopener,noreferrer"); }, 1500);
    return;
  }
  if (isAndroid) {
    const intent = `geo:${dest}?q=${dest}${label ? `(${encodeURIComponent(label)})` : ""}`;
    window.location.href = intent;
    setTimeout(() => window.open(webUrl, "_blank", "noopener,noreferrer"), 1200);
    return;
  }
  window.open(webUrl, "_blank", "noopener,noreferrer");
}
