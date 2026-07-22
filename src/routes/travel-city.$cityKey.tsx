import { createFileRoute, Link, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader } from "@/components/ui-bits";
import {
  MessageCircle,
  Users,
  Loader2,
  CalendarDays,
  Share2,
  Trash2,
  Sunrise,
  Sun,
  Moon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { shareWhatsApp, appOrigin } from "@/lib/share";
import { stayCityKey } from "@/lib/stay";

export const Route = createFileRoute("/travel-city/$cityKey")({
  component: TravelCityPage,
  validateSearch: (search: Record<string, unknown>) => ({
    from: typeof search.from === "string" ? search.from : undefined,
    to: typeof search.to === "string" ? search.to : undefined,
  }),
});

type PrayerInterest = {
  prayer: "shacharit" | "mincha" | "maariv";
  time: string | null;
  note: string | null;
};

type Peer = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  date_start: string;
  date_end: string;
  note: string | null;
  trip_prayer_interests: PrayerInterest[] | null;
  is_me: boolean;
};

const PRAYER_ICON = { shacharit: Sunrise, mincha: Sun, maariv: Moon } as const;

function TravelCityPage() {
  const { t } = useTranslation();
  const { cityKey } = useParams({ from: "/travel-city/$cityKey" });
  const { from: searchFrom, to: searchTo } = useSearch({ from: "/travel-city/$cityKey" });
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [cityLabel, setCityLabel] = useState<string>("");
  const [myStart, setMyStart] = useState<string | null>(null);
  const [myEnd, setMyEnd] = useState<string | null>(null);
  const [peers, setPeers] = useState<Peer[] | null>(null);
  const [peerCount, setPeerCount] = useState<number | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);
  const [myStayId, setMyStayId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  async function load() {
    if (!user) return;

    const { data: stays } = await supabase
      .from("minyanim")
      .select("id, address, trip_start_date, trip_end_date")
      .eq("type", "stay")
      .eq("creator_id", user.id)
      .gt("expires_at", new Date().toISOString())
      .order("trip_start_date", { ascending: true });

    const mine = (stays ?? []).filter((s) => stayCityKey(s.address ?? "") === cityKey);

    const { data: cityStays } = await supabase
      .from("minyanim")
      .select("address, trip_start_date, trip_end_date")
      .eq("type", "stay")
      .gt("expires_at", new Date().toISOString());

    const inCity = (cityStays ?? []).filter((s) => stayCityKey(s.address ?? "") === cityKey);

    let dStart: string;
    let dEnd: string;
    let isRegistered = false;
    if (mine.length > 0) {
      isRegistered = true;
      setRegistered(true);
      setMyStayId(mine[0].id);
      setCityLabel(mine[0].address ?? cityKey);
      dStart = mine[0].trip_start_date!;
      dEnd = mine[mine.length - 1].trip_end_date!;
    } else {
      setRegistered(false);
      setMyStayId(null);
      if (searchFrom && searchTo) {
        dStart = searchFrom;
        dEnd = searchTo;
      } else if (inCity.length > 0) {
        dStart = inCity.reduce(
          (min, s) => (s.trip_start_date! < min ? s.trip_start_date! : min),
          inCity[0].trip_start_date!,
        );
        dEnd = inCity.reduce(
          (max, s) => (s.trip_end_date! > max ? s.trip_end_date! : max),
          inCity[0].trip_end_date!,
        );
      } else {
        const today = new Date();
        const in60 = new Date(today.getTime() + 60 * 86400_000);
        dStart = today.toISOString().slice(0, 10);
        dEnd = in60.toISOString().slice(0, 10);
      }
      setCityLabel(inCity[0]?.address ?? cityKey);
    }
    setMyStart(dStart);
    setMyEnd(dEnd);

    if (isRegistered) {
      const { data: peerData, error } = await supabase.rpc("list_city_peers", {
        _city_key: cityKey,
        _from: dStart,
        _to: dEnd,
      });
      if (error) toast.error(error.message);
      else {
        const list = (peerData ?? []) as Peer[];
        setPeers(list);
        setPeerCount(list.length);
      }
    } else {
      const { data: count, error } = await supabase.rpc("count_travelers_in_city", {
        _city_key: cityKey,
        _from: dStart,
        _to: dEnd,
      });
      if (!error) setPeerCount(typeof count === "number" ? count : 0);
      setPeers([]);
    }

    const { data: th } = await supabase
      .from("chat_threads")
      .select("id")
      .eq("kind", "travel_city")
      .eq("city_key", cityKey)
      .maybeSingle();
    setThreadId(th?.id ?? null);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, cityKey, searchFrom, searchTo]);

  const fmtDate = (s: string) =>
    new Date(s).toLocaleDateString(undefined, { day: "2-digit", month: "short" });

  async function registerMe() {
    navigate({ to: "/create-stay" });
  }

  async function cancelTrip() {
    if (!user || !myStayId) return;
    if (!confirm(`Cancel your trip to ${cityLabel || cityKey}?`)) return;
    const { error } = await supabase
      .from("minyanim")
      .delete()
      .eq("id", myStayId)
      .eq("creator_id", user.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Trip cancelled");
    navigate({ to: "/planned" });
  }

  function shareCity() {
    const dates = myStart && myEnd ? ` (${fmtDate(myStart)} → ${fmtDate(myEnd)})` : "";
    shareWhatsApp(
      `I'll be in ${cityLabel}${dates}. Join me on MinyanNow to coordinate a minyan.`,
      `${appOrigin()}/travel-city/${encodeURIComponent(cityKey)}`,
    );
  }

  return (
    <MobileFrame>
      <ScreenHeader
        title={cityLabel || "Travel city"}
        subtitle={myStart && myEnd ? `${fmtDate(myStart)} → ${fmtDate(myEnd)}` : undefined}
        back
      />
      <div className="px-6 pb-8 space-y-4">
        <div className="rounded-2xl border border-border bg-surface p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl gold-gradient text-gold-foreground flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">{cityLabel || "City"}</div>
              <div className="text-xs text-muted-foreground">
                {peerCount === null ? "…" : peerCount} person{peerCount === 1 ? "" : "s"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={shareCity}
              className="rounded-full border border-border bg-surface px-3 py-2 text-xs font-semibold flex items-center gap-1.5"
            >
              <Share2 className="h-4 w-4" /> Share
            </button>
            {threadId ? (
              <Link
                to="/chat"
                search={{ id: threadId }}
                className="rounded-full bg-navy text-white px-3 py-2 text-xs font-semibold flex items-center gap-1.5"
              >
                <MessageCircle className="h-4 w-4" /> Chat
              </Link>
            ) : null}
          </div>
        </div>

        {!registered ? (
          <div className="rounded-2xl border border-dashed border-gold/60 bg-gold/5 p-4 text-sm">
            <p className="mb-2">
              Signal your trip dates to join the group chat and let others know you&apos;re around.
            </p>
            <button
              onClick={registerMe}
              className="rounded-full gold-gradient text-gold-foreground px-4 py-2 text-xs font-bold"
            >
              Signal a trip
            </button>
          </div>
        ) : (
          <button
            onClick={() => void cancelTrip()}
            className="w-full rounded-2xl border border-destructive/40 bg-destructive/5 text-destructive py-3 text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            <Trash2 className="h-4 w-4" /> Cancel this trip
          </button>
        )}

        {peers === null ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : peers.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">
            {registered
              ? "No one registered here yet."
              : "Signal your trip to see who else is around and join the city chat."}
          </p>
        ) : (
          <ul className="space-y-2">
            {peers.map((p) => {
              // Never show another traveler's real name — privacy.
              const name = p.is_me ? p.display_name : t("common.anonymousUser");
              return (
              <li
                key={`${p.user_id}-${p.date_start}`}
                className="rounded-2xl border border-border bg-surface p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-navy text-white flex items-center justify-center text-sm font-semibold overflow-hidden">
                    {p.avatar_url ? (
                      <img
                        src={p.avatar_url}
                        alt={name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      (name?.[0] ?? "?").toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">
                      {name}
                      {p.is_me && <span className="text-muted-foreground font-normal"> · you</span>}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" /> {fmtDate(p.date_start)} →{" "}
                      {fmtDate(p.date_end)}
                    </div>
                    {p.note && (
                      <div className="text-xs text-muted-foreground mt-1 italic">
                        &quot;{p.note}&quot;
                      </div>
                    )}
                    {p.trip_prayer_interests && p.trip_prayer_interests.length > 0 && (
                      <div className="mt-2 space-y-1.5 border-t border-border/60 pt-2">
                        {p.trip_prayer_interests.map((interest, i) => {
                          const Icon = PRAYER_ICON[interest.prayer] ?? Sun;
                          const label = t(`prayer.${interest.prayer}`, {
                            defaultValue: interest.prayer,
                          });
                          return (
                            <div key={i} className="flex items-start gap-1.5 text-xs">
                              <Icon className="h-3.5 w-3.5 text-gold shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <span className="font-medium text-foreground">{label}</span>
                                {interest.time && (
                                  <span className="text-muted-foreground"> · {interest.time}</span>
                                )}
                                {interest.note && (
                                  <div className="text-muted-foreground italic truncate">
                                    &quot;{interest.note}&quot;
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </li>
              );
            })}
          </ul>
        )}
      </div>
    </MobileFrame>
  );
}
