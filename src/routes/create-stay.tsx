import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
import { guardTravelStayScreen } from "@/lib/legacy-route";

export const Route = createFileRoute("/create-stay")({
  beforeLoad: guardTravelStayScreen,
  component: CreateStay,
});

type PrayerKey = "shacharit" | "mincha" | "maariv";
type PrayerInterest = { time: string; note: string };

function CreateStay() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [publishing, setPublishing] = useState(false);
  // Guards a double-tap synchronously, before React has re-rendered the
  // disabled button — same pattern as DangerZone.tsx's signingOutRef.
  const publishingRef = useRef(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  const [city, setCity] = useState("");
  const [pick, setPick] = useState<AddressPick | null>(null);
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [note, setNote] = useState("");
  const [interests, setInterests] = useState<Record<PrayerKey, PrayerInterest | null>>({
    shacharit: null,
    mincha: null,
    maariv: null,
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  const prayers: { key: PrayerKey; icon: typeof Sunrise }[] = [
    { key: "shacharit", icon: Sunrise },
    { key: "mincha", icon: Sun },
    { key: "maariv", icon: Moon },
  ];

  function toggleInterest(key: PrayerKey) {
    setInterests((prev) => ({
      ...prev,
      [key]: prev[key] ? null : { time: "", note: "" },
    }));
  }

  function updateInterest(key: PrayerKey, patch: Partial<PrayerInterest>) {
    setInterests((prev) => {
      const cur = prev[key];
      if (!cur) return prev;
      return { ...prev, [key]: { ...cur, ...patch } };
    });
  }

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
          <div>
            <span className="text-sm font-medium text-ink">{t("createStay.prayerInterests")}</span>
            <p className="text-[11px] text-muted-foreground mt-1">
              {t("createStay.prayerInterestsHint")}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 w-full">
            {prayers.map(({ key, icon: Icon }) => {
              const active = !!interests[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleInterest(key)}
                  className={`min-w-0 flex flex-col items-center gap-1 py-3 px-1 rounded-xl transition-all ${
                    active ? "bg-accent text-accent-foreground" : "bg-surface-muted text-ink"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${active ? "text-accent-foreground" : "text-ink-soft"}`}
                  />
                  <span className="text-[11px] font-semibold truncate w-full text-center">
                    {t(`prayer.${key}`)}
                  </span>
                </button>
              );
            })}
          </div>

          {prayers.map(({ key }) => {
            const interest = interests[key];
            if (!interest) return null;
            return (
              <div key={key} className="space-y-2.5 pt-2 border-t border-border/60">
                <div className="text-[11px] font-semibold text-ink-soft uppercase tracking-wide">
                  {t(`prayer.${key}`)}
                </div>
                <DateTimeField
                  type="time"
                  value={interest.time}
                  onChange={(v) => updateInterest(key, { time: v })}
                  label={t("createScheduled.time")}
                  emptyHint={t("createStay.prayerTimeHint")}
                />
                <textarea
                  rows={2}
                  value={interest.note}
                  onChange={(e) => updateInterest(key, { note: e.target.value })}
                  placeholder={t("createStay.prayerNotePh")}
                  className="w-full rounded-2xl border border-border bg-surface p-3 text-sm outline-none focus:border-accent"
                />
              </div>
            );
          })}
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
    // Synchronous guard against a double-tap firing two publish() calls
    // before React re-renders the disabled button (same pattern as
    // DangerZone.tsx's signingOutRef) — checked first, before any await.
    if (publishingRef.current) return;

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

    publishingRef.current = true;
    setPublishing(true);
    try {
      const lat = pick.lat ?? 0;
      const lng = pick.lng ?? 0;
      const expiresAt = new Date(`${dateEnd}T23:59:59`).toISOString();

      const tripPrayerInterests = (Object.keys(interests) as PrayerKey[])
        .filter((key) => interests[key])
        .map((key) => ({
          prayer: key,
          time: interests[key]!.time || null,
          note: interests[key]!.note.trim() || null,
        }));

      // Duplicate-check + minyanim insert + participant insert all happen
      // atomically server-side (one transaction, serialized per creator via
      // an advisory lock) — see create_stay_minyan() in
      // 20260831120000_stay_confirmations_and_atomic_create.sql. A failed
      // participant insert rolls back the whole stay too; no partially
      // created trip, no false success.
      const { data: createdRows, error } = await supabase.rpc("create_stay_minyan", {
        _address: cityLabel,
        _lat: lat,
        _lng: lng,
        _message: note || null,
        _trip_start_date: dateStart,
        _trip_end_date: dateEnd,
        _trip_prayer_interests: tripPrayerInterests,
        _expires_at: expiresAt,
      });

      if (error) {
        if (error.message.includes("duplicate_stay")) {
          toast.error(t("createStay.errPublish"), {
            description: "You already have a trip planned in this city for overlapping dates.",
          });
          return;
        }
        throw error;
      }
      const stay = createdRows?.[0];
      if (!stay) throw new Error("No trip returned");

      void import("@/lib/analytics").then(({ track }) => track("create_minyan", { type: "stay" }));
      toast.success(t("createStay.published"));
      navigate({
        to: "/travel-city/$cityKey",
        params: { cityKey: stayCityKey(cityLabel) },
        search: { from: undefined, to: undefined },
      });
    } catch (e) {
      toast.error(t("createStay.errPublish"), { description: (e as Error).message });
    } finally {
      publishingRef.current = false;
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
