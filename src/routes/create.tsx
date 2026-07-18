import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader } from "@/components/ui-bits";
import {
  Sunrise,
  Sun,
  Moon,
  MapPin,
  Users,
  Minus,
  Plus,
  Loader2,
  RotateCcw,
  Check,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useGeolocation } from "@/hooks/use-geolocation";
import { supabase } from "@/integrations/supabase/client";
import { reverseGeocode } from "@/lib/geocoding";

export const Route = createFileRoute("/create")({
  validateSearch: (s: Record<string, unknown>): { from?: "map" } => ({
    from: s.from === "map" ? "map" : undefined,
  }),
  component: Create,
});

const PRAYER_MAP: Record<string, "shacharit" | "mincha" | "maariv"> = {
  Shacharit: "shacharit",
  Mincha: "mincha",
  Maariv: "maariv",
};

const PRAYER_DISPLAY: Record<string, string> = {
  shacharit: "Shacharit",
  mincha: "Mincha",
  maariv: "Maariv",
};

type LastMinyan = {
  prayer: string;
  nusach: string;
  present_count: number | null;
  message: string | null;
};

function Create() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { position, request: requestGeo } = useGeolocation(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  const { from } = Route.useSearch();
  const [prayer, setPrayer] = useState("Mincha");
  const [when, setWhen] = useState("Now");
  const [present, setPresent] = useState(3);
  const [nusach, setNusach] = useState("Any");
  const [comment, setComment] = useState("");
  const [street, setStreet] = useState("");
  const [streetAuto, setStreetAuto] = useState(false);
  const [lastMinyan, setLastMinyan] = useState<LastMinyan | null>(null);
  const [repeated, setRepeated] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void supabase
      .from("minyanim")
      .select("prayer,nusach,present_count,message")
      .eq("creator_id", user.id)
      .eq("type", "street")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) setLastMinyan(data as LastMinyan);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  function repeatLast() {
    if (!lastMinyan) return;
    setPrayer(PRAYER_DISPLAY[lastMinyan.prayer] ?? "Mincha");
    setNusach(lastMinyan.nusach || "Any");
    setPresent(Math.max(1, lastMinyan.present_count ?? 3));
    setComment(lastMinyan.message ?? "");
    setRepeated(true);
  }

  useEffect(() => {
    if (from === "map") void requestGeo();
  }, [from, requestGeo]);

  useEffect(() => {
    if (!position) requestGeo();
  }, [position, requestGeo]);

  useEffect(() => {
    if (!position || streetAuto) return;
    let cancelled = false;
    reverseGeocode(position.lat, position.lng).then((addr) => {
      if (!cancelled && addr) {
        setStreet(addr);
        setStreetAuto(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [position, streetAuto]);

  const prayers = [
    { name: "Shacharit", icon: Sunrise },
    { name: "Mincha", icon: Sun },
    { name: "Maariv", icon: Moon },
  ];

  const locationSummary = street || t("create.streetPh");

  return (
    <MobileFrame>
      <ScreenHeader title={t("create.title")} subtitle={t("create.subtitle")} back />

      <div className="px-6 space-y-5 pb-4">
        {lastMinyan && !repeated && (
          <button
            onClick={repeatLast}
            className="w-full rounded-2xl border border-gold/40 bg-gold/5 p-3 flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
          >
            <div className="h-9 w-9 rounded-xl gold-gradient text-gold-foreground flex items-center justify-center shrink-0">
              <RotateCcw className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold leading-tight">{t("create.repeatLast")}</div>
              <div className="text-[11px] text-muted-foreground truncate">
                {t(`prayer.${lastMinyan.prayer}`, { defaultValue: lastMinyan.prayer })} ·{" "}
                {lastMinyan.nusach}
              </div>
            </div>
          </button>
        )}

        <Section step="1" title={t("create.whereAreYou")}>
          <div className="relative rounded-2xl border border-border bg-surface focus-within:border-gold transition-colors">
            <div className="flex items-center gap-2 px-3 pt-3">
              <MapPin className="h-4 w-4 text-gold shrink-0" strokeWidth={2.2} />
              <input
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder={t("create.streetPh")}
                className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {position && (
                <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-success/12 text-success px-2 py-0.5 text-[10px] font-semibold tracking-wide">
                  <Check className="h-3 w-3" strokeWidth={2.6} />
                  {t("create.gpsDetected")}
                </span>
              )}
            </div>
            <p className="px-3 pb-2.5 pt-1 text-[11px] text-muted-foreground leading-snug pl-9">
              {position ? t("create.locationFromGps") : t("create.allowLocationToPublish")}
            </p>
          </div>
        </Section>

        <Section step="2" title={t("create.whichPrayer")}>
          <div className="grid grid-cols-3 gap-2">
            {prayers.map(({ name, icon: Icon }) => {
              const active = prayer === name;
              return (
                <button
                  key={name}
                  onClick={() => setPrayer(name)}
                  className={`flex flex-col items-center gap-2 py-4 rounded-2xl transition-all active:scale-[0.97] ${
                    active
                      ? "bg-accent text-accent-foreground"
                      : "bg-surface-muted text-ink"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${active ? "text-accent-foreground" : "text-ink-soft"}`} />
                  <span className="text-xs font-semibold">{t(`prayer.${PRAYER_MAP[name]}`)}</span>
                </button>
              );
            })}
          </div>
        </Section>

        <Section step="3" title={t("create.startingIn")}>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-1 px-1">
            {["Now", "+5 min", "+10 min", "+15 min", "+30 min", "+1 h"].map((opt) => {
              const a = when === opt;
              return (
                <button
                  key={opt}
                  onClick={() => setWhen(opt)}
                  className={`shrink-0 rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
                    a ? "bg-accent text-accent-foreground" : "bg-surface-muted text-ink"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </Section>

        <Section step="4" title={t("create.howMany")}>
          <div className="rounded-2xl bg-surface shadow-soft p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setPresent(Math.max(1, present - 1))}
                className="h-12 w-12 rounded-xl bg-surface-muted flex items-center justify-center active:scale-[0.97] transition-transform"
                aria-label="Less"
              >
                <Minus className="h-4 w-4" />
              </button>
              <div className="text-center">
                <div className="font-serif-brand text-[36px] leading-none tabular-nums text-ink">
                  {present}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-ink-soft mt-1">
                  {t("create.alreadyHere")}
                </div>
              </div>
              <button
                onClick={() => setPresent(present + 1)}
                className="h-12 w-12 rounded-xl bg-accent text-accent-foreground flex items-center justify-center active:scale-[0.97] transition-transform"
                aria-label="More"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 h-1.5 rounded-full bg-surface-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${Math.min(100, (present / 10) * 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-ink-soft mt-2">
              {present >= 10
                ? t("create.minyanReady")
                : t("create.missing", { count: Math.max(0, 10 - present) })}
            </p>
          </div>
        </Section>

        <Section step="5" title={t("create.nusach")}>
          <div className="flex gap-2 flex-wrap">
            {["Any", "Ashkenaz", "Sephard", "Nusach Ari", "Edot Mizrach"].map((n) => {
              const a = nusach === n;
              return (
                <button
                  key={n}
                  onClick={() => setNusach(n)}
                  className={`rounded-full px-3.5 py-2 text-xs font-medium transition-colors ${
                    a ? "bg-accent text-accent-foreground" : "bg-surface-muted text-ink"
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </Section>

        <Section step="6" title={t("create.commentLabel")}>
          <textarea
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("create.commentPh")}
            className="w-full rounded-2xl border border-border bg-surface p-3 text-sm outline-none focus:border-gold"
          />
          <p className="text-[10px] text-muted-foreground mt-1">{t("create.commentVisible")}</p>
        </Section>

        <div className="rounded-2xl bg-gold-soft/40 border border-gold/30 p-4">
          <div className="text-[11px] text-muted-foreground space-y-1">
            <div>
              <span className="font-semibold text-foreground">
                {t(`prayer.${PRAYER_MAP[prayer]}`)}
              </span>{" "}
              · {when} · {present} {t("create.here")} ·{" "}
              {present >= 10
                ? t("create.minyanReady")
                : t("create.missing", { count: Math.max(0, 10 - present) })}
            </div>
            <div className="flex items-start gap-1">
              <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
              <span className="truncate">{locationSummary}</span>
            </div>
            <div>
              {t("create.nusach")}: <span className="text-foreground">{nusach}</span>
            </div>
            {comment && <div className="italic">"{comment}"</div>}
          </div>
        </div>
      </div>

      <div className="sticky bottom-24 border-t border-hairline bg-surface/95 backdrop-blur px-6 pt-3 pb-2">
        <button
          onClick={publish}
          disabled={publishing}
          className="flex items-center justify-center gap-2 w-full rounded-2xl bg-accent text-accent-foreground font-semibold py-4 shadow-fab text-base transition-transform active:scale-[0.99] disabled:opacity-60"
        >
          {publishing ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Users className="h-5 w-5" />
          )}
          {t("create.publish")}
        </button>
        <p className="text-center text-[11px] text-ink-soft mt-2">
          {position ? t("create.gpsShared") : t("create.allowLocationToPublish")}
        </p>
      </div>
    </MobileFrame>
  );

  async function publish() {
    if (!user) {
      toast.error(t("create.signInFirst"));
      navigate({ to: "/auth" });
      return;
    }

    if (!position) {
      requestGeo();
      toast.error(t("create.needLocationLive"));
      return;
    }

    setPublishing(true);
    try {
      const lat = position.lat;
      const lng = position.lng;
      const now = Date.now();

      let scheduled_at: string | null = null;
      if (when !== "Now") {
        const offsetMin =
          when === "+1 h"
            ? 60
            : when.startsWith("+")
              ? parseInt(when.replace(/\D/g, "") || "0", 10)
              : 0;
        if (offsetMin > 0) {
          scheduled_at = new Date(now + offsetMin * 60 * 1000).toISOString();
        }
      }

      const startIso = scheduled_at ?? new Date(now).toISOString();
      const { data: nearbyCount, error: rpcErr } = await supabase.rpc("count_minyanim_within", {
        lat,
        lng,
        radius_m: 200,
        _start: startIso,
      });
      if (rpcErr) throw rpcErr;
      if ((nearbyCount ?? 0) > 0) {
        toast.error(t("create.duplicateNearby"), { description: t("create.joinInstead") });
        setPublishing(false);
        return;
      }

      const startMs = scheduled_at ? new Date(scheduled_at).getTime() : now;
      const expires_at = new Date(startMs + 2 * 60 * 60 * 1000).toISOString();

      const { data: created, error } = await supabase
        .from("minyanim")
        .insert({
          creator_id: user.id,
          type: "street",
          prayer: PRAYER_MAP[prayer] ?? "mincha",
          nusach,
          message: comment || null,
          address: locationSummary,
          latitude: lat,
          longitude: lng,
          is_live: true,
          scheduled_at,
          present_count: present,
          extra_present: Math.max(0, present - 1),
          expires_at,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from("minyan_participants")
        .insert({ minyan_id: created.id, user_id: user.id });

      void import("@/lib/analytics").then(({ track }) =>
        track("create_minyan", {
          type: "street",
          prayer: prayer.toLowerCase(),
          scheduled: Boolean(scheduled_at),
        }),
      );
      toast.success(t("create.published"));
      navigate({ to: "/success", search: { id: created.id } });
    } catch (e) {
      toast.error(t("create.errPublish"), { description: (e as Error).message });
    } finally {
      setPublishing(false);
    }
  }
}

function Section({
  step,
  title,
  children,
}: {
  step: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full min-w-0">
      <div className="flex items-baseline gap-2 mb-2.5">
        <span className="text-[12px] font-semibold tabular-nums text-accent">{step}.</span>
        <h3 className="text-[13px] font-semibold text-ink tracking-tight">{title}</h3>
      </div>
      {children}
    </div>
  );
}
