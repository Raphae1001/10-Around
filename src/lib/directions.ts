/** Build all candidate direction URLs for a destination. */
export function buildDirectionsUrls(lat: number, lng: number, label?: string) {
  const dest = `${lat},${lng}`;
  const params = new URLSearchParams({ api: "1", destination: dest });
  if (label) params.set("destination_place_id", label);
  return {
    web: `https://www.google.com/maps/dir/?${params.toString()}`,
    iosGoogle: `comgooglemaps://?daddr=${dest}&directionsmode=driving`,
    iosApple: `maps://?daddr=${encodeURIComponent(dest)}`,
    androidGeo: `geo:${dest}?q=${dest}${label ? `(${encodeURIComponent(label)})` : ""}`,
  };
}

/** Opens turn-by-turn directions in the best available maps app. */
export function openDirections(lat: number, lng: number, label?: string) {
  if (typeof window === "undefined") return;
  const ua = navigator.userAgent || "";
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isAndroid = /android/i.test(ua);
  const urls = buildDirectionsUrls(lat, lng, label);

  if (isIOS) {
    const t = setTimeout(() => window.open(urls.iosApple, "_blank"), 500);
    window.location.href = urls.iosGoogle;
    setTimeout(() => { clearTimeout(t); window.open(urls.web, "_blank", "noopener,noreferrer"); }, 1500);
    return;
  }
  if (isAndroid) {
    window.location.href = urls.androidGeo;
    setTimeout(() => window.open(urls.web, "_blank", "noopener,noreferrer"), 1200);
    return;
  }
  window.open(urls.web, "_blank", "noopener,noreferrer");
}
