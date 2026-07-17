import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Moon, Plus, SunMedium } from "lucide-react";
import { MobileFrame } from "@/components/MobileFrame";
import { Wordmark } from "@/components/Logo";
import { ScreenHeader } from "@/components/ui-bits";
import { GoogleMapCanvas, type DensityHalo, type MapPinDatum } from "@/components/GoogleMap";
import { LocationPrimerDialog } from "@/components/LocationPrimerDialog";
import { HomePresenceCard } from "@/components/HomePresenceCard";
import { HomeNearbyList } from "@/components/HomeNearbyList";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useDensity } from "@/hooks/use-density";
import { usePresence } from "@/hooks/use-presence";
import { useNearbyMinyanim } from "@/hooks/use-minyanim";
import { supabase } from "@/integrations/supabase/client";
import { tapLight } from "@/lib/haptics";
import { getAppPref, setAppPref } from "@/lib/app-prefs";
import { reverseNeighborhood } from "@/lib/geocoding";
import { distanceMeters } from "@/lib/geo";
import { isLiveOnMap } from "@/lib/minyan-live";
import {
  checkLocationPermission,
  requestLocationPermission,
  type LocationPermissionState,
} from "@/lib/native";

export const Route = createFileRoute("/home")({
  ssr: false,
  component: Home,
});

const PRIMER_SEEN_KEY = "minyan:location-primer-seen";
const FALLBACK_CENTER = { lat: 32.0853, lng: 34.7818 };

function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const { position, loading: geoLoading, request: requestGeo } = useGeolocation(false);
  const { zones, activeCount, lastUpdatedAt, loading: densityLoading } = useDensity(position, 1000);
  const { data: allMinyanim } = useNearbyMinyanim(position, 5000);
  const minyanim = useMemo(() => allMinyanim.filter((m) => isLiveOnMap(m)), [allMinyanim]);
  usePresence(position, !!user, user?.id);
  const [firstName, setFirstName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [primerOpen, setPrimerOpen] = useState(false);
  const [permState, setPermState] = useState<LocationPermissionState | null>(null);
  const [neighborhood, setNeighborhood] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [recenterNonce, setRecenterNonce] = useState(0);
  const pendingCreateRef = useRef(false);
  const allowingRef = useRef(false);
  const lastGeoRef = useRef<{ lat: number; lng: number } | null>(null);
  const drawerContentRef = useRef<HTMLDivElement>(null);

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
    if (!position) return;
    const last = lastGeoRef.current;
    if (last && distanceMeters(last, position) < 500) return;
    lastGeoRef.current = { lat: position.lat, lng: position.lng };
    void reverseNeighborhood(position.lat, position.lng).then((n) => {
      if (n) setNeighborhood(n);
    });
  }, [position?.lat, position?.lng, position]);

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

  const handleCreateFab = useCallback(async () => {
    tapLight();
    const perm = permState ?? (await checkLocationPermission());
    if (perm !== "granted") {
      pendingCreateRef.current = true;
      setPrimerOpen(true);
      return;
    }
    goToCreate();
  }, [permState, goToCreate]);

  const center = position ?? FALLBACK_CENTER;
  const halos: DensityHalo[] = useMemo(
    () =>
      zones.map((z) => ({
        id: z.zone,
        lat: z.lat,
        lng: z.lng,
        intensity: z.intensity,
        memberCount: z.memberCount,
      })),
    [zones],
  );

  const pins: MapPinDatum[] = useMemo(
    () =>
      minyanim.map((m) => {
        const present = m.present_count ?? 1;
        return {
          id: m.id,
          lat: m.latitude,
          lng: m.longitude,
          label: String(present),
          tone: present >= 10 ? "success" : present >= 9 ? "urgent" : "gold",
          onClick: () => navigate({ to: "/minyan", search: { id: m.id } }),
        } satisfies MapPinDatum;
      }),
    [minyanim, navigate],
  );

  const initial = useMemo(
    () => (firstName?.[0] ?? user?.email?.[0] ?? "?").toUpperCase(),
    [firstName, user],
  );

  return (
    <MobileFrame bg="map">
      <div className="flex-1 relative min-h-0">
        {geoLoading && !position ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <Loader2 className="h-6 w-6 animate-spin text-gold" />
          </div>
        ) : (
          <GoogleMapCanvas
            center={center}
            user={position}
            userAvatarUrl={avatarUrl}
            userInitial={initial}
            densityHalos={halos}
            pins={pins}
            theme={theme}
            recenterNonce={recenterNonce}
            className="absolute inset-0"
          />
        )}

        <div className="absolute top-0 left-0 right-0 z-50 pointer-events-none">
          <div className="pointer-events-auto">
            <ScreenHeader
              overlay
              title={<Wordmark className="text-2xl" />}
              subtitle={position ? t("home.subtitleWithGps") : t("home.subtitleNoGps")}
              right={
                <div className="flex items-center gap-2 relative z-50">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void tapLight();
                      toggleTheme();
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    aria-label="Toggle dark mode"
                    className="h-9 w-9 rounded-full border border-border bg-surface/95 flex items-center justify-center text-muted-foreground hover:border-gold/50 transition-colors active:scale-[0.97]"
                  >
                    {theme === "dark" ? (
                      <SunMedium className="h-4 w-4" />
                    ) : (
                      <Moon className="h-4 w-4" />
                    )}
                  </button>
                  <Link
                    to="/profile"
                    className="h-9 w-9 rounded-full bg-gold/20 flex items-center justify-center text-xs font-semibold"
                  >
                    {initial}
                  </Link>
                </div>
              }
            />
          </div>
        </div>

        {position && (
          <HomePresenceCard
            activeCount={activeCount}
            neighborhood={neighborhood}
            lastUpdatedAt={lastUpdatedAt}
            loading={densityLoading}
            minyanimCount={minyanim.length}
            onOpenList={() => {
              tapLight();
              setListOpen(true);
            }}
            onRecenter={() => {
              void requestGeo();
              setRecenterNonce((n) => n + 1);
            }}
          />
        )}

        <button
          type="button"
          onClick={() => void handleCreateFab()}
          aria-label={t("home.createFab")}
          className="absolute bottom-4 right-5 z-20 h-14 w-14 rounded-2xl gold-gradient text-gold-foreground shadow-[0_6px_20px_-4px_rgba(212,165,55,0.55)] flex items-center justify-center transition-transform active:scale-[0.94] active:opacity-90"
        >
          <Plus className="h-7 w-7" strokeWidth={2.5} />
        </button>
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

      <Drawer open={listOpen} onOpenChange={setListOpen}>
        <DrawerContent
          ref={drawerContentRef}
          tabIndex={-1}
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => {
            // vaul defaults to autoFocus=false and calls preventDefault on the
            // open auto-focus, which leaves focus on the trigger button — now
            // inside an aria-hidden subtree (VoiceOver warning). Move focus into
            // the drawer container instead of a random inner control.
            e.preventDefault();
            drawerContentRef.current?.focus();
          }}
          className="h-[82vh] focus:outline-none"
        >
          <DrawerTitle className="sr-only">{t("home.orJoinNearby")}</DrawerTitle>
          {user && <HomeNearbyList position={position} userId={user.id} />}
        </DrawerContent>
      </Drawer>
    </MobileFrame>
  );
}
