import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, MapPin } from "lucide-react";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader } from "@/components/ui-bits";
import { useAuth } from "@/hooks/use-auth";
import { useGeolocation } from "@/hooks/use-geolocation";
import { supabase } from "@/integrations/supabase/client";
import { getZmanim, type ZmanimOpinion, type ZmanList } from "@/lib/zmanim";
import { timezoneForCoords } from "@/lib/timezone";
import { tapLight } from "@/lib/haptics";

export const Route = createFileRoute("/zmanim")({ component: Zmanim });

const OPINIONS: ZmanimOpinion[] = ["ashkenaze", "sepharade", "habad"];

const ROWS: { key: keyof ZmanList; labelKey: string }[] = [
  { key: "alotHashachar", labelKey: "zmanim.alotHashachar" },
  { key: "netzHachama", labelKey: "zmanim.netzHachama" },
  { key: "sofZmanShema", labelKey: "zmanim.sofZmanShema" },
  { key: "sofZmanTefila", labelKey: "zmanim.sofZmanTefila" },
  { key: "chatzot", labelKey: "zmanim.chatzot" },
  { key: "minchaGedola", labelKey: "zmanim.minchaGedola" },
  { key: "minchaKetana", labelKey: "zmanim.minchaKetana" },
  { key: "plagHamincha", labelKey: "zmanim.plagHamincha" },
  { key: "shkiatHachama", labelKey: "zmanim.shkiatHachama" },
  { key: "tzeitHakochavim", labelKey: "zmanim.tzeitHakochavim" },
];

function Zmanim() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { position, loading: locLoading, error: locError, request } = useGeolocation();
  const [opinion, setOpinion] = useState<ZmanimOpinion>("ashkenaze");
  const [savedOpinion, setSavedOpinion] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    void supabase.rpc("get_my_profile").then(({ data }) => {
      const row = Array.isArray(data) ? data[0] : data;
      const saved = row?.zmanim_opinion as ZmanimOpinion | undefined;
      if (saved && OPINIONS.includes(saved)) setOpinion(saved);
    });
  }, [user]);

  async function chooseOpinion(next: ZmanimOpinion) {
    void tapLight();
    setOpinion(next);
    if (!user) return;
    setSavedOpinion(false);
    const { error } = await supabase
      .from("profiles")
      .update({ zmanim_opinion: next })
      .eq("id", user.id);
    if (!error) {
      setSavedOpinion(true);
      setTimeout(() => setSavedOpinion(false), 1500);
    }
  }

  const zmanim = useMemo(() => {
    if (!position) return null;
    return getZmanim(position.lat, position.lng, opinion);
  }, [position, opinion]);

  // Always show times in the location's own zone, not the viewer's device —
  // same reasoning as the create-scheduled timezone fix.
  const tz = position ? timezoneForCoords(position.lat, position.lng) : undefined;

  return (
    <MobileFrame>
      <ScreenHeader title={t("zmanim.title")} subtitle={t("zmanim.subtitle")} back />

      <div className="px-6">
        <div className="flex gap-2">
          {OPINIONS.map((op) => (
            <button
              key={op}
              type="button"
              onClick={() => void chooseOpinion(op)}
              className={`flex-1 rounded-2xl py-2.5 text-sm font-semibold transition-colors ${
                opinion === op
                  ? "bg-accent text-accent-foreground"
                  : "bg-surface-muted text-ink-soft"
              }`}
            >
              {t(`zmanim.opinion.${op}`)}
            </button>
          ))}
        </div>
        {savedOpinion && (
          <p className="text-[12px] text-accent mt-2 text-center">{t("zmanim.saved")}</p>
        )}
        {opinion === "sepharade" && (
          <p className="text-[11px] text-ink-soft/70 mt-2 leading-snug">
            {t("zmanim.sepharadeNote")}
          </p>
        )}
      </div>

      <div className="px-6 mt-5 flex-1">
        {!position ? (
          <div className="rounded-2xl bg-surface shadow-soft p-6 text-center">
            {locLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-accent mx-auto" />
            ) : (
              <>
                <MapPin className="h-6 w-6 text-ink-soft mx-auto mb-2" />
                <p className="text-[13px] text-ink-soft mb-3">
                  {locError ?? t("zmanim.needLocation")}
                </p>
                <button
                  type="button"
                  onClick={() => void request()}
                  className="text-sm font-semibold text-accent"
                >
                  {t("zmanim.enableLocation")}
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="rounded-2xl bg-surface shadow-soft overflow-hidden">
            {ROWS.map((row, idx) => {
              const value = zmanim?.[row.key] ?? null;
              return (
                <div
                  key={row.key}
                  className={`flex items-center justify-between px-4 py-3 ${
                    idx < ROWS.length - 1 ? "border-b border-border/60" : ""
                  }`}
                >
                  <span className="text-[14px] text-ink">{t(row.labelKey)}</span>
                  <span className="text-[14px] font-semibold text-ink tabular-nums">
                    {value
                      ? value.toLocaleTimeString(undefined, {
                          timeZone: tz,
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MobileFrame>
  );
}
