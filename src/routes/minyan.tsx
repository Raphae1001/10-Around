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

function minutesLeft(targetMs: number, nowMs: number): number {
  return Math.max(0, Math.ceil((targetMs - nowMs) / 60000));
}

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
      const { data, error } = await supabase.rpc("get_minyan_by_id", { _id: id }).maybeSingle();
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

  // Realtime above only delivers once you've joined or created this minyan
  // (RLS-gated, by design — see 20260726121500_close_world_read_rls.sql).
  // While just browsing, poll the live count instead so "7/10" still ticks
  // up before you decide to join.
  useEffect(() => {
    if (!id || joined) return;
    const i = setInterval(() => {
      void supabase
        .rpc("get_minyan_by_id", { _id: id })
        .maybeSingle()
        .then(({ data }) => {
          if (data) setMinyan(data as MinyanRow);
        });
    }, 8000);
    return () => clearInterval(i);
  }, [id, joined]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(i);
  }, []);

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

  async function handleJoin(readyNow: boolean) {
    if (!minyan || !user) return;
    void tapMedium();
    setBusy(true);
    const { error } = await joinMinyan(minyan.id, user.id, readyNow);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      setJoined(true);
      setMinyan((m) => (m ? { ...m, present_count: (m.present_count ?? 0) + 1 } : m));
      toast.success(t("minyan.youreIn"));
      navigate({ to: "/success", search: { id: minyan.id } });
    }
  }

  async function handleCreatorDecide(hasMinyan: boolean) {
    if (!minyan) return;
    void tapMedium();
    setBusy(true);
    const { error } = await supabase.rpc("creator_decide_minyan", {
      _id: minyan.id,
      _has_minyan: hasMinyan,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (hasMinyan) {
      toast.success(t("minyan.decisionYesOk"));
    } else {
      toast.success(t("minyan.cancelledOk"));
      navigateBack(router.history, () => {
        void navigate({ to: "/home" });
      });
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
      setMinyan((m) => (m ? { ...m, present_count: Math.max(0, (m.present_count ?? 0) - 1) } : m));
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
    void shareAny({ title: `10 Around — ${prayerLabel}`, text, url });
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

  // Never show the organizer's real name to other participants — privacy.
  const orgName = isOrganizer ? t("minyan.you") : t("minyan.organizer");
  // Street minyanim: organizer can cancel any time. Scheduled keeps the
  // 20-min-before-start protection for joiners (matches cancel_my_minyan).
  const canCancel =
    isOrganizer &&
    (!isScheduled || !scheduledAt || scheduledAt.getTime() - Date.now() > 20 * 60_000);
  const cancelWindowClosed =
    isOrganizer && isScheduled && scheduledAt && scheduledAt.getTime() - Date.now() <= 20 * 60_000;

  const detailSubtitle = prayerLabel;

  const isStreet = minyan.type === "street";
  const deadlineMs = startsAtIso ? new Date(startsAtIso).getTime() : null;
  const arrivalDeadlineMs = minyan.arrival_deadline
    ? new Date(minyan.arrival_deadline).getTime()
    : null;
  const confirmationState: "pending" | "waiting" | "arriving" | "started" | "decision" | null =
    !isStreet
      ? null
      : minyan.awaiting_creator_decision
        ? "decision"
        : arrivalDeadlineMs != null
          ? now < arrivalDeadlineMs
            ? "arriving"
            : "started"
          : minyan.confirmed_at
            ? "waiting"
            : "pending";

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

          {confirmationState && confirmationState !== "started" && (
            <div
              className={`rounded-2xl p-4 mb-3 text-center ${
                confirmationState === "arriving"
                  ? "bg-success/12 border border-success/30"
                  : "bg-surface shadow-soft"
              }`}
            >
              {confirmationState === "pending" && deadlineMs != null && (
                <p className="text-[13px] text-ink-soft">
                  {t("minyan.waitingForConfirmation")} ·{" "}
                  {t("minyan.confirmationCountdown", { count: minutesLeft(deadlineMs, now) })}
                </p>
              )}
              {confirmationState === "waiting" && deadlineMs != null && (
                <p className="text-[13px] text-ink-soft">
                  {t("minyan.confirmedWaiting", {
                    time: new Date(deadlineMs).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
                  })}
                </p>
              )}
              {confirmationState === "arriving" && arrivalDeadlineMs != null && (
                <p className="text-[15px] font-semibold text-success">
                  {t("minyan.confirmedArriving", { count: minutesLeft(arrivalDeadlineMs, now) })}
                </p>
              )}
              {confirmationState === "decision" &&
                (isOrganizer ? (
                  <div className="space-y-3">
                    <p className="text-[13px] text-ink-soft">{t("minyan.decisionPrompt")}</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleCreatorDecide(false)}
                        className="flex-1 rounded-xl bg-surface-muted py-2.5 text-sm font-semibold disabled:opacity-50"
                      >
                        {t("minyan.decisionCancel")}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleCreatorDecide(true)}
                        className="flex-1 rounded-xl bg-accent text-accent-foreground py-2.5 text-sm font-semibold disabled:opacity-50"
                      >
                        {t("minyan.decisionYes")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[13px] text-ink-soft">{t("minyan.decisionPendingOther")}</p>
                ))}
            </div>
          )}

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
              <>
                <button
                  disabled={busy || !user}
                  onClick={() => handleJoin(true)}
                  className="w-full bg-accent text-accent-foreground font-semibold py-4 rounded-2xl shadow-fab flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99] transition-transform"
                >
                  <Check className="h-5 w-5" /> {t("minyan.readyNow")}
                </button>
                <button
                  type="button"
                  disabled={busy || !user}
                  onClick={() => handleJoin(false)}
                  className="w-full text-center text-[13px] font-semibold text-accent py-1 active:opacity-60 transition-opacity disabled:opacity-40"
                >
                  {t("minyan.willWaitCta")}
                </button>
              </>
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
        {subtitle && (
          <div className="text-[12px] text-ink-soft mt-0.5 leading-snug">{subtitle}</div>
        )}
      </div>
    </div>
  );
}
