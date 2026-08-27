/// <reference types="google.maps" />
import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import type { Cluster } from "@googlemaps/markerclusterer";
import { useEffect, useRef, useState } from "react";
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

/** Blurred density zone — badge only (no geo radius rings). */
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
 * Map pin fills. "gold" (the default tone) always follows the live
 * --accent CSS variable — read live since these SVGs are detached data
 * URIs that Google's renderer draws outside the page's CSS cascade, so
 * var(--accent) inside them would never resolve. urgent/success/sky stay
 * fixed semantic colors regardless of theme.
 */
const toneColor: Record<Exclude<NonNullable<MapPinDatum["tone"]>, "gold">, string> = {
  urgent: "#A88B72",
  success: "#6E7F74",
  sky: "#7A8FA3",
};

/** Reads a CSS custom property's live value off <html> (theme-aware). */
function readCssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

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
  const fill = tone === "gold" ? readCssVar("--accent", "#C9A24A") : toneColor[tone];
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
  const accent = readCssVar("--accent", "#C25A2E");
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
        <circle cx="${(size + 8) / 2}" cy="${(size + 8) / 2}" r="${size / 2}" fill="#1a1a2e" stroke="${accent}" stroke-width="2.5"/>
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
          color: accent,
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
function ClusteredPins({ pins, theme }: { pins: MapPinDatum[]; theme: "light" | "dark" }) {
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

      // Recreated on theme change too — the renderer/icons bake in the
      // resolved accent color at creation time (detached SVG data URIs
      // can't read CSS vars live), so a stale clusterer would keep the
      // old theme's color until the next pins update.
      clustererRef.current?.clearMarkers();
      clustererRef.current = new MarkerClusterer({ map, renderer: makeClusterRenderer() });
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
  }, [map, pins, theme]);

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
      "position:relative;width:30px;height:30px;display:flex;align-items:center;justify-content:center;";

    /* Compact radial halo — ~75px radius. var(--accent) resolves live
       against the page's cascade (unlike the SVG data URIs above), so this
       tracks light/dark theme changes automatically without a re-render. */
    const halo = document.createElement("div");
    halo.style.cssText =
      "position:absolute;left:50%;top:50%;width:150px;height:150px;margin-left:-75px;margin-top:-75px;border-radius:9999px;pointer-events:none;background:radial-gradient(circle, color-mix(in oklch, var(--accent) 55%, transparent) 0%, color-mix(in oklch, var(--accent) 15%, transparent) 70%, transparent 100%);";

    const avatar = document.createElement("div");
    avatar.style.cssText =
      `position:relative;width:30px;height:30px;border-radius:9999px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:${INK_HEX};color:#fff;font-weight:700;font-size:11px;font-family:Inter,sans-serif;box-shadow:0 0 0 2px oklch(1 0 0), 0 4px 10px -3px oklch(0.2 0.02 250 / 0.35);`;

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

/** Deterministic 32-bit hash of a string, used to seed the per-zone PRNG. */
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Tiny seeded PRNG (mulberry32) — same seed always yields the same sequence. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DENSITY_DOTS_MAX = 20;
const DENSITY_DOTS_SPREAD_PX = 76;

/**
 * Display-only floor, separate from the server-side `density_min_threshold`
 * that decides whether a zone is aggregated/counted at all (shared by
 * zone_density and active_members_count, so it stays low for the textual
 * "N active members" count to stay useful with few users). A zone with
 * exactly one member scattered across a ~76px cloud is still a single,
 * fairly precisely-implied dot — don't draw it, even though the zone data
 * itself is still returned and still contributes to the text count.
 */
const DENSITY_DOTS_MIN_MEMBERS = 2;

/**
 * Scattered presence dots at a density zone's center — one small dot per
 * nearby member (capped), placed at a random (but seeded, so it doesn't
 * reshuffle on re-render) spot within the zone rather than at anyone's
 * real coordinates. The zone itself is already a blurred geohash cell, not
 * an exact location — this keeps the on-map visual from implying more
 * precision than the underlying data has.
 */
function DensityDotsOverlay({
  position,
  count,
  seed,
}: {
  position: { lat: number; lng: number };
  count: number;
  seed: string;
}) {
  const map = useMap();
  const overlayRef = useRef<HtmlOverlayHandle | null>(null);
  const dotsContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!map || typeof google === "undefined") return;

    const div = document.createElement("div");
    div.style.position = "absolute";
    div.style.transform = "translate(-50%, -50%)";
    div.style.pointerEvents = "none";
    div.style.zIndex = "40";

    const dots = document.createElement("div");
    dots.style.cssText = "position:relative;width:1px;height:1px;";
    div.appendChild(dots);
    dotsContainerRef.current = dots;

    const overlay = createHtmlOverlay(position, div);
    overlay.setMap(map);
    overlayRef.current = overlay;

    return () => {
      overlay.setMap(null);
      overlayRef.current = null;
      dotsContainerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  useEffect(() => {
    const container = dotsContainerRef.current;
    if (!container) return;
    container.innerHTML = "";
    const shown = Math.min(count, DENSITY_DOTS_MAX);
    const rand = mulberry32(hashString(seed));
    for (let i = 0; i < shown; i++) {
      const angle = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * DENSITY_DOTS_SPREAD_PX;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      const size = 8 + rand() * 4;
      const dot = document.createElement("div");
      dot.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${size}px;height:${size}px;margin-left:${-size / 2}px;margin-top:${-size / 2}px;border-radius:9999px;background:var(--accent);border:1.5px solid #fff;box-shadow:0 2px 6px color-mix(in oklch, var(--accent) 45%, transparent);opacity:${0.75 + rand() * 0.25};`;
      container.appendChild(dot);
    }
  }, [count, seed]);

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
  const [loadError, setLoadError] = useState<string | null>(null);

  // Google Maps calls this global when the key/referrer is rejected (RefererNotAllowedMapError).
  useEffect(() => {
    const previous = (window as Window & { gm_authFailure?: () => void }).gm_authFailure;
    (window as Window & { gm_authFailure?: () => void }).gm_authFailure = () => {
      const href = typeof window !== "undefined" ? window.location.href : "";
      const keyHint = API_KEY ? `…${API_KEY.slice(-4)}` : "missing";
      setLoadError(
        `RefererNotAllowedMapError. URL=${href} clé=${keyHint}. GCP → cette clé → Application restrictions = « Sites web » (PAS « apps iOS ») → ajoute capacitor://minyannow.app/* et *://minyannow.app/* → Enregistrer. Ou mets « Aucune » pour tester.`,
      );
    };
    return () => {
      (window as Window & { gm_authFailure?: () => void }).gm_authFailure = previous;
    };
  }, []);

  useEffect(() => {
    console.info("[GoogleMap] origin", window.location.href, "key…", API_KEY?.slice(-4));
  }, []);

  if (!API_KEY) {
    return (
      <div
        className={`flex items-center justify-center text-xs text-muted-foreground p-4 ${className}`}
      >
        Google Maps key missing.
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground p-6 ${className}`}
      >
        <p className="font-medium text-ink">Carte indisponible</p>
        <p className="max-w-sm break-words opacity-80">{loadError}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <APIProvider
        apiKey={API_KEY}
        onError={(error) => {
          const message =
            error instanceof Error
              ? error.message
              : typeof error === "string"
                ? error
                : "Google Maps JavaScript API failed to load";
          setLoadError(message);
          console.error("[GoogleMap]", error);
        }}
      >
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
          {densityHalos
            .filter((h) => (h.memberCount ?? 0) >= DENSITY_DOTS_MIN_MEMBERS)
            .map((h) => (
              <DensityDotsOverlay
                key={`dots-${h.id}`}
                position={{ lat: h.lat, lng: h.lng }}
                count={h.memberCount ?? 0}
                seed={h.id}
              />
            ))}
          {user && (
            <UserAvatarOverlay position={user} avatarUrl={userAvatarUrl} initial={userInitial} />
          )}
          <ClusteredPins pins={pins} theme={theme} />
        </Map>
      </APIProvider>
    </div>
  );
}
