import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader, StatusPill } from "@/components/ui-bits";
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
import { MapPin, Users, Plane, Building2, Plus, Clock, Sunrise, Sun, Moon, Check, Crosshair, Loader2, Globe2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useGeolocation } from "@/hooks/use-geolocation";
import { joinMinyan, useNearbyMinyanim, type MinyanRow } from "@/hooks/use-minyanim";
import { supabase } from "@/integrations/supabase/client";
import { openDirections } from "@/lib/directions";
import { downloadIcs } from "@/lib/native";
import { Navigation } from "lucide-react";

export const Route = createFileRoute("/home")({
  component: Home,
});

type Context = "Street" | "Airport" | "Hotel" | "Travel";

function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { position, request, error: geoError, loading: geoLoading } = useGeolocation(true);
  const { data: minyanim, loading } = useNearbyMinyanim(position);
  const [pending, setPending] = useState<MinyanRow | null>(null);
  const [justJoined, setJustJoined] = useState<MinyanRow | null>(null);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  // Load which minyanim the user already joined
  useEffect(() => {
    if (!user) return;
    supabase
      .from("minyan_participants")
      .select("minyan_id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data) setJoinedIds(new Set(data.map((r) => r.minyan_id)));
      });
  }, [user, minyanim]);

  const confirmJoin = async () => {
    if (!pending || !user) return;
    const { error } = await joinMinyan(pending.id, user.id);
    if (error) {
      toast.error(t("auth.signInFailed"), { description: error.message });
    } else {
      toast.success(t("home.youreIn"), { description: pending.address ?? "" });
      const start = pending.scheduled_at ? new Date(pending.scheduled_at) : new Date();
      downloadIcs({
        title: `Minyan · ${pending.prayer}`,
        description: pending.message ?? "Minyan via MinyanNow",
        location: pending.address ?? undefined,
        start,
        durationMinutes: 20,
      });
      setJustJoined(pending);
      setJoinedIds((s) => new Set(s).add(pending.id));
    }
    setPending(null);
  };

  const initial = useMemo(() => (user?.email?.[0] ?? "?").toUpperCase(), [user]);

  return (
    <MobileFrame>
      <ScreenHeader
        title="MinyanNow"
        subtitle={position ? t("home.subtitleWithGps") : t("home.subtitleNoGps")}
        right={
          <Link to="/profile" className="h-9 w-9 rounded-full bg-gold/20 flex items-center justify-center text-xs font-semibold">
            {initial}
          </Link>
        }
      />

      {/* Location chip */}
      <div className="px-6 mb-3">
        <button
          onClick={request}
          className="w-full flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-3 py-2.5 text-xs"
        >
          <span className="flex items-center gap-2">
            {geoLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crosshair className="h-3.5 w-3.5 text-gold" />}
            {position
              ? `GPS · ${position.lat.toFixed(3)}, ${position.lng.toFixed(3)}`
              : geoError ?? t("home.tapGps")}
          </span>
          <span className="text-muted-foreground">{t("home.refresh")}</span>
        </button>
      </div>

      {/* Start a minyan tiles */}
      <div className="px-6">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">{t("home.startSection")}</div>
        <div className="grid grid-cols-4 gap-2">
          <CtxTile id="Street" label={t("ctx.Street")} icon={MapPin} />
          <CtxTile id="Airport" label={t("ctx.Airport")} icon={Plane} />
          <CtxTile id="Hotel" label={t("ctx.Hotel")} icon={Building2} />
          <CtxTile id="Travel" label={t("ctx.Travel")} icon={Globe2} />
        </div>
      </div>

      <div className="px-6 mt-5">
        <Link
          to="/create"
          search={{ ctx: "Street" }}
          className="relative block rounded-3xl overflow-hidden navy-gradient text-white p-5 shadow-lift active:scale-[0.99] transition-transform"
        >
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold/25 blur-3xl" />
          <div className="relative flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-white/60">
                <MapPin className="h-3 w-3 text-gold" /> {t("home.rightWhereYouStand")}
              </div>
              <h2 className="mt-1.5 font-display text-[26px] leading-[1.05]">
                {t("home.startCta")}<br /><span className="text-gold">{t("home.rightHere")}</span>
              </h2>
            </div>
            <div className="h-14 w-14 shrink-0 rounded-full gold-gradient text-gold-foreground flex items-center justify-center shadow-glow-gold">
              <Plus className="h-7 w-7" strokeWidth={2.6} />
            </div>
          </div>
        </Link>
      </div>

      <div className="px-6 mt-6 mb-2 flex items-end justify-between">
        <div>
          <h2 className="font-display text-xl">{t("home.orJoinNearby")}</h2>
          <p className="text-xs text-muted-foreground">{t("home.joinHint")}</p>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{t("home.live")}</span>
      </div>

      <div className="px-6 space-y-3 pb-8">
        {!position && (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {t("home.enableLocation")}
          </div>
        )}
        {position && loading && minyanim.length === 0 && (
          <div className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> {t("common.loading")}
          </div>
        )}
        {position && !loading && minyanim.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {t("home.noneNearby")}
          </div>
        )}
        {minyanim.map((m) => (
          <NearbyCard
            key={m.id}
            m={m}
            joined={joinedIds.has(m.id)}
            onJoinRequest={() => setPending(m)}
          />
        ))}
      </div>

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("home.willYouShow")}</AlertDialogTitle>
            <AlertDialogDescription>
              {pending && t("home.commitText", { prayer: pending.prayer, address: pending.address ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("home.notYet")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmJoin}>{t("home.commit")}</AlertDialogAction>
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
                if (justJoined) openDirections(justJoined.latitude, justJoined.longitude, justJoined.address ?? undefined);
                setJustJoined(null);
              }}
            >
              {t("home.openDirections")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileFrame>
  );
}

function CtxTile({ id, label, icon: Icon }: { id: Context; label: string; icon: typeof MapPin }) {
  return (
    <Link
      to="/create"
      search={{ ctx: id }}
      className="rounded-2xl border bg-surface border-border p-3 flex flex-col items-center gap-1.5 transition-all active:scale-[0.97] hover:border-gold/60"
    >
      <div className="h-9 w-9 rounded-xl bg-muted text-muted-foreground flex items-center justify-center">
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-xs font-semibold">{label}</div>
    </Link>
  );
}

function NearbyCard({ m, joined, onJoinRequest }: { m: MinyanRow; joined: boolean; onJoinRequest: () => void }) {
  const { t } = useTranslation();
  const NEEDED = 10;
  const present = m.present_count ?? 1;
  const missing = Math.max(0, NEEDED - present);
  const complete = present >= NEEDED;
  const PrayerIcon = m.prayer === "shacharit" ? Sunrise : m.prayer === "mincha" ? Sun : Moon;
  const progress = Math.min(100, (present / NEEDED) * 100);
  const scheduled = m.scheduled_at ? new Date(m.scheduled_at) : null;
  const whenLabel = scheduled
    ? scheduled.toLocaleString([], { dateStyle: "short", timeStyle: "short" })
    : t("home.liveNow");
  const prayerLabel = t(`prayer.${m.prayer}`, { defaultValue: m.prayer });

  return (
    <div className="bg-surface rounded-2xl border border-border shadow-soft p-4">
      <div className="flex items-start gap-3">
        <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${complete ? "bg-success/15 text-success" : "bg-gold/10 text-gold"}`}>
          <PrayerIcon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <StatusPill tone={complete ? "success" : "gold"}>{prayerLabel}</StatusPill>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> {whenLabel}
            </span>
          </div>
          <h3 className="font-display text-base leading-tight truncate">{m.address ?? t("home.unknownSpot")}</h3>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <MapPin className="h-3 w-3" /> {t(`ctx.${m.type}` as const, { defaultValue: m.type })} · {m.nusach ?? "Any"}
          </p>
          {m.message && <p className="text-[11px] mt-1 italic text-urgent">"{m.message}"</p>}
        </div>

        <button
          onClick={onJoinRequest}
          disabled={joined}
          aria-label="Join this minyan"
          className={`h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center transition-all ${
            joined ? "bg-success text-white" : "gold-gradient text-gold-foreground shadow-glow-gold active:scale-95"
          }`}
        >
          {joined ? <Check className="h-6 w-6" strokeWidth={2.8} /> : <Plus className="h-6 w-6" strokeWidth={2.8} />}
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs gap-2">
        <span className="flex items-center gap-2 min-w-0">
          <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-sm font-bold text-foreground">{present} {t("home.present")}</span>
          {missing > 0 ? (
            <span className="text-urgent font-medium truncate">· {t("home.missing", { count: missing })}</span>
          ) : (
            <span className="text-success font-medium truncate">· {t("home.complete")}</span>
          )}
        </span>
        <button
          onClick={() => openDirections(m.latitude, m.longitude, m.address ?? undefined)}
          className="shrink-0 h-8 px-3 rounded-full border border-border bg-surface text-[11px] font-semibold flex items-center gap-1 hover:border-gold/60"
        >
          <Navigation className="h-3 w-3 text-gold" /> {t("common.directions")}
        </button>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${complete ? "bg-success" : "gold-gradient"}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
