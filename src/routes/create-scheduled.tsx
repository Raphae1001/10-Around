import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader } from "@/components/ui-bits";
import { Sunrise, Sun, Moon, MapPin, CalendarClock, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { AddressAutocomplete, type AddressPick } from "@/components/AddressAutocomplete";
import { DateTimeField } from "@/components/DateTimeField";

export const Route = createFileRoute("/create-scheduled")({
  validateSearch: (s: Record<string, unknown>): { repeat?: string } => ({
    repeat: typeof s.repeat === "string" ? s.repeat : undefined,
  }),
  component: CreateScheduled,
});

const PRAYER_MAP: Record<string, "shacharit" | "mincha" | "maariv"> = {
  Shacharit: "shacharit",
  Mincha: "mincha",
  Maariv: "maariv",
};

function CreateScheduled() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  const [address, setAddress] = useState("");
  const [pick, setPick] = useState<AddressPick | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [prayer, setPrayer] = useState("Mincha");
  const [nusach, setNusach] = useState("Any");
  const [comment, setComment] = useState("");

  const prayers = [
    { name: "Shacharit", icon: Sunrise },
    { name: "Mincha", icon: Sun },
    { name: "Maariv", icon: Moon },
  ];

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <MobileFrame>
      <ScreenHeader
        title={t("createScheduled.title")}
        subtitle={t("createScheduled.subtitle")}
        back
      />

      <div className="px-5 space-y-6 pb-8 w-full max-w-full">
        <Section step="1" title={t("createScheduled.whereTitle")}>
          <AddressAutocomplete
            value={address}
            onChange={(v) => {
              setAddress(v);
              setPick(null);
            }}
            onPick={setPick}
            placeholder={t("createScheduled.addressPh")}
          />
          <p className="text-[11px] text-muted-foreground mt-2">
            {t("createScheduled.addressHint")}
          </p>
        </Section>

        <Section step="2" title={t("createScheduled.whenTitle")}>
          <div className="grid grid-cols-2 gap-3">
            <DateTimeField
              type="date"
              value={date}
              min={todayStr}
              onChange={setDate}
              label={t("createScheduled.date")}
              emptyHint={t("createScheduled.dateHint")}
            />
            <DateTimeField
              type="time"
              value={time}
              onChange={setTime}
              label={t("createScheduled.time")}
              emptyHint={t("createScheduled.timeHint")}
            />
          </div>
        </Section>

        <Section step="3" title={t("create.whichPrayer")}>
          <div className="grid grid-cols-3 gap-2 w-full">
            {prayers.map(({ name, icon: Icon }) => {
              const active = prayer === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setPrayer(name)}
                  className={`min-w-0 flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl transition-all active:scale-[0.97] ${
                    active
                      ? "bg-accent text-accent-foreground"
                      : "bg-surface-muted text-ink"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 shrink-0 ${active ? "text-accent-foreground" : "text-ink-soft"}`}
                  />
                  <span className="text-[11px] font-semibold truncate w-full text-center">
                    {t(`prayer.${PRAYER_MAP[name]}`)}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>

        <Section step="4" title={t("create.nusach")}>
          <div className="flex flex-wrap gap-2">
            {["Any", "Ashkenaz", "Sephard", "Nusach Ari", "Edot Mizrach"].map((n) => {
              const a = nusach === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNusach(n)}
                  className={`rounded-full px-3 py-2 text-xs font-medium transition-colors shrink-0 ${
                    a ? "bg-accent text-accent-foreground" : "bg-surface-muted text-ink"
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </Section>

        <Section step="5" title={t("create.commentLabel")}>
          <textarea
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("create.commentPh")}
            className="w-full rounded-2xl border border-border bg-surface p-3 text-base outline-none focus:border-accent"
          />
        </Section>

        <div className="rounded-2xl bg-gold-soft/60 border border-accent/20 p-4">
          <div className="text-[11px] text-muted-foreground space-y-1.5">
            <div className="flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5 shrink-0 text-accent" />
              <span>
                {date && time
                  ? new Date(`${date}T${time}`).toLocaleString(undefined, {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : t("createScheduled.previewNoDate")}
              </span>
            </div>
            <div className="flex items-start gap-1.5">
              <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-accent" />
              <span className="truncate">{address || t("createScheduled.previewNoAddress")}</span>
            </div>
            <div>
              {t(`prayer.${PRAYER_MAP[prayer]}`)} · {nusach}
            </div>
          </div>
        </div>

        <div className="pt-1">
          <button
            type="button"
            onClick={publish}
            disabled={publishing}
            className="flex items-center justify-center gap-2 w-full rounded-2xl bg-accent text-accent-foreground font-semibold py-4 shadow-fab text-base transition-transform active:scale-[0.99] disabled:opacity-60"
          >
            {publishing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <CalendarClock className="h-5 w-5" />
            )}
            {t("createScheduled.publish")}
          </button>
          <p className="text-center text-[11px] text-muted-foreground mt-2">
            {t("createScheduled.publishHint")}
          </p>
        </div>
      </div>
    </MobileFrame>
  );

  async function publish() {
    if (!user) {
      toast.error(t("create.signInFirst"));
      navigate({ to: "/auth" });
      return;
    }
    if (!pick || pick.lat == null || pick.lng == null) {
      toast.error(t("createScheduled.errNoAddress"));
      return;
    }
    if (!date || !time) {
      toast.error(t("createScheduled.errNoDate"));
      return;
    }

    const scheduledAt = new Date(`${date}T${time}`);
    if (scheduledAt.getTime() <= Date.now()) {
      toast.error(t("createScheduled.errPast"));
      return;
    }

    setPublishing(true);
    try {
      const { data: nearbyCount, error: rpcErr } = await supabase.rpc("count_minyanim_within", {
        lat: pick.lat,
        lng: pick.lng,
        radius_m: 200,
        _start: scheduledAt.toISOString(),
      });
      if (rpcErr) throw rpcErr;
      if ((nearbyCount ?? 0) > 0) {
        toast.error(t("create.duplicateNearby"), { description: t("create.joinInstead") });
        setPublishing(false);
        return;
      }

      const expiresAt = new Date(scheduledAt.getTime() + 40 * 60 * 1000).toISOString();
      const { data: created, error } = await supabase
        .from("minyanim")
        .insert({
          creator_id: user.id,
          type: "scheduled",
          prayer: PRAYER_MAP[prayer] ?? "mincha",
          nusach,
          message: comment || null,
          address: pick.address,
          latitude: pick.lat,
          longitude: pick.lng,
          is_live: false,
          scheduled_at: scheduledAt.toISOString(),
          present_count: 1,
          extra_present: 0,
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from("minyan_participants")
        .insert({ minyan_id: created.id, user_id: user.id });

      void import("@/lib/analytics").then(({ track }) =>
        track("create_minyan", { type: "scheduled", prayer: PRAYER_MAP[prayer], scheduled: true }),
      );
      toast.success(t("createScheduled.published"));
      navigate({ to: "/success", search: { id: created.id } });
    } catch (e) {
      toast.error(t("createScheduled.errPublish"), { description: (e as Error).message });
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
