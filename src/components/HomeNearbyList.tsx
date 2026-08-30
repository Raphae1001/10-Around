/**
 * Liste des minyanim proches — pattern natif iOS conservé pour l'accès secondaire (Phase 2e).
 * Extrait de l'ancien home.tsx lors de la refonte carte.
 */
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { EmptyState, LiveBadge } from "@/components/ui-bits";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MapPin, Users, Sunrise, Sun, Moon, Check, Loader2, Navigation } from "lucide-react";
import { tapLight, tapMedium, successHaptic } from "@/lib/haptics";
import { joinMinyan, useNearbyMinyanim, type MinyanRow } from "@/hooks/use-minyanim";
import type { GeoPosition } from "@/hooks/use-geolocation";
import { openDirections } from "@/lib/directions";
import { downloadIcs } from "@/lib/native";
import { QUORUM_SIZE } from "@/lib/constants";
import { isLiveOnMap } from "@/lib/minyan-live";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  position: GeoPosition | null;
  userId: string;
};

export function HomeNearbyList({ position, userId }: Props) {
  const { t } = useTranslation();
  const { data: allMinyanim, loading, refresh } = useNearbyMinyanim(position, 5000);
  const minyanim = useMemo(() => allMinyanim.filter((m) => isLiveOnMap(m)), [allMinyanim]);
  const [pending, setPending] = useState<MinyanRow | null>(null);
  const [justJoined, setJustJoined] = useState<MinyanRow | null>(null);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(-1);
  const PULL_THRESHOLD = 64;

  useEffect(() => {
    supabase
      .from("minyan_participants")
      .select("minyan_id")
      .eq("user_id", userId)
      .then(({ data }) => {
        if (data) setJoinedIds(new Set(data.map((r) => r.minyan_id)));
      });
  }, [userId, minyanim]);

  const confirmJoin = async (readyNow: boolean) => {
    if (!pending) return;
    const { error } = await joinMinyan(pending.id, userId, readyNow);
    if (error) {
      toast.error(t("auth.signInFailed"), { description: error.message });
    } else {
      void successHaptic();
      toast.success(t("home.youreIn"), { description: pending.address ?? "" });
      const start = pending.scheduled_at ? new Date(pending.scheduled_at) : new Date();
      downloadIcs({
        title: `Minyan · ${pending.prayer}`,
        description: pending.message ?? "Minyan via 10 Around",
        location: pending.address ?? undefined,
        start,
        durationMinutes: 20,
      });
      setJustJoined(pending);
      setJoinedIds((s) => new Set(s).add(pending.id));
    }
    setPending(null);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-5 pt-1 pb-2 flex items-end justify-between shrink-0 gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-tight truncate">{t("home.orJoinNearby")}</h2>
          <p className="text-xs text-muted-foreground truncate">{t("home.joinHint")}</p>
        </div>
        {minyanim.length > 0 ? (
          <LiveBadge>{t("home.live")}</LiveBadge>
        ) : (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold shrink-0">
            {t("home.live")}
          </span>
        )}
      </div>

      <div
        ref={listRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-5 pb-6"
        onTouchStart={(e) => {
          if ((listRef.current?.scrollTop ?? 1) === 0) touchStartY.current = e.touches[0].clientY;
        }}
        onTouchMove={(e) => {
          if (touchStartY.current < 0 || isRefreshing) return;
          const delta = e.touches[0].clientY - touchStartY.current;
          if (delta > 0) setPullDistance(Math.min(delta * 0.45, 80));
        }}
        onTouchEnd={async () => {
          if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
            void tapMedium();
            setIsRefreshing(true);
            setPullDistance(0);
            await refresh();
            setIsRefreshing(false);
          } else setPullDistance(0);
          touchStartY.current = -1;
        }}
      >
        <div
          className="flex items-center justify-center overflow-hidden transition-all duration-200"
          style={{ height: isRefreshing ? 44 : pullDistance > 0 ? pullDistance : 0 }}
        >
          <Loader2
            className={`h-5 w-5 text-gold ${isRefreshing ? "animate-spin" : ""}`}
            style={{ opacity: isRefreshing ? 1 : Math.min(pullDistance / PULL_THRESHOLD, 1) }}
          />
        </div>

        {!position && (
          <div className="flex flex-col items-center justify-center pt-10">
            <EmptyState icon={MapPin} title={t("home.enableLocation")} />
          </div>
        )}
        {position && loading && minyanim.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center text-sm text-muted-foreground pt-10">
            <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> {t("common.loading")}
          </div>
        )}
        {position && !loading && minyanim.length === 0 && (
          <div className="rounded-2xl bg-surface border border-border overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-4">
              <div className="h-10 w-10 rounded-full bg-accent/10 text-accent flex items-center justify-center shrink-0">
                <Users className="h-[18px] w-[18px]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium text-ink leading-snug">
                  {t("home.noneNearby")}
                </p>
                <Link
                  to="/create"
                  className="inline-block mt-1.5 text-[13px] font-semibold text-accent"
                >
                  {t("home.startCta")}
                </Link>
              </div>
            </div>
          </div>
        )}
        {minyanim.length > 0 && (
          <div className="rounded-2xl bg-surface border border-border overflow-hidden">
            {minyanim.map((m, idx) => (
              <NearbyRow
                key={m.id}
                m={m}
                joined={joinedIds.has(m.id)}
                onJoinRequest={() => setPending(m)}
                isLast={idx === minyanim.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("home.willYouShow")}</AlertDialogTitle>
            <AlertDialogDescription>
              {pending &&
                t("home.commitText", { prayer: pending.prayer, address: pending.address ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("home.notYet")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmJoin(false)}>
              {t("minyan.willWait")}
            </AlertDialogAction>
            <AlertDialogAction onClick={() => confirmJoin(true)}>
              {t("minyan.readyNow")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!justJoined} onOpenChange={(o) => !o && setJustJoined(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("home.wantDirections")}</AlertDialogTitle>
            <AlertDialogDescription>
              {justJoined && t("home.openMapTo", { address: justJoined.address ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.later")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (justJoined)
                  openDirections(
                    justJoined.latitude,
                    justJoined.longitude,
                    justJoined.address ?? undefined,
                  );
                setJustJoined(null);
              }}
            >
              {t("home.openDirections")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
const SWIPE_ACTION_W = 72;
const SWIPE_SNAP_THRESHOLD = SWIPE_ACTION_W * 0.45;

function NearbyRow({
  m,
  joined,
  onJoinRequest,
  isLast,
}: {
  m: MinyanRow;
  joined: boolean;
  onJoinRequest: () => void;
  isLast: boolean;
}) {
  const { t } = useTranslation();
  const NEEDED = QUORUM_SIZE;
  const present = m.present_count ?? 1;
  const missing = Math.max(0, NEEDED - present);
  const complete = present >= NEEDED;
  const progress = Math.min(100, (present / NEEDED) * 100);
  const PrayerIcon = m.prayer === "shacharit" ? Sunrise : m.prayer === "mincha" ? Sun : Moon;
  const scheduled = m.scheduled_at ? new Date(m.scheduled_at) : null;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!scheduled) return;
    const i = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(i);
  }, [scheduled?.getTime()]);
  const diffMin = scheduled ? Math.round((scheduled.getTime() - now) / 60000) : 0;
  const countdown = scheduled
    ? diffMin > 0
      ? diffMin < 60
        ? t("home.inMin", { count: diffMin, defaultValue: "in {{count}} min" })
        : t("home.inHour", { count: Math.round(diffMin / 60), defaultValue: "in {{count}} h" })
      : diffMin === 0
        ? t("home.startingNow", { defaultValue: "starting now" })
        : t("home.startedAgo", { count: -diffMin, defaultValue: "started {{count}} min ago" })
    : t("home.liveNow");
  const ctxLabel = t(`ctx.${m.type}` as const, { defaultValue: m.type });
  const prayerLabel = t(`prayer.${m.prayer}`, { defaultValue: m.prayer });

  const rowContentRef = useRef<HTMLDivElement>(null);
  const swipeStartX = useRef(0);
  const swipeStartY = useRef(0);
  const swipeCurrentOffset = useRef(0);
  const swipeIsOpen = useRef(false);
  const swipeIsHorizontal = useRef(false);

  const snapTo = (offset: number) => {
    swipeCurrentOffset.current = offset;
    swipeIsOpen.current = offset === -SWIPE_ACTION_W;
    if (rowContentRef.current) {
      rowContentRef.current.style.transition =
        "transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
      rowContentRef.current.style.transform = `translateX(${offset}px)`;
    }
  };

  return (
    <div
      className={`relative overflow-hidden bg-surface${!isLast ? " border-b border-border/60" : ""}`}
    >
      <div className="absolute right-0 top-0 bottom-0 w-[72px] flex flex-col items-center justify-center gap-1 bg-gold/[0.08]">
        <button
          onClick={() => {
            openDirections(m.latitude, m.longitude, m.address ?? undefined);
            void tapLight();
            snapTo(0);
          }}
          className="flex flex-col items-center gap-1 text-gold active:opacity-60 transition-opacity"
          aria-label={t("common.directions")}
        >
          <Navigation className="h-5 w-5" />
          <span className="text-[10px] font-semibold leading-none">{t("common.directions")}</span>
        </button>
      </div>
      <div
        ref={rowContentRef}
        onTouchStart={(e) => {
          swipeStartX.current = e.touches[0].clientX;
          swipeStartY.current = e.touches[0].clientY;
          swipeIsHorizontal.current = false;
          if (rowContentRef.current) rowContentRef.current.style.transition = "none";
        }}
        onTouchMove={(e) => {
          const dx = e.touches[0].clientX - swipeStartX.current;
          const dy = e.touches[0].clientY - swipeStartY.current;
          if (!swipeIsHorizontal.current) {
            if (Math.abs(dy) > Math.abs(dx)) return;
            if (Math.abs(dx) < 5) return;
            swipeIsHorizontal.current = true;
          }
          const base = swipeIsOpen.current ? -SWIPE_ACTION_W : 0;
          const next = Math.max(-SWIPE_ACTION_W, Math.min(0, base + dx));
          swipeCurrentOffset.current = next;
          if (rowContentRef.current)
            rowContentRef.current.style.transform = `translateX(${next}px)`;
        }}
        onTouchEnd={() => {
          if (!swipeIsHorizontal.current) return;
          const offset = swipeCurrentOffset.current;
          if (!swipeIsOpen.current) snapTo(offset < -SWIPE_SNAP_THRESHOLD ? -SWIPE_ACTION_W : 0);
          else snapTo(offset > -SWIPE_ACTION_W + SWIPE_SNAP_THRESHOLD ? 0 : -SWIPE_ACTION_W);
        }}
        className="relative flex items-center min-h-[68px] px-4 py-3 gap-3 bg-surface active:bg-muted/50"
      >
        <div
          className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${complete ? "bg-success/15 text-success" : "bg-gold/10 text-gold"}`}
        >
          <PrayerIcon className="h-[18px] w-[18px]" />
        </div>
        <Link to="/minyan" search={{ id: m.id }} className="flex-1 min-w-0 py-0.5">
          <div className="font-medium text-[15px] text-foreground truncate leading-snug">
            {m.address ?? t("home.unknownSpot")}
          </div>
          <div className="text-[13px] text-muted-foreground mt-0.5 leading-snug flex items-center min-w-0">
            <span className="shrink-0">{countdown}</span>
            <span className="mx-1 shrink-0 opacity-50">·</span>
            {missing > 0 ? (
              <span className="text-urgent font-medium shrink-0">
                {present}/{NEEDED} · {t("home.missing", { count: missing })}
              </span>
            ) : (
              <span className="text-success font-medium shrink-0">{t("home.complete")}</span>
            )}
            <span className="mx-1 shrink-0 opacity-50">·</span>
            <span className="truncate">
              {prayerLabel} · {ctxLabel}
            </span>
          </div>
        </Link>
        <button
          onClick={(e) => {
            e.stopPropagation();
            void tapLight();
            onJoinRequest();
          }}
          disabled={joined}
          aria-label={t("common.join")}
          className={`h-9 px-3.5 rounded-full flex items-center justify-center gap-1 text-[13px] font-semibold transition-all active:scale-[0.97] shrink-0 ${joined ? "bg-success text-white" : "bg-accent text-accent-foreground"}`}
        >
          {joined ? <Check className="h-4 w-4" strokeWidth={2.8} /> : t("common.join")}
        </button>
        <div
          className={`absolute bottom-0 left-0 h-[2px] ${complete ? "bg-success" : "bg-gold"}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
