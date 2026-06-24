import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader, StatusPill } from "@/components/ui-bits";
import { MapCanvas } from "@/components/MapCanvas";
import { MapPin, Clock, Navigation2, Users, Check, Loader2, X, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { joinMinyan, leaveMinyan, type MinyanRow } from "@/hooks/use-minyanim";
import { openDirections } from "@/lib/directions";
import { shareAny, appOrigin } from "@/lib/share";

export const Route = createFileRoute("/minyan")({
  validateSearch: (s: Record<string, unknown>) => ({ id: typeof s.id === "string" ? s.id : undefined }),
  component: Details,
});

const NEEDED = 10;

function relTime(iso: string | null, t: (k: string, o?: any) => string) {
  if (!iso) return t("home.liveNow");
  const diffMin = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  if (Math.abs(diffMin) < 1) return t("home.liveNow");
  if (diffMin > 0) {
    if (diffMin < 60) return `in ${diffMin} min`;
    const h = Math.round(diffMin / 60);
    return `in ${h} h`;
  }
  const past = -diffMin;
  if (past < 60) return `${past} min ago`;
  return `${Math.round(past / 60)} h ago`;
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
      if (!id) { setNotFound(true); setLoading(false); return; }
      setLoading(true);
      const { data, error } = await supabase.from("minyanim").select("*").eq("id", id).maybeSingle();
      if (cancelled) return;
      if (error) { toast.error(t("minyan.loadFailed")); setLoading(false); return; }
      if (!data) { setNotFound(true); setLoading(false); return; }
      setMinyan(data as MinyanRow);

      const { data: prof } = await supabase
        .from("profiles").select("display_name").eq("id", (data as any).creator_id).maybeSingle();
      if (!cancelled) setOrganizer(prof as any);

      if (user) {
        const { data: p } = await supabase
          .from("minyan_participants").select("id")
          .eq("minyan_id", id).eq("user_id", user.id).maybeSingle();
        if (!cancelled) setJoined(!!p);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [id, user, t]);

  // Realtime: refresh count when participants change for this minyan
  useEffect(() => {
    if (!id) return;
    const ch = supabase.channel(`minyan-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "minyanim", filter: `id=eq.${id}` },
        (payload) => { if (payload.new) setMinyan(payload.new as MinyanRow); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  const startsAtIso = minyan?.scheduled_at ?? minyan?.created_at ?? null;
  const startsAt = startsAtIso ? new Date(startsAtIso) : null;
  const expiresAt = minyan?.expires_at ? new Date(minyan.expires_at) : null;
  const prayerLabel = minyan ? t(`prayer.${minyan.prayer}`, { defaultValue: minyan.prayer }) : "";
  const whenLabel = useMemo(() => relTime(minyan?.scheduled_at ?? null, t), [minyan?.scheduled_at, t]);

  const present = minyan?.present_count ?? 0;
  const missing = Math.max(0, NEEDED - present);
  const complete = present >= NEEDED;
  const progress = Math.min(100, (present / NEEDED) * 100);

  const isOrganizer = !!user && !!minyan && minyan.creator_id === user.id;

  async function handleJoin() {
    if (!minyan || !user) return;
    setBusy(true);
    const { error } = await joinMinyan(minyan.id, user.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else { setJoined(true); toast.success(t("minyan.youreIn")); navigate({ to: "/success", search: { id: minyan.id } }); }
  }

  async function handleLeave() {
    if (!minyan || !user) return;
    setBusy(true);
    const { error } = await leaveMinyan(minyan.id, user.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else { setJoined(false); toast.success(t("common.cancel")); }
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
      void import("@/lib/analytics").then(({ track }) => track("cancel_minyan", { minyan_id: minyan.id }));
      toast.success(t("minyan.cancelledOk"));
      navigate({ to: "/home" });
    }
  }

  function handleDirections() {
    if (!minyan) return;
    openDirections(minyan.latitude, minyan.longitude, minyan.address ?? undefined);
  }

  function handleWhatsApp() {
    if (!minyan) return;
    const url = `${appOrigin()}/minyan/${minyan.id}`;
    const when = startsAt ? startsAt.toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : t("home.liveNow");
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
    const { data: tid, error } = await supabase.rpc("get_or_create_minyan_chat", { _minyan_id: minyan.id });
    if (error || !tid) {
      toast.error("Join the minyan first to access the group chat.", { description: error?.message });
      return;
    }
    void import("@/lib/analytics").then(({ track }) => track("open_chat", { minyan_id: minyan.id }));
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
            <button onClick={() => navigate({ to: "/home" })} className="text-gold font-semibold">{t("nav.home")}</button>
          </div>
        </div>
      </MobileFrame>
    );
  }

  const orgInitial = (organizer?.display_name?.[0] ?? minyan.address?.[0] ?? "?").toUpperCase();
  const orgName = isOrganizer ? t("minyan.you") : organizer?.display_name ?? t("minyan.organizer");

  return (
    <MobileFrame>
      <ScreenHeader
        title={minyan.address ?? t("minyan.title")}
        subtitle={t("minyan.subtitle", { prayer: prayerLabel, when: whenLabel })}
        back
      />

      <Link to="/map" search={{ id: minyan.id }} className="mx-6 block rounded-3xl overflow-hidden border border-border shadow-soft hover:border-gold/60 transition-colors">
        <MapCanvas height="h-40" pins={[{ x: 50, y: 50, tone: complete ? "success" : "urgent", pulse: !complete, label: complete ? "✓" : "!", size: "lg" }]} />
      </Link>

      <div className="px-6 mt-4">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusPill tone={complete ? "success" : "urgent"}>
            {complete ? t("minyan.complete") : t("minyan.missing", { count: missing })}
          </StatusPill>
          <StatusPill tone="gold">{minyan.nusach ?? t("minyan.nusachAny")}</StatusPill>
          <StatusPill>{t(`ctx.${minyan.type}` as const, { defaultValue: minyan.type })}</StatusPill>
        </div>
      </div>

      <div className="mx-6 mt-4 rounded-2xl bg-surface border border-border p-4 shadow-soft">
        <div className="flex items-center justify-between mb-2">
          <div className="font-display text-xl"><span>{present}</span>/{NEEDED}</div>
          <div className="text-xs text-muted-foreground">{complete ? t("minyan.complete") : t("minyan.almostReady")}</div>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className={`h-full ${complete ? "bg-success" : "gold-gradient"}`} style={{ width: `${progress}%` }} />
        </div>
        {minyan.message && (
          <p className="text-xs italic text-muted-foreground mt-3">"{minyan.message}"</p>
        )}
      </div>

      <div className="mx-6 mt-4 rounded-2xl bg-surface border border-border p-4 flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl bg-navy text-white flex items-center justify-center font-bold">{orgInitial}</div>
        <div className="flex-1">
          <div className="text-sm font-semibold">{orgName} · {t("minyan.organizer")}</div>
        </div>
        <Check className="h-5 w-5 text-success" />
      </div>

      <div className="mx-6 mt-4 rounded-2xl bg-surface border border-border divide-y divide-border">
        <Row icon={Clock} label={t("minyan.startsAt")} value={startsAt ? startsAt.toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : t("home.liveNow")} />
        <Row icon={MapPin} label={t("minyan.location")} value={minyan.address ?? "—"} />
        <Row icon={Users} label={t("minyan.type")} value={t(`ctx.${minyan.type}` as const, { defaultValue: minyan.type })} />
        {expiresAt && (
          <Row icon={Clock} label={t("minyan.expiresAt", { when: expiresAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) })} value={`${Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 60000))} min`} />
        )}
      </div>

      <div className="px-6 pt-5 pb-2 space-y-2">
        {joined ? (
          <button
            disabled={busy}
            onClick={handleLeave}
            className="w-full bg-surface border border-urgent text-urgent font-semibold py-4 rounded-2xl flex items-center justify-center gap-2"
          >
            <X className="h-5 w-5" /> {t("minyan.cancel")}
          </button>
        ) : (
          <button
            disabled={busy || !user || isOrganizer}
            onClick={handleJoin}
            className="w-full gold-gradient text-gold-foreground font-semibold py-4 rounded-2xl shadow-glow-gold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Check className="h-5 w-5" /> {isOrganizer ? t("minyan.you") : t("minyan.imComing")}
          </button>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleDirections}
            className="bg-surface border border-border font-medium py-3 rounded-2xl text-sm flex items-center justify-center gap-2 hover:border-gold/60"
          >
            <Navigation2 className="h-4 w-4 text-gold" /> {t("common.directions")}
          </button>
          <button
            onClick={handleOpenChat}
            disabled={!joined && !isOrganizer}
            className="bg-navy text-white font-semibold py-3 rounded-2xl text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <MessageCircle className="h-4 w-4" /> Group chat
          </button>
        </div>

        {isOrganizer && (!minyan.scheduled_at || (new Date(minyan.scheduled_at).getTime() - Date.now()) > 20 * 60_000) && (
          <button
            disabled={busy}
            onClick={handleCancelMinyan}
            className="w-full mt-2 bg-surface border border-urgent text-urgent font-semibold py-3 rounded-2xl text-sm flex items-center justify-center gap-2"
          >
            <X className="h-4 w-4" /> {t("minyan.cancelMinyan")}
          </button>
        )}
        {isOrganizer && minyan.scheduled_at && (new Date(minyan.scheduled_at).getTime() - Date.now()) <= 20 * 60_000 && (
          <p className="mt-2 text-[11px] text-center text-muted-foreground">
            {t("minyan.cancelWindowClosed")}
          </p>
        )}
      </div>

      {/* keep Link import used for type safety / future use */}
      <Link to="/home" className="hidden" aria-hidden />
    </MobileFrame>
  );
}

function Row({ icon: Icon, label, value }: any) {
  return (
    <div className="p-4 flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div className="flex-1">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-sm">{value}</div>
      </div>
    </div>
  );
}

