import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader } from "@/components/ui-bits";
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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { joinMinyan, leaveMinyan, type MinyanRow } from "@/hooks/use-minyanim";
import { openDirections } from "@/lib/directions";
import { shareAny, appOrigin } from "@/lib/share";
import { tapLight, tapMedium } from "@/lib/haptics";
import { navigateBack } from "@/lib/navigate-back";

export const Route = createFileRoute("/minyan")({
  validateSearch: (s: Record<string, unknown>) => ({
    id: typeof s.id === "string" ? s.id : undefined,
  }),
  component: Details,
});

const NEEDED = 10;
const SECONDARY_BTN =
  "flex items-center justify-center gap-2 rounded-2xl bg-surface-muted text-ink py-3.5 text-[14px] font-medium active:scale-[0.99] disabled:opacity-45 disabled:cursor-not-allowed";

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
  const router = useRouter();
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
      setMinyan((m) =>
        m ? { ...m, present_count: (m.present_count ?? 0) + 1 } : m,
      );
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
      setMinyan((m) =>
        m
          ? { ...m, present_count: Math.max(0, (m.present_count ?? 0) - 1) }
          : m,
      );
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
      navigateBack(router.history, () => {
        void navigate({ to: "/home" });
      });
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
            <button
              onClick={() =>
                navigateBack(router.history, () => {
                  void navigate({ to: "/home" });
                })
              }
              className="text-accent font-semibold"
            >
              {t("nav.home")}
            </button>
          </div>
        </div>
      </MobileFrame>
    );
  }

  const orgName = isOrganizer
    ? t("minyan.you")
    : (organizer?.display_name ?? t("minyan.organizer"));
  const canCancel =
    isOrganizer && (!scheduledAt || scheduledAt.getTime() - Date.now() > 20 * 60_000);
  const cancelWindowClosed =
    isOrganizer && scheduledAt && scheduledAt.getTime() - Date.now() <= 20 * 60_000;

  const detailSubtitle = prayerLabel;

  const startsPrimary = isScheduled
    ? scheduledAt
      ? scheduledAt.toLocaleString([], { weekday: "long", hour: "2-digit", minute: "2-digit" })
      : t("minyan.scheduled")
    : startsAt && minyan.scheduled_at
      ? startsAt.toLocaleString([], { dateStyle: "short", timeStyle: "short" })
      : t("home.liveNow");

  return (
    <MobileFrame showLegal={false}>
      <ScreenHeader
        title=""
        back
        right={
          <button
            onClick={handleShare}
            aria-label={t("minyan.share")}
            className="h-10 w-10 rounded-full bg-surface shadow-soft flex items-center justify-center active:scale-95 transition-transform"
          >
            <Share2 className="h-[18px] w-[18px] text-ink" />
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto overscroll-y-contain min-h-0">
        <div className="px-5 pb-8">
          <div className="mb-4">
            <h1 className="text-[22px] font-semibold text-ink leading-tight tracking-tight">
              {minyan.address ?? t("minyan.title")}
            </h1>
            <p className="text-[13px] text-ink-soft mt-1">{detailSubtitle}</p>
          </div>

          <div className="space-y-3">
            {/* Carte présence */}
            <div className="rounded-[1.5rem] bg-surface shadow-soft px-5 pt-5 pb-5 text-center">
              <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-soft">
                {t("home.present")}
              </div>
              <div className="mt-1.5 flex items-baseline justify-center gap-1">
                <span className="font-serif-brand text-[56px] leading-none tracking-tight tabular-nums text-ink">
                  {present}
                </span>
                <span className="text-[18px] font-medium text-ink-soft">/{NEEDED}</span>
              </div>
              <div
                className={`mt-2 text-[14px] font-medium ${complete ? "text-ink-soft" : "text-accent"}`}
              >
                {complete ? t("minyan.complete") : t("minyan.missing", { count: missing })}
              </div>
              <div className="mx-auto mt-4 h-1.5 w-36 rounded-full bg-surface-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${complete ? "bg-success" : "bg-accent"}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Carte infos */}
            <div className="rounded-[1.5rem] bg-surface shadow-soft overflow-hidden">
              <InfoRow
                icon={isScheduled ? CalendarDays : Clock}
                title={startsPrimary}
                subtitle={whenLabel}
              />
              <InfoRow
                icon={MapPin}
                title={minyan.address ?? "—"}
                subtitle={t("minyan.location")}
              />
              <InfoRow
                icon={Users}
                title={
                  isOrganizer
                    ? `${t("minyan.organizer")} · ${t("minyan.you")}`
                    : `${t("minyan.organizer")} · ${orgName}`
                }
                isLast={!minyan.message}
              />
              {minyan.message && (
                <div className="px-4 py-3.5 relative before:absolute before:left-16 before:right-0 before:top-0 before:h-px before:bg-hairline">
                  <blockquote className="border-l-2 border-accent pl-3 text-[13px] italic text-ink-soft">
                    {minyan.message}
                  </blockquote>
                </div>
              )}
            </div>
          </div>

          {/* Actions — juste sous les infos, pas collées en bas avec un vide */}
          <div className="mt-5 space-y-2.5">
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
                disabled={busy || !user}
                onClick={handleJoin}
                className="w-full bg-accent text-accent-foreground font-semibold py-4 rounded-2xl shadow-fab flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99] transition-transform"
              >
                <Check className="h-5 w-5" /> {t("common.join")}
              </button>
            )}
            <div className="grid grid-cols-2 gap-2.5">
              <button type="button" onClick={handleDirections} className={SECONDARY_BTN}>
                <Navigation2 className="h-4 w-4 shrink-0" /> {t("common.directions")}
              </button>
              <button
                type="button"
                onClick={handleOpenChat}
                disabled={!joined}
                className={SECONDARY_BTN}
              >
                <MessageCircle className="h-4 w-4 shrink-0" /> {t("minyan.groupChat")}
              </button>
            </div>

            {canCancel && (
              <div className="pt-2 text-center">
                <p className="text-[11px] text-ink-soft mb-1.5">{t("minyan.cancelMinyanHint")}</p>
                <button
                  disabled={busy}
                  onClick={handleCancelMinyan}
                  className="text-accent text-[13px] font-semibold py-2 px-3 active:opacity-60 transition-opacity disabled:opacity-40"
                >
                  {t("minyan.cancelMinyan")}
                </button>
              </div>
            )}
            {cancelWindowClosed && (
              <p className="text-[11px] text-center text-ink-soft pt-1">
                {t("minyan.cancelWindowClosed")}
              </p>
            )}
          </div>
        </div>
      </div>

      <Link to="/home" className="hidden" aria-hidden />
    </MobileFrame>
  );
}

function InfoRow({
  icon: Icon,
  title,
  subtitle,
  isLast,
}: {
  icon: typeof MapPin;
  title: string;
  subtitle?: string;
  isLast?: boolean;
}) {
  return (
    <div
      className={`px-4 py-3.5 flex items-center gap-3.5 relative ${
        !isLast
          ? "after:absolute after:left-[4.25rem] after:right-0 after:bottom-0 after:h-px after:bg-hairline"
          : ""
      }`}
    >
      <div className="h-10 w-10 rounded-full bg-surface-muted flex items-center justify-center shrink-0">
        <Icon className="h-[18px] w-[18px] text-ink-soft" strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold text-ink leading-snug">{title}</div>
        {subtitle && <div className="text-[12px] text-ink-soft mt-0.5 leading-snug">{subtitle}</div>}
      </div>
    </div>
  );
}
