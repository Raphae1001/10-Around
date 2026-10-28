import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, LocateFixed, Moon, SunMedium, X } from "lucide-react";
import { MobileFrame } from "@/components/MobileFrame";
import { Wordmark } from "@/components/Logo";
import { GoogleMapCanvas, type MapPinDatum } from "@/components/GoogleMap";
import { LocationPrimerDialog } from "@/components/LocationPrimerDialog";
import { HomePresenceCard } from "@/components/HomePresenceCard";
import { LocationOffCard } from "@/components/LocationOffCard";
import { HomeNearbyList } from "@/components/HomeNearbyList";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useBlockedUsers } from "@/hooks/use-blocked-users";
import { usePresence } from "@/hooks/use-presence";
import { useNearbyMinyanim } from "@/hooks/use-minyanim";
import { supabase } from "@/integrations/supabase/client";
import { tapLight } from "@/lib/haptics";
import { getAppPref, setAppPref } from "@/lib/app-prefs";
import { isLiveOnMap, isNearbySoon, minyanStartMs } from "@/lib/minyan-live";
import {
  checkLocationPermission,
  openAppSettings,
  requestLocationPermission,
  type LocationPermissionState,
} from "@/lib/native";

export const Route = createFileRoute("/home")({
  ssr: false,
  component: Home,
});

const PRIMER_SEEN_KEY = "minyan:location-primer-seen";
const FALLBACK_CENTER = { lat: 32.0853, lng: 34.7818 };

/** Nearby list sheet — never full-screen; map stays visible. */
type ListSheet = "closed" | "peek" | "half" | "tall";
const LIST_SHEET_HEIGHT: Record<Exclude<ListSheet, "closed">, string> = {
  peek: "min(38vh, 300px)",
  half: "52vh",
  tall: "68vh",
};
const LIST_SHEET_ORDER: Exclude<ListSheet, "closed">[] = ["peek", "half", "tall"];

function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const { position, loading: geoLoading, request: requestGeo } = useGeolocation(false);
  const { data: allMinyanim } = useNearbyMinyanim(position, 5000);
  const { blockedIds } = useBlockedUsers(user?.id);
  const minyanim = useMemo(
    () => allMinyanim.filter((m) => isLiveOnMap(m) && !blockedIds.has(m.creator_id)),
    [allMinyanim, blockedIds],
  );
  const { refresh: refreshPresence } = usePresence(position, !!user, user?.id);
  const [firstName, setFirstName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [primerOpen, setPrimerOpen] = useState(false);
  const [permState, setPermState] = useState<LocationPermissionState | null>(null);
  const [listSheet, setListSheet] = useState<ListSheet>("closed");
  const [recenterNonce, setRecenterNonce] = useState(0);
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNowTick(Date.now()), 15_000);
    return () => clearInterval(i);
  }, []);
  /** "N minyanim near you": live now or starting within the hour, within 1 km. */
  const nearbySoon = useMemo(
    () => (position ? minyanim.filter((m) => isNearbySoon(m, position, nowTick)) : []),
    [minyanim, position, nowTick],
  );
  const pendingCreateRef = useRef(false);
  const allowingRef = useRef(false);
  const listDragStartY = useRef<number | null>(null);
  const listDragStartState = useRef<Exclude<ListSheet, "closed">>("peek");

  const openListSheet = useCallback(() => {
    void tapLight();
    setListSheet("peek");
  }, []);

  const closeListSheet = useCallback(() => {
    setListSheet("closed");
  }, []);

  const onListSheetDragStart = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (listSheet === "closed") return;
      listDragStartY.current = e.clientY;
      listDragStartState.current = listSheet;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [listSheet],
  );

  const onListSheetDragEnd = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (listDragStartY.current == null) return;
    const dy = e.clientY - listDragStartY.current;
    listDragStartY.current = null;
    const from = listDragStartState.current;
    const idx = LIST_SHEET_ORDER.indexOf(from);
    if (dy < -48) {
      setListSheet(LIST_SHEET_ORDER[Math.min(idx + 1, LIST_SHEET_ORDER.length - 1)]);
    } else if (dy > 48) {
      if (idx <= 0) setListSheet("closed");
      else setListSheet(LIST_SHEET_ORDER[idx - 1]);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("get_my_profile").then(({ data }) => {
      const row = Array.isArray(data) ? data[0] : data;
      if (row?.first_name) setFirstName(row.first_name as string);
      if (row?.avatar_url) setAvatarUrl(row.avatar_url as string);
    });
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    void (async () => {
      const perm = await checkLocationPermission();
      setPermState(perm);
      if (perm === "granted") {
        void requestGeo();
        return;
      }
      const seen = await getAppPref(PRIMER_SEEN_KEY);
      if (!seen) setPrimerOpen(true);
    })();
  }, [requestGeo]);

  const goToCreate = useCallback(() => {
    navigate({ to: "/create", search: { from: "map" } });
  }, [navigate]);

  const [refreshingPos, setRefreshingPos] = useState(false);
  const refreshPosition = useCallback(async () => {
    void tapLight();
    setRefreshingPos(true);
    try {
      await requestGeo();
      await refreshPresence();
      setRecenterNonce((n) => n + 1);
    } finally {
      setRefreshingPos(false);
    }
  }, [requestGeo, refreshPresence]);

  const handlePrimerAllow = useCallback(async () => {
    allowingRef.current = true;
    await setAppPref(PRIMER_SEEN_KEY, "1");
    setPrimerOpen(false);
    const ok = await requestLocationPermission();
    setPermState(ok ? "granted" : "denied");
    if (ok) await requestGeo();
    if (pendingCreateRef.current) {
      pendingCreateRef.current = false;
      goToCreate();
    }
    allowingRef.current = false;
  }, [requestGeo, goToCreate]);

  const handlePrimerLater = useCallback(() => {
    void setAppPref(PRIMER_SEEN_KEY, "1");
    setPrimerOpen(false);
    pendingCreateRef.current = false;
  }, []);

  const center = position ?? FALLBACK_CENTER;
  // nowTick ticks every 15s (see effect above), but the arrival countdown
  // label only has minute granularity and only exists for minyanim actively
  // in their 10-min arrival window. Without this, `pins` — and therefore
  // every Google Maps marker plus the whole MarkerClusterer, which
  // ClusteredPins fully recreates whenever `pins` gets a new reference —
  // would get rebuilt every 15s regardless of whether anything on the map
  // actually changed. Keying off a value that only changes when an arrival
  // countdown is actually running (and even then only once a minute) makes
  // `pins` reuse the same reference the rest of the time.
  const arrivalTick = minyanim.some(
    (m) => m.arrival_deadline != null && new Date(m.arrival_deadline).getTime() > nowTick,
  )
    ? Math.floor(nowTick / 60_000)
    : 0;

  const pins: MapPinDatum[] = useMemo(
    () =>
      minyanim.map((m) => {
        const present = m.present_count ?? 1;
        // Confirmed street minyan in its 10-min arrival window — surface the
        // countdown on the pin itself, visible even to non-participants.
        const arrivalDeadline = m.arrival_deadline ? new Date(m.arrival_deadline).getTime() : null;
        const arriving = arrivalDeadline != null && arrivalDeadline > nowTick;
        return {
          id: m.id,
          lat: m.latitude,
          lng: m.longitude,
          label: arriving
            ? `${Math.max(0, Math.ceil((arrivalDeadline - nowTick) / 60000))}m`
            : String(present),
          tone: arriving ? "success" : present >= 10 ? "success" : present >= 9 ? "urgent" : "gold",
          onClick: () => navigate({ to: "/minyan", search: { id: m.id } }),
        } satisfies MapPinDatum;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- arrivalTick stands in for nowTick, see comment above
    [minyanim, navigate, arrivalTick],
  );

  const initial = useMemo(
    () => (firstName?.[0] ?? user?.email?.[0] ?? "?").toUpperCase(),
    [firstName, user],
  );

  const nextMinyanLabel = useMemo(() => {
    if (nearbySoon.length === 0) return null;
    const sorted = [...nearbySoon].sort((a, b) => minyanStartMs(a) - minyanStartMs(b));
    const m = sorted[0];
    const prayer = t(`prayer.${m.prayer}`, { defaultValue: m.prayer });
    const when = new Date(m.scheduled_at ?? m.created_at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${prayer} · ${when}`;
  }, [nearbySoon, t]);

  /** Location is off: explain what is missing and let the user turn it on. */
  const locationOff = !position && !geoLoading && permState !== null && permState !== "granted";
  const turnOnLocation = useCallback(async () => {
    void tapLight();
    if (permState === "prompt") {
      allowingRef.current = true;
      const ok = await requestLocationPermission();
      setPermState(ok ? "granted" : "denied");
      if (ok) await requestGeo();
      allowingRef.current = false;
    } else {
      // iOS only shows its permission dialog once; after a refusal the user must use Settings.
      await openAppSettings();
    }
  }, [permState, requestGeo]);

  // Back from the Settings app: pick up a permission the user just turned on.
  useEffect(() => {
    const recheck = () => {
      if (document.visibilityState !== "visible") return;
      void checkLocationPermission().then((perm) => {
        setPermState(perm);
        if (perm === "granted") void requestGeo();
      });
    };
    document.addEventListener("visibilitychange", recheck);
    return () => document.removeEventListener("visibilitychange", recheck);
  }, [requestGeo]);

  return (
    <MobileFrame bg="map">
      <div className="flex-1 relative min-h-0">
        {geoLoading && !position ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        ) : (
          <GoogleMapCanvas
            center={center}
            user={position}
            userAvatarUrl={avatarUrl}
            userInitial={initial}
            pins={pins}
            theme={theme}
            recenterNonce={recenterNonce}
            className="absolute inset-0"
          />
        )}

        {/* Header — wordmark + round surface control (theme) */}
        <div className="absolute top-0 left-0 right-0 z-50 px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-4 flex items-center justify-between pointer-events-none bg-gradient-to-b from-background/90 via-background/50 to-transparent">
          <Wordmark className="text-[22px] pointer-events-auto" legacyFont />
          <div className="flex items-center gap-2 pointer-events-auto relative z-50">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void tapLight();
                toggleTheme();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label={t("common.toggleTheme")}
              className="h-10 w-10 rounded-full bg-surface shadow-soft flex items-center justify-center text-ink-soft active:scale-[0.97]"
            >
              {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Link
              to="/profile"
              className="h-10 w-10 rounded-full bg-surface shadow-soft flex items-center justify-center text-xs font-semibold text-ink"
            >
              {initial}
            </Link>
          </div>
        </div>

        {/* Discreet "refresh my position" control — renews presence + recenters. */}
        {listSheet === "closed" && (
          <button
            type="button"
            onClick={() => void refreshPosition()}
            disabled={refreshingPos}
            aria-label={t("home.presence.recenter", { defaultValue: "Refresh my position" })}
            className="absolute right-5 z-40 top-[max(4.5rem,calc(env(safe-area-inset-top)+3.75rem))] h-9 w-9 rounded-full bg-surface/90 backdrop-blur shadow-soft border border-border/60 flex items-center justify-center text-ink-soft active:scale-[0.96] disabled:opacity-60"
          >
            {refreshingPos ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LocateFixed className="h-4 w-4" />
            )}
          </button>
        )}

        {locationOff && (
          <LocationOffCard denied={permState === "denied"} onTurnOn={turnOnLocation} />
        )}

        {position && listSheet === "closed" && (
          <HomePresenceCard
            minyanimCount={nearbySoon.length}
            nextMinyanLabel={nextMinyanLabel}
            onOpenList={openListSheet}
            onRecenter={() => {
              void requestGeo();
              setRecenterNonce((n) => n + 1);
            }}
          />
        )}

        {/* Nearby list — snap sheet (peek / half / tall), drag to resize or close */}
        {listSheet !== "closed" && user && (
          <>
            <button
              type="button"
              aria-label={t("common.cancel")}
              className="absolute inset-0 z-30 bg-transparent"
              onClick={closeListSheet}
            />
            <div
              role="dialog"
              aria-label={t("home.orJoinNearby")}
              style={{ height: LIST_SHEET_HEIGHT[listSheet] }}
              className="absolute left-0 right-0 bottom-0 z-40 bg-surface rounded-t-3xl border-t border-border shadow-lifted flex flex-col overflow-hidden transition-[height] duration-300 ease-out"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                onPointerDown={onListSheetDragStart}
                onPointerUp={onListSheetDragEnd}
                onPointerCancel={onListSheetDragEnd}
                className="relative shrink-0 pt-2.5 pb-1 px-5 cursor-grab active:cursor-grabbing select-none touch-none"
              >
                <div className="flex justify-center">
                  <button
                    type="button"
                    aria-label={t("home.presence.openList")}
                    onClick={() => {
                      const idx = LIST_SHEET_ORDER.indexOf(listSheet);
                      setListSheet(
                        LIST_SHEET_ORDER[Math.min(idx + 1, LIST_SHEET_ORDER.length - 1)],
                      );
                    }}
                    className="h-1.5 w-12 rounded-full bg-muted"
                  />
                </div>
                <button
                  type="button"
                  onClick={closeListSheet}
                  aria-label={t("common.cancel")}
                  className="absolute right-4 top-2 h-7 w-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center active:scale-[0.96]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex-1 min-h-0 flex flex-col">
                <HomeNearbyList position={position} userId={user.id} />
              </div>
            </div>
          </>
        )}
      </div>

      <LocationPrimerDialog
        open={primerOpen}
        onOpenChange={(open) => {
          setPrimerOpen(open);
          if (!open && !allowingRef.current) pendingCreateRef.current = false;
        }}
        onAllow={() => void handlePrimerAllow()}
        onLater={handlePrimerLater}
      />
    </MobileFrame>
  );
}
