import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader, LiveBadge } from "@/components/ui-bits";
import {
  MapPin,
  Clock,
  CalendarDays,
  Navigation2,
  Users,
  Check,
  Loader2,
  X,
  MessageCircle,
  Share2,
  ScrollText,
  Timer,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { joinMinyan, leaveMinyan, type MinyanRow } from "@/hooks/use-minyanim";
import { openDirections } from "@/lib/directions";
import { shareAny, appOrigin } from "@/lib/share";
import { tapLight, tapMedium } from "@/lib/haptics";

export const Route = createFileRoute("/minyan")({
  validateSearch: (s: Record<string, unknown>) => ({
    id: typeof s.id === "string" ? s.id : undefined,
  }),
  component: Details,
});

const NEEDED = 10;
const SECONDARY_BTN =
  "flex items-center justify-center gap-2 rounded-xl bg-surface-muted text-ink py-3 text-sm font-medium active:scale-[0.99] disabled:opacity-45 disabled:cursor-not-allowed";

function relTime(iso: string | null, t: (k: string, o?: any) => string) {
  if (!iso) return t("home.liveNow");
  const diffMin = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  if (Math.abs(diffMin) < 1) return t("home.liveNow");
  if (diffMin > 0) {
    if (diffMin < 60) return t("home.inMin", { count: diffMin, defaultValue: "in {{count}} min" });
    const h = Math.round(diffMin / 60);
    return t("home.inHour", { count: h, defaultValue: "in {{count}} h" });
  }
  const past = -diffMin;
  if (past < 60)
    return t("home.startedAgo", { count: past, defaultValue: "started {{count}} min ago" });
  return t("home.startedAgo", {
    count: Math.round(past / 60),
    defaultValue: "started {{count}} min ago",
  });
}

function Details() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = Route.useSearch();
  const { user } = useAuth();
  const [minyan, setMinyan] = useState<MinyanRow | null>(null);
  const [organizer, setOrganizer] = useState<{ display_name: string | null } | null>(null);
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from("minyanim")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        toast.error(t("minyan.loadFailed"));
        setLoading(false);
        return;
      }
      if (!data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setMinyan(data as MinyanRow);

      const { data: prof } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", (data as any).creator_id)
        .maybeSingle();
      if (!cancelled) setOrganizer(prof as any);

      if (user) {
        const { data: p } = await supabase
          .from("minyan_participants")
          .select("id")
          .eq("minyan_id", id)
          .eq("user_id", user.id)
          .maybeSingle();
        if (!cancelled) setJoined(!!p);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id, user, t]);

  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`minyan-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "minyanim", filter: `id=eq.${id}` },
        (payload) => {
          if (payload.new) setMinyan(payload.new as MinyanRow);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id]);

  const startsAtIso = minyan?.scheduled_at ?? minyan?.created_at ?? null;
  const startsAt = startsAtIso ? new Date(startsAtIso) : null;
  const scheduledAt = minyan?.scheduled_at ? new Date(minyan.scheduled_at) : null;
  const expiresAt = minyan?.expires_at ? new Date(minyan.expires_at) : null;
  const prayerLabel = minyan ? t(`prayer.${minyan.prayer}`, { defaultValue: minyan.prayer }) : "";
  const whenLabel = useMemo(
    () => relTime(minyan?.scheduled_at ?? null, t),
    [minyan?.scheduled_at, t],
  );

  const present = minyan?.present_count ?? 0;
  const missing = Math.max(0, NEEDED - present);
  const complete = present >= NEEDED;
  const progress = Math.min(100, (present / NEEDED) * 100);

  const isOrganizer = !!user && !!minyan && minyan.creator_id === user.id;
  const isScheduled = minyan?.type === "scheduled";

  async function handleJoin() {
    if (!minyan || !user) return;
    void tapMedium();
    setBusy(true);
    const { error } = await joinMinyan(minyan.id, user.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      setJoined(true);
      toast.success(t("minyan.youreIn"));
      navigate({ to: "/success", search: { id: minyan.id } });
    }
  }

  async function handleLeave() {
    if (!minyan || !user) return;
    void tapLight();
    setBusy(true);
    const { error } = await leaveMinyan(minyan.id, user.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      setJoined(false);
      toast.success(t("common.cancel"));
    }
  }

  async function handleCancelMinyan() {
    if (!minyan) return;
    if (!confirm(t("minyan.cancelMinyanConfirm"))) return;
    setBusy(true);
    const { error } = await supabase.rpc("cancel_my_minyan", { _id: minyan.id });
    setBusy(false);
    if (error) {
      toast.error(t("minyan.cancelTooLate"), { description: error.message });
    } else {
      void import("@/lib/analytics").then(({ track }) =>
        track("cancel_minyan", { minyan_id: minyan.id }),
      );
      toast.success(t("minyan.cancelledOk"));
      navigate({ to: "/home" });
    }
  }

  function handleDirections() {
    if (!minyan) return;
    void tapLight();
    openDirections(minyan.latitude, minyan.longitude, minyan.address ?? undefined);
  }

  function handleShare() {
    if (!minyan) return;
    void tapLight();
    const url = `${appOrigin()}/minyan/${minyan.id}`;
    const when = startsAt
      ? startsAt.toLocaleString([], { dateStyle: "short", timeStyle: "short" })
      : t("home.liveNow");
    const text = t("minyan.shareText", {
      prayer: prayerLabel,
      address: minyan.address ?? "",
      when,
      url,
    });
    void shareAny({ title: `MinyanNow — ${prayerLabel}`, text, url });
  }

  async function handleOpenChat() {
    if (!minyan || !user) return;
    void tapLight();
    const { data: tid, error } = await supabase.rpc("get_or_create_minyan_chat", {
      _minyan_id: minyan.id,
    });
    if (error || !tid) {
      toast.error(t("minyan.chatJoinFirst"), { description: error?.message });
      return;
    }
    void import("@/lib/analytics").then(({ track }) =>
      track("open_chat", { minyan_id: minyan.id }),
    );
    navigate({ to: "/chat", search: { id: tid as string } });
  }

  if (loading) {
    return (
      <MobileFrame>
        <ScreenHeader title={t("minyan.title")} back />
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> {t("common.loading")}
        </div>
      </MobileFrame>
    );
  }

  if (notFound || !minyan) {
    return (
      <MobileFrame>
        <ScreenHeader title={t("minyan.title")} back />
        <div className="px-6 py-16 text-center text-sm text-muted-foreground">
          {t("minyan.notFound")}
          <div className="mt-6">
            <button onClick={() => navigate({ to: "/home" })} className="text-accent font-semibold">
              {t("nav.home")}
            </button>
          </div>
        </div>
      </MobileFrame>
    );
  }

  const orgInitial = (organizer?.display_name?.[0] ?? minyan.address?.[0] ?? "?").toUpperCase();
  const orgName = isOrganizer
    ? t("minyan.you")
    : (organizer?.display_name ?? t("minyan.organizer"));
  const canCancel =
    isOrganizer && (!scheduledAt || scheduledAt.getTime() - Date.now() > 20 * 60_000);
  const cancelWindowClosed =
    isOrganizer && scheduledAt && scheduledAt.getTime() - Date.now() <= 20 * 60_000;

  return (
    <MobileFrame>
      <ScreenHeader
        title=""
        back
        right={
          <button
            onClick={handleShare}
            aria-label={t("minyan.share")}
            className="h-9 w-9 rounded-full bg-surface shadow-soft flex items-center justify-center active:scale-95 transition-transform"
          >
            <Share2 className="h-[18px] w-[18px]" />
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto overscroll-y-contain">
        <div className="px-6 space-y-4 pb-4">
          <div>
            <h1 className="text-[20px] font-semibold text-ink leading-tight">
              {minyan.address ?? t("minyan.title")}
            </h1>
            <p className="text-[13px] text-ink-soft mt-1">{prayerLabel}</p>
          </div>

          {/* HERO — compteur Fraunces */}
          <div className="rounded-3xl bg-surface shadow-soft p-6 text-center">
            <div className="flex justify-center mb-3">
              {isScheduled ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 text-accent px-2.5 py-1 text-[11px] font-semibold">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {scheduledAt
                    ? scheduledAt.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
                    : t("minyan.scheduled")}
                </span>
              ) : (
                <LiveBadge>{whenLabel}</LiveBadge>
              )}
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
              {t("home.present")}
            </div>
            <div className="mt-1 flex items-baseline justify-center gap-1">
              <span className="font-serif-brand text-[64px] leading-none tracking-tight tabular-nums text-ink">
                {present}
              </span>
              <span className="text-[18px] text-ink-soft">/{NEEDED}</span>
            </div>
            <div
              className={`mt-2 text-sm font-medium ${complete ? "text-ink-soft" : "text-accent"}`}
            >
              {complete ? t("minyan.complete") : t("minyan.missing", { count: missing })}
            </div>
            <div className="mx-auto mt-4 h-1.5 w-40 rounded-full bg-surface-muted overflow-hidden">
              <div
                className={`h-full rounded-full ${complete ? "bg-success" : "bg-accent"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* INFO LIST */}
          <div className="rounded-2xl bg-surface shadow-soft overflow-hidden">
            {isScheduled ? (
              <Row
                icon={CalendarDays}
                label={t("minyan.startsAt")}
                value={
                  scheduledAt
                    ? scheduledAt.toLocaleString([], { dateStyle: "full", timeStyle: "short" })
                    : "—"
                }
              />
            ) : (
              <Row
                icon={Clock}
                label={t("minyan.startsAt")}
                value={
                  startsAt && minyan.scheduled_at
                    ? startsAt.toLocaleString([], { dateStyle: "short", timeStyle: "short" })
                    : t("home.liveNow")
                }
              />
            )}
            <Row icon={MapPin} label={t("minyan.location")} value={minyan.address ?? "—"} />
            <Row icon={Users} label={t("minyan.organizer")} value={orgName} />
            <Row
              icon={ScrollText}
              label={t("minyan.nusach")}
              value={minyan.nusach ?? t("minyan.nusachAny")}
              isLast={isScheduled}
            />
            {!isScheduled && expiresAt && (
              <Row
                icon={Timer}
                label={t("minyan.autoCloses")}
                value={`${Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 60000))} min`}
                isLast
              />
            )}
          </div>

          {/* MESSAGE — blockquote, not a card */}
          {minyan.message && (
            <blockquote className="border-l-2 border-accent pl-4 text-[13px] italic text-ink-soft">
              {minyan.message}
            </blockquote>
          )}
        </div>
      </div>

      {/* STICKY FOOTER */}
      <div className="px-6 pt-3 pb-2 space-y-2 border-t border-hairline bg-surface/95 backdrop-blur">
        {joined ? (
          <button
            disabled={busy}
            onClick={handleLeave}
            className="w-full bg-surface-muted text-ink font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
          >
            <X className="h-5 w-5" /> {t("minyan.cancel")}
          </button>
        ) : (
          <button
            disabled={busy || !user || isOrganizer}
            onClick={handleJoin}
            className="w-full bg-accent text-accent-foreground font-semibold py-4 rounded-2xl shadow-fab flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.99] transition-transform"
          >
            <Check className="h-5 w-5" /> {isOrganizer ? t("minyan.you") : t("minyan.imComing")}
          </button>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={handleDirections} className={SECONDARY_BTN}>
            <Navigation2 className="h-4 w-4 shrink-0" /> {t("common.directions")}
          </button>
          <button
            type="button"
            onClick={handleOpenChat}
            disabled={!joined && !isOrganizer}
            className={SECONDARY_BTN}
          >
            <MessageCircle className="h-4 w-4 shrink-0" /> {t("minyan.groupChat")}
          </button>
        </div>

        {canCancel && (
          <div className="pt-1 text-center">
            <p className="text-[11px] text-ink-soft mb-1.5">{t("minyan.cancelMinyanHint")}</p>
            <button
              disabled={busy}
              onClick={handleCancelMinyan}
              className="text-destructive/80 text-[13px] font-medium py-2 px-3 active:opacity-60 transition-opacity disabled:opacity-40"
            >
              {t("minyan.cancelMinyan")}
            </button>
          </div>
        )}
        {cancelWindowClosed && (
          <p className="text-[11px] text-center text-ink-soft">{t("minyan.cancelWindowClosed")}</p>
        )}
      </div>

      <Link to="/home" className="hidden" aria-hidden />
    </MobileFrame>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  isLast,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <div
      className={`px-4 py-3.5 flex items-center gap-3 relative ${
        !isLast ? "after:absolute after:left-16 after:right-0 after:bottom-0 after:h-px after:bg-hairline" : ""
      }`}
    >
      <div className="h-9 w-9 rounded-full bg-surface-muted flex items-center justify-center shrink-0">
        <Icon className="h-[18px] w-[18px] text-ink-soft" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-wider text-ink-soft">{label}</div>
        <div className="text-[15px] text-ink leading-snug">{value}</div>
      </div>
    </div>
  );
}
