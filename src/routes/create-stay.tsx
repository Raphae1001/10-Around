import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader } from "@/components/ui-bits";
import { Sunrise, Sun, Moon, Globe2, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { AddressAutocomplete, type AddressPick } from "@/components/AddressAutocomplete";
import { DateTimeField } from "@/components/DateTimeField";
import { stayCityKey } from "@/lib/stay";

export const Route = createFileRoute("/create-stay")({
  component: CreateStay,
});

const PRAYER_MAP: Record<string, "shacharit" | "mincha" | "maariv"> = {
  Shacharit: "shacharit",
  Mincha: "mincha",
  Maariv: "maariv",
};

function CreateStay() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  const [city, setCity] = useState("");
  const [pick, setPick] = useState<AddressPick | null>(null);
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [note, setNote] = useState("");
  const [addMinyan, setAddMinyan] = useState(false);
  const [minyanDate, setMinyanDate] = useState("");
  const [minyanTime, setMinyanTime] = useState("");
  const [prayer, setPrayer] = useState("Mincha");
  const [nusach, setNusach] = useState("Any");

  const todayStr = new Date().toISOString().slice(0, 10);
  const prayers = [
    { name: "Shacharit", icon: Sunrise },
    { name: "Mincha", icon: Sun },
    { name: "Maariv", icon: Moon },
  ];

  return (
    <MobileFrame>
      <ScreenHeader title={t("createStay.title")} subtitle={t("createStay.subtitle")} back />

      <div className="px-5 space-y-6 pb-8 w-full max-w-full">
        <Section step="1" title={t("createStay.whereTitle")}>
          <AddressAutocomplete
            value={city}
            onChange={(v) => {
              setCity(v);
              setPick(null);
            }}
            onPick={setPick}
            placeholder={t("createStay.cityPh")}
            citiesOnly
          />
          <p className="text-[11px] text-muted-foreground mt-2">{t("createStay.cityHint")}</p>
        </Section>

        <Section step="2" title={t("createStay.whenTitle")}>
          <div className="grid grid-cols-1 gap-3">
            <DateTimeField
              type="date"
              value={dateStart}
              min={todayStr}
              onChange={setDateStart}
              label={t("create.from")}
              emptyHint={t("createStay.fromHint")}
            />
            <DateTimeField
              type="date"
              value={dateEnd}
              min={dateStart || todayStr}
              onChange={setDateEnd}
              label={t("create.to")}
              emptyHint={t("createStay.toHint")}
            />
          </div>
        </Section>

        <Section step="3" title={t("create.commentLabel")}>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("createStay.notePh")}
            className="w-full rounded-2xl border border-border bg-surface p-3 text-base outline-none focus:border-accent"
          />
        </Section>

        <div className="rounded-2xl border border-border bg-surface p-4 space-y-4">
          <button
            type="button"
            onClick={() => setAddMinyan((v) => !v)}
            className="w-full flex items-center justify-between gap-3 text-left"
          >
            <span className="text-sm font-medium text-ink">{t("createStay.addMinyan")}</span>
            <span
              className={`shrink-0 inline-flex rounded-full p-0.5 text-[11px] font-semibold ${
                addMinyan ? "bg-accent/15" : "bg-surface-muted"
              }`}
            >
              <span
                className={`px-2.5 py-1 rounded-full transition-colors ${
                  !addMinyan ? "bg-surface text-ink shadow-soft" : "text-ink-soft"
                }`}
              >
                {t("profile.backupOff")}
              </span>
              <span
                className={`px-2.5 py-1 rounded-full transition-colors ${
                  addMinyan ? "bg-accent text-accent-foreground shadow-soft" : "text-ink-soft"
                }`}
              >
                {t("profile.backupOn")}
              </span>
            </span>
          </button>
          {addMinyan && (
            <div className="space-y-4 pt-1 border-t border-border/60">
              <p className="text-[11px] text-muted-foreground">{t("createStay.addMinyanHint")}</p>
              <div className="grid grid-cols-1 gap-3">
                <DateTimeField
                  type="date"
                  value={minyanDate}
                  min={dateStart || todayStr}
                  max={dateEnd || undefined}
                  onChange={setMinyanDate}
                  label={t("createScheduled.date")}
                  emptyHint={t("createStay.minyanDateHint")}
                />
                <DateTimeField
                  type="time"
                  value={minyanTime}
                  onChange={setMinyanTime}
                  label={t("createScheduled.time")}
                  emptyHint={t("createStay.minyanTimeHint")}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 w-full">
                {prayers.map(({ name, icon: Icon }) => {
                  const active = prayer === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setPrayer(name)}
                      className={`min-w-0 flex flex-col items-center gap-1 py-3 px-1 rounded-xl transition-all ${
                        active
                          ? "bg-accent text-accent-foreground"
                          : "bg-surface-muted text-ink"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 ${active ? "text-accent-foreground" : "text-ink-soft"}`}
                      />
                      <span className="text-[11px] font-semibold truncate w-full text-center">
                        {t(`prayer.${PRAYER_MAP[name]}`)}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2">
                {["Any", "Ashkenaz", "Sephard"].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNusach(n)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium shrink-0 ${
                      nusach === n
                        ? "bg-accent text-accent-foreground"
                        : "bg-surface-muted text-ink"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
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
              <Globe2 className="h-5 w-5" />
            )}
            {t("createStay.publish")}
          </button>
          <p className="text-center text-[11px] text-muted-foreground mt-2">
            {t("createStay.publishHint")}
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

    const cityLabel = (pick?.city || pick?.address || city).trim();
    if (!pick || !cityLabel) {
      toast.error(t("createStay.errNoCity"));
      return;
    }
    if (!dateStart || !dateEnd) {
      toast.error(t("createStay.errNoDates"));
      return;
    }
    if (dateEnd < dateStart) {
      toast.error(t("createStay.errDateOrder"));
      return;
    }

    if (addMinyan) {
      if (!minyanDate || !minyanTime) {
        toast.error(t("createScheduled.errNoDate"));
        return;
      }
      if (minyanDate < dateStart || minyanDate > dateEnd) {
        toast.error(t("createStay.errMinyanInRange"));
        return;
      }
      const scheduledAt = new Date(`${minyanDate}T${minyanTime}`);
      if (scheduledAt.getTime() <= Date.now()) {
        toast.error(t("createScheduled.errPast"));
        return;
      }
    }

    setPublishing(true);
    try {
      const lat = pick.lat ?? 0;
      const lng = pick.lng ?? 0;
      const expiresAt = new Date(`${dateEnd}T23:59:59`).toISOString();

      const { data: stay, error: stayErr } = await supabase
        .from("minyanim")
        .insert({
          creator_id: user.id,
          type: "stay",
          prayer: "mincha",
          nusach: "Any",
          message: note || null,
          address: cityLabel,
          latitude: lat,
          longitude: lng,
          is_live: false,
          trip_start_date: dateStart,
          trip_end_date: dateEnd,
          expires_at: expiresAt,
          present_count: 0,
          extra_present: 0,
        })
        .select()
        .single();

      if (stayErr) throw stayErr;

      await supabase.from("minyan_participants").insert({ minyan_id: stay.id, user_id: user.id });

      if (addMinyan && minyanDate && minyanTime) {
        const scheduledAt = new Date(`${minyanDate}T${minyanTime}`);
        const { data: sched, error: schedErr } = await supabase
          .from("minyanim")
          .insert({
            creator_id: user.id,
            type: "scheduled",
            prayer: PRAYER_MAP[prayer] ?? "mincha",
            nusach,
            message: note || null,
            address: pick.address || cityLabel,
            latitude: lat,
            longitude: lng,
            is_live: false,
            scheduled_at: scheduledAt.toISOString(),
            expires_at: new Date(scheduledAt.getTime() + 40 * 60 * 1000).toISOString(),
            present_count: 0,
            extra_present: 0,
          })
          .select()
          .single();
        if (schedErr) throw schedErr;
        await supabase
          .from("minyan_participants")
          .insert({ minyan_id: sched.id, user_id: user.id });
      }

      void import("@/lib/analytics").then(({ track }) => track("create_minyan", { type: "stay" }));
      toast.success(t("createStay.published"));
      navigate({
        to: "/travel-city/$cityKey",
        params: { cityKey: stayCityKey(cityLabel) },
      });
    } catch (e) {
      toast.error(t("createStay.errPublish"), { description: (e as Error).message });
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
