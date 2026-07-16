/// <reference types="google.maps" />
// Styles de carte MinyanNow — Section 1 (refonte design).
// Light = Mapbox Light / Streets (blanc cassé net, réseau routier lisible).
// Dark = Mapbox Dark (anthracite, routes gris claires très contrastées).
// Styling JSON Google Maps "legacy" (pas de mapId) — look Mapbox, reste sur Google.

type MapStyle = google.maps.MapTypeStyle[];

/** Light — Mapbox Light/Streets : fond blanc cassé, routes blanches + stroke, eau claire, parcs pastel. */
export const MAP_STYLE_LIGHT: MapStyle = [
  { elementType: "geometry", stylers: [{ color: "#f4f4f2" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#3d3d3d" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f4f4f2" }, { weight: 3 }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },

  { featureType: "administrative", elementType: "geometry", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#1a1a1a" }],
  },
  {
    featureType: "administrative.neighborhood",
    elementType: "labels.text.fill",
    stylers: [{ color: "#5c5c5c" }],
  },

  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#f4f4f2" }] },
  { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#ebebe9" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#f0f0ee" }] },

  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", stylers: [{ visibility: "on" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#dce9d6" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6a8568" }] },
  { featureType: "poi.park", elementType: "labels.icon", stylers: [{ visibility: "off" }] },

  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#d8d8d4" }, { weight: 0.9 }],
  },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#7a7a7a" }] },
  {
    featureType: "road",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#ffffff" }, { weight: 2.5 }],
  },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", elementType: "geometry.stroke", stylers: [{ color: "#cecec9" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#ececea" }] },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#c4c4be" }, { weight: 1.1 }],
  },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#555555" }] },
  { featureType: "road.local", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.local", elementType: "labels", stylers: [{ visibility: "simplified" }] },

  { featureType: "transit", stylers: [{ visibility: "off" }] },

  { featureType: "water", elementType: "geometry", stylers: [{ color: "#b9d2e5" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#6d8aa0" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#b9d2e5" }] },
];

/** Dark — Mapbox Dark : anthracite profond, routes gris clair très contrastées, eau noire. */
export const MAP_STYLE_DARK: MapStyle = [
  { elementType: "geometry", stylers: [{ color: "#121212" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#ebebeb" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#121212" }, { weight: 3 }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },

  { featureType: "administrative", elementType: "geometry", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f5f5f5" }],
  },
  {
    featureType: "administrative.neighborhood",
    elementType: "labels.text.fill",
    stylers: [{ color: "#b0b0b0" }],
  },

  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#121212" }] },
  { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#1a1a1a" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#101010" }] },

  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", stylers: [{ visibility: "on" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#152016" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#4f6248" }] },
  { featureType: "poi.park", elementType: "labels.icon", stylers: [{ visibility: "off" }] },

  // Routes franchement contrastées — clé Mapbox Dark premium
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#3f3f3f" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#2a2a2a" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#c8c8c8" }] },
  {
    featureType: "road",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#121212" }, { weight: 2 }],
  },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#555555" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#6e6e6e" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#4a4a4a" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f0f0f0" }] },
  { featureType: "road.local", elementType: "geometry", stylers: [{ color: "#2e2e2e" }] },
  { featureType: "road.local", elementType: "labels", stylers: [{ visibility: "simplified" }] },

  { featureType: "transit", stylers: [{ visibility: "off" }] },

  { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3a3a3a" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#000000" }] },
];

export function mapStyleForTheme(theme: "light" | "dark"): MapStyle {
  return theme === "dark" ? MAP_STYLE_DARK : MAP_STYLE_LIGHT;
}
