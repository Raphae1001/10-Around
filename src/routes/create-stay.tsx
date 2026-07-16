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

      <div className="px-6 space-y-5 pb-4">
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
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground ml-1">
                {t("create.from")}
              </label>
              <input
                value={dateStart}
                min={todayStr}
                onChange={(e) => setDateStart(e.target.value)}
                type="date"
                className="w-full rounded-2xl border border-border bg-surface p-3 text-sm outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground ml-1">
                {t("create.to")}
              </label>
              <input
                value={dateEnd}
                min={dateStart || todayStr}
                onChange={(e) => setDateEnd(e.target.value)}
                type="date"
                className="w-full rounded-2xl border border-border bg-surface p-3 text-sm outline-none focus:border-gold"
              />
            </div>
          </div>
        </Section>

        <Section step="3" title={t("create.commentLabel")}>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("createStay.notePh")}
            className="w-full rounded-2xl border border-border bg-surface p-3 text-sm outline-none focus:border-gold"
          />
        </Section>

        <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={addMinyan}
              onChange={(e) => setAddMinyan(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-gold"
            />
            <span className="text-sm font-medium">{t("createStay.addMinyan")}</span>
          </label>
          {addMinyan && (
            <div className="space-y-3 pt-1 border-t border-border/60">
              <p className="text-[11px] text-muted-foreground">{t("createStay.addMinyanHint")}</p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={minyanDate}
                  min={dateStart || todayStr}
                  max={dateEnd || undefined}
                  onChange={(e) => setMinyanDate(e.target.value)}
                  type="date"
                  className="rounded-2xl border border-border bg-background p-3 text-sm outline-none focus:border-gold"
                />
                <input
                  value={minyanTime}
                  onChange={(e) => setMinyanTime(e.target.value)}
                  type="time"
                  className="rounded-2xl border border-border bg-background p-3 text-sm outline-none focus:border-gold"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {prayers.map(({ name, icon: Icon }) => {
                  const active = prayer === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setPrayer(name)}
                      className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-semibold transition-all ${
                        active ? "border-gold bg-gold-soft" : "border-border bg-background"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 ${active ? "text-gold" : "text-muted-foreground"}`}
                      />
                      {t(`prayer.${PRAYER_MAP[name]}`)}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2 flex-wrap">
                {["Any", "Ashkenaz", "Sephard"].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNusach(n)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium border ${
                      nusach === n
                        ? "bg-foreground text-background border-foreground"
                        : "border-border"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="sticky bottom-24 px-6 pb-2">
        <button
          onClick={publish}
          disabled={publishing}
          className="flex items-center justify-center gap-2 w-full gold-gradient text-gold-foreground font-semibold py-5 rounded-2xl shadow-glow-gold text-base transition-transform active:scale-[0.99] disabled:opacity-60"
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
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="h-5 w-5 rounded-full bg-gold text-gold-foreground text-[10px] font-bold flex items-center justify-center">
          {step}
        </span>
        <h3 className="font-display text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}
