/// <reference types="google.maps" />
import { APIProvider, Circle, Map, useMap } from "@vis.gl/react-google-maps";
import type { Cluster } from "@googlemaps/markerclusterer";
import { Fragment, useEffect, useRef } from "react";
import { mapStyleForTheme } from "@/lib/map-styles";
import { tapLight } from "@/lib/haptics";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY as
  string | undefined;

const TARGET_ZOOM = 15;
const ARRIVAL_START_ZOOM = 11;
const ARRIVAL_DURATION_MS = 1100;

export type MapPinDatum = {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  tone?: "gold" | "urgent" | "success" | "sky";
  onClick?: () => void;
};

/** Blurred density halo — no label, intensity drives opacity/size only. */
export type DensityHalo = {
  id: string;
  lat: number;
  lng: number;
  /** 0–1 normalised member density for this zone */
  intensity: number;
  /** Raw member count, shown in the floating count badge. */
  memberCount?: number;
};

/**
 * Map pin fills — same family as --gold / --urgent / --success, but desaturated
 * so they stay sober next to the navy–gold UI (no Material / coral / teal pop).
 */
const toneColor: Record<NonNullable<MapPinDatum["tone"]>, string> = {
  gold: "#C9A24A",
  urgent: "#A88B72",
  success: "#6E7F74",
  sky: "#7A8FA3",
};

/** Navy label on every tone — same typography treatment as gold / avatar. */
const PIN_LABEL = "#1A1A2E";

type HtmlOverlayHandle = google.maps.OverlayView & {
  setPosition(position: google.maps.LatLngLiteral): void;
};

/**
 * Creates an OverlayView only after the Maps JS API is loaded.
 * Must NOT extend google.maps.OverlayView at module scope — google is undefined
 * until APIProvider finishes loading the script.
 */
function createHtmlOverlay(
  position: google.maps.LatLngLiteral,
  div: HTMLDivElement,
): HtmlOverlayHandle {
  class Overlay extends google.maps.OverlayView {
    private pos: google.maps.LatLngLiteral;
    private readonly el: HTMLDivElement;

    constructor(pos: google.maps.LatLngLiteral, el: HTMLDivElement) {
      super();
      this.pos = pos;
      this.el = el;
    }

    onAdd() {
      this.getPanes()?.overlayMouseTarget.appendChild(this.el);
    }

    draw() {
      const proj = this.getProjection();
      if (!proj) return;
      const point = proj.fromLatLngToDivPixel(new google.maps.LatLng(this.pos));
      if (point) {
        this.el.style.left = `${point.x}px`;
        this.el.style.top = `${point.y}px`;
      }
    }

    onRemove() {
      this.el.parentNode?.removeChild(this.el);
    }

    setPosition(pos: google.maps.LatLngLiteral) {
      this.pos = pos;
      this.draw();
    }
  }

  return new Overlay(position, div);
}

function Recenter({
  center,
  nonce = 0,
}: {
  center: { lat: number; lng: number } | null;
  nonce?: number;
}) {
  const map = useMap();
  const firstRef = useRef(true);
  useEffect(() => {
    if (!map || !center) return;
    if (firstRef.current) {
      firstRef.current = false;
      if (nonce === 0) return;
    }
    map.panTo(center);
  }, [map, center, nonce]);
  return null;
}

/** Applique le style custom selon le thème de l'app (dark mode dédié). */
function ThemeStyler({ theme }: { theme: "light" | "dark" }) {
  const map = useMap();
  useEffect(() => {
    if (map) map.setOptions({ styles: mapStyleForTheme(theme) });
  }, [map, theme]);
  return null;
}

/**
 * Animation d'arrivée : zoom-in progressif (eased) centré sur l'utilisateur au
 * premier chargement, une seule fois. Utilise setCenter/setZoom (API universelle).
 */
function ArrivalZoom({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();
  const doneRef = useRef(false);
  useEffect(() => {
    if (!map || doneRef.current) return;
    doneRef.current = true;

    map.setCenter(center);
    map.setZoom(ARRIVAL_START_ZOOM);

    const start = performance.now();
    let raf = 0;
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ARRIVAL_DURATION_MS);
      const zoom = ARRIVAL_START_ZOOM + (TARGET_ZOOM - ARRIVAL_START_ZOOM) * easeOutCubic(t);
      map.setZoom(zoom);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  return null;
}

/**
 * Round pastille pin — identical treatment for every tone (matches user avatar ring):
 * soft drop shadow, 2.5px white stroke, same size; only fill color varies.
 * Count is baked into the SVG so Google's Marker label can't diverge per tone.
 */
function pinIcon(tone: NonNullable<MapPinDatum["tone"]>, label?: string) {
  const fill = toneColor[tone];
  const size = 40;
  const r = 15;
  const fid = `pin-shadow-${tone}`;
  const count = label
    ? `<text x="${size / 2}" y="${size / 2 + 0.5}" text-anchor="middle" dominant-baseline="central" fill="${PIN_LABEL}" font-family="Inter,system-ui,sans-serif" font-size="13" font-weight="800">${label}</text>`
    : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <filter id="${fid}" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="2" stdDeviation="2.4" flood-color="#000000" flood-opacity="0.32"/>
      </filter>
    </defs>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="${fill}" stroke="#ffffff" stroke-width="2.5" filter="url(#${fid})"/>
    ${count}
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function makeClusterRenderer() {
  return {
    render(cluster: Cluster) {
      const { count, position } = cluster;
      const size = count < 10 ? 42 : count < 50 ? 50 : 58;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size + 8}" height="${size + 8}" viewBox="0 0 ${size + 8} ${size + 8}">
      <defs>
        <filter id="s" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#000" flood-opacity="0.3"/>
        </filter>
      </defs>
      <g filter="url(#s)">
        <circle cx="${(size + 8) / 2}" cy="${(size + 8) / 2}" r="${size / 2}" fill="#1a1a2e" stroke="#C25A2E" stroke-width="2.5"/>
      </g>
    </svg>`;
      return new google.maps.Marker({
        position,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
          scaledSize: new google.maps.Size(size + 8, size + 8),
          anchor: new google.maps.Point((size + 8) / 2, (size + 8) / 2),
          labelOrigin: new google.maps.Point((size + 8) / 2, (size + 8) / 2),
        },
        label: {
          text: String(count),
          color: "#C25A2E",
          fontSize: "13px",
          fontWeight: "800",
        },
        zIndex: 1000 + count,
      });
    },
  };
}

/**
 * Couche pins clusterisée — import dynamique du clusterer (évite crash SSR/CJS)
 * et ne s'exécute qu'une fois google.maps disponible via useMap().
 */
function ClusteredPins({ pins }: { pins: MapPinDatum[] }) {
  const map = useMap();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clustererRef = useRef<any>(null);

  useEffect(() => {
    if (!map || typeof google === "undefined") return;

    let cancelled = false;

    void (async () => {
      const mod = await import("@googlemaps/markerclusterer");
      if (cancelled) return;

      const MarkerClusterer = mod.MarkerClusterer ?? mod.default?.MarkerClusterer;
      if (!MarkerClusterer) return;

      if (!clustererRef.current) {
        clustererRef.current = new MarkerClusterer({ map, renderer: makeClusterRenderer() });
      }
      const clusterer = clustererRef.current;

      const markers = pins.map((p) => {
        const tone = p.tone ?? "gold";
        const marker = new google.maps.Marker({
          position: { lat: p.lat, lng: p.lng },
          icon: {
            url: pinIcon(tone, p.label),
            scaledSize: new google.maps.Size(40, 40),
            anchor: new google.maps.Point(20, 20),
          },
          // Count is drawn inside the SVG — no Google Label overlay.
        });
        if (p.onClick) {
          marker.addListener("click", () => {
            void tapLight();
            p.onClick?.();
          });
        }
        return marker;
      });

      clusterer.clearMarkers();
      clusterer.addMarkers(markers);
    })();

    return () => {
      cancelled = true;
      clustererRef.current?.clearMarkers();
    };
  }, [map, pins]);

  useEffect(() => {
    return () => {
      clustererRef.current?.clearMarkers();
      clustererRef.current = null;
    };
  }, []);

  return null;
}

/** Brand accent as hex for Google Maps APIs that don't accept oklch. */
const INK_HEX = "#1C1F2A";

/** User's own avatar (or initial) marker — ink disc, white ring, compact radial halo. */
function UserAvatarOverlay({
  position,
  avatarUrl,
  initial,
}: {
  position: { lat: number; lng: number };
  avatarUrl?: string | null;
  initial: string;
}) {
  const map = useMap();
  const overlayRef = useRef<HtmlOverlayHandle | null>(null);
  const avatarImgRef = useRef<HTMLImageElement | null>(null);
  const initialRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!map || typeof google === "undefined") return;

    const div = document.createElement("div");
    div.style.position = "absolute";
    div.style.transform = "translate(-50%, -50%)";
    div.style.pointerEvents = "none";
    div.style.zIndex = "50";

    const wrap = document.createElement("div");
    wrap.style.cssText =
      "position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;";

    /* Compact radial halo — ~95px radius */
    const halo = document.createElement("div");
    halo.style.cssText =
      "position:absolute;left:50%;top:50%;width:190px;height:190px;margin-left:-95px;margin-top:-95px;border-radius:9999px;pointer-events:none;background:radial-gradient(circle, oklch(0.6 0.135 38 / 0.55) 0%, oklch(0.6 0.135 38 / 0.15) 70%, oklch(0.6 0.135 38 / 0) 100%);";

    const avatar = document.createElement("div");
    avatar.style.cssText =
      `position:relative;width:44px;height:44px;border-radius:9999px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:${INK_HEX};color:#fff;font-weight:700;font-size:15px;font-family:Inter,sans-serif;box-shadow:0 0 0 3px oklch(1 0 0), 0 6px 14px -4px oklch(0.2 0.02 250 / 0.35);`;

    if (avatarUrl) {
      const img = document.createElement("img");
      img.src = avatarUrl;
      img.alt = "";
      img.style.cssText = "width:100%;height:100%;object-fit:cover;";
      avatar.appendChild(img);
      avatarImgRef.current = img;
      initialRef.current = null;
    } else {
      const span = document.createElement("span");
      span.textContent = initial;
      avatar.appendChild(span);
      initialRef.current = span;
      avatarImgRef.current = null;
    }

    wrap.appendChild(halo);
    wrap.appendChild(avatar);
    div.appendChild(wrap);

    const overlay = createHtmlOverlay(position, div);
    overlay.setMap(map);
    overlayRef.current = overlay;

    return () => {
      overlay.setMap(null);
      overlayRef.current = null;
      avatarImgRef.current = null;
      initialRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  useEffect(() => {
    if (!avatarUrl && initialRef.current) initialRef.current.textContent = initial;
    if (avatarUrl && avatarImgRef.current && avatarImgRef.current.src !== avatarUrl) {
      avatarImgRef.current.src = avatarUrl;
    }
  }, [avatarUrl, initial]);

  useEffect(() => {
    overlayRef.current?.setPosition(position);
  }, [position.lat, position.lng, position]);

  return null;
}

/** Soft CSS radial bloom over geo Circles — breathes without React re-renders. */
function DensityHaloBloom({
  position,
  intensity,
}: {
  position: { lat: number; lng: number };
  intensity: number;
}) {
  const map = useMap();
  const overlayRef = useRef<HtmlOverlayHandle | null>(null);

  useEffect(() => {
    if (!map || typeof google === "undefined") return;

    const size = Math.round(120 + intensity * 100);
    const alpha = 0.22 + intensity * 0.35;

    const div = document.createElement("div");
    div.style.position = "absolute";
    div.style.transform = "translate(-50%, -50%)";
    div.style.pointerEvents = "none";
    div.style.zIndex = "20";

    const bloom = document.createElement("div");
    bloom.className = "breathe-density";
    bloom.style.cssText = [
      `width:${size}px`,
      `height:${size}px`,
      "border-radius:9999px",
      `background:radial-gradient(circle, oklch(0.6 0.135 38 / ${alpha}) 0%, oklch(0.6 0.135 38 / ${alpha * 0.45}) 38%, oklch(0.6 0.135 38 / 0) 72%)`,
    ].join(";");

    div.appendChild(bloom);

    const overlay = createHtmlOverlay(position, div);
    overlay.setMap(map);
    overlayRef.current = overlay;

    return () => {
      overlay.setMap(null);
      overlayRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, intensity]);

  useEffect(() => {
    overlayRef.current?.setPosition(position);
  }, [position.lat, position.lng, position]);

  return null;
}

/** Floating count badge at a density halo's center — small pill with a people glyph + number. */
function DensityCountBadge({
  position,
  count,
}: {
  position: { lat: number; lng: number };
  count: number;
}) {
  const map = useMap();
  const overlayRef = useRef<HtmlOverlayHandle | null>(null);
  const countRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!map || typeof google === "undefined") return;

    const div = document.createElement("div");
    div.style.position = "absolute";
    div.style.transform = "translate(-50%, -50%)";
    div.style.pointerEvents = "none";
    div.style.zIndex = "40";

    const wrap = document.createElement("div");
    wrap.style.cssText =
      "position:relative;display:flex;align-items:center;justify-content:center;";

    const disc = document.createElement("div");
    disc.style.cssText =
      "position:relative;display:flex;align-items:center;justify-content:center;min-width:36px;height:36px;padding:0 10px;border-radius:9999px;background:oklch(0.6 0.135 38);box-shadow:0 4px 14px oklch(0.6 0.135 38 / 0.45);border:2px solid #fff;";

    const countEl = document.createElement("span");
    countEl.style.cssText =
      "font-family:Fraunces,Georgia,serif;font-size:15px;font-weight:600;color:#fff;line-height:1;letter-spacing:-0.02em;";
    countEl.textContent = String(count);
    disc.appendChild(countEl);
    countRef.current = countEl;

    wrap.appendChild(disc);
    div.appendChild(wrap);

    const overlay = createHtmlOverlay(position, div);
    overlay.setMap(map);
    overlayRef.current = overlay;

    return () => {
      overlay.setMap(null);
      overlayRef.current = null;
      countRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  useEffect(() => {
    if (countRef.current) countRef.current.textContent = String(count);
  }, [count]);

  useEffect(() => {
    overlayRef.current?.setPosition(position);
  }, [position.lat, position.lng, position]);

  return null;
}

export function GoogleMapCanvas({
  center,
  user,
  userAvatarUrl,
  userInitial = "?",
  pins = [],
  densityHalos = [],
  theme = "light",
  recenterNonce = 0,
  className = "",
}: {
  center: { lat: number; lng: number };
  user?: { lat: number; lng: number } | null;
  userAvatarUrl?: string | null;
  userInitial?: string;
  pins?: MapPinDatum[];
  densityHalos?: DensityHalo[];
  theme?: "light" | "dark";
  /** Bump to force pan-to-user even if coords unchanged. */
  recenterNonce?: number;
  className?: string;
}) {
  if (!API_KEY) {
    return (
      <div
        className={`flex items-center justify-center text-xs text-muted-foreground p-4 ${className}`}
      >
        Google Maps key missing.
      </div>
    );
  }
  return (
    <div className={className}>
      <APIProvider apiKey={API_KEY}>
        <Map
          defaultCenter={center}
          defaultZoom={ARRIVAL_START_ZOOM}
          gestureHandling="greedy"
          disableDefaultUI
          clickableIcons={false}
          styles={mapStyleForTheme(theme)}
          style={{ width: "100%", height: "100%" }}
        >
          <ThemeStyler theme={theme} />
          <ArrivalZoom center={center} />
          <Recenter center={center} nonce={recenterNonce} />
          {densityHalos.map((h) => {
            const outer = Math.round(520 + h.intensity * 280);
            const mid = Math.round(300 + h.intensity * 160);
            const inner = Math.round(150 + h.intensity * 90);
            return (
              <Fragment key={h.id}>
                <Circle
                  center={{ lat: h.lat, lng: h.lng }}
                  radius={outer}
                  fillColor="#C25A2E"
                  fillOpacity={0.03 + h.intensity * 0.06}
                  strokeOpacity={0}
                  clickable={false}
                />
                <Circle
                  center={{ lat: h.lat, lng: h.lng }}
                  radius={mid}
                  fillColor="#C25A2E"
                  fillOpacity={0.07 + h.intensity * 0.14}
                  strokeOpacity={0}
                  clickable={false}
                />
                <Circle
                  center={{ lat: h.lat, lng: h.lng }}
                  radius={inner}
                  fillColor="#C25A2E"
                  fillOpacity={0.12 + h.intensity * 0.28}
                  strokeColor="#C25A2E"
                  strokeOpacity={0.2 + h.intensity * 0.3}
                  strokeWeight={1}
                  clickable={false}
                />
                <DensityHaloBloom position={{ lat: h.lat, lng: h.lng }} intensity={h.intensity} />
              </Fragment>
            );
          })}
          {densityHalos
            .filter((h) => (h.memberCount ?? 0) > 0)
            .map((h) => (
              <DensityCountBadge
                key={`badge-${h.id}`}
                position={{ lat: h.lat, lng: h.lng }}
                count={h.memberCount ?? 0}
              />
            ))}
          {user && (
            <UserAvatarOverlay position={user} avatarUrl={userAvatarUrl} initial={userInitial} />
          )}
          <ClusteredPins pins={pins} />
        </Map>
      </APIProvider>
    </div>
  );
}
