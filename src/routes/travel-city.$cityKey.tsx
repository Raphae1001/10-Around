import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader } from "@/components/ui-bits";
import { MapPin, MessageCircle, Users, Loader2, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/travel-city/$cityKey")({
  component: TravelCityPage,
});

type Peer = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  date_start: string;
  date_end: string;
  note: string | null;
  is_me: boolean;
};

function TravelCityPage() {
  const { cityKey } = useParams({ from: "/travel-city/$cityKey" });
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [cityLabel, setCityLabel] = useState<string>("");
  const [myStart, setMyStart] = useState<string | null>(null);
  const [myEnd, setMyEnd] = useState<string | null>(null);
  const [peers, setPeers] = useState<Peer[] | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      // Load my presence in this city (to know the date window)
      const { data: mine } = await supabase
        .from("travel_presence")
        .select("city_label,date_start,date_end")
        .eq("user_id", user.id)
        .eq("city_key", cityKey)
        .order("date_start", { ascending: true });

      if (!mine || mine.length === 0) {
        if (!cancelled) {
          toast.error("You're not registered in this city.");
          navigate({ to: "/chats" });
        }
        return;
      }
      const dStart = mine[0].date_start;
      const dEnd = mine[mine.length - 1].date_end;
      if (cancelled) return;
      setCityLabel(mine[0].city_label);
      setMyStart(dStart);
      setMyEnd(dEnd);

      const { data: peerData, error } = await supabase.rpc("list_city_peers", {
        _city_key: cityKey,
        _from: dStart,
        _to: dEnd,
      });
      if (!cancelled) {
        if (error) toast.error(error.message);
        else setPeers((peerData ?? []) as Peer[]);
      }

      const { data: th } = await supabase
        .from("chat_threads")
        .select("id")
        .eq("kind", "travel_city")
        .eq("city_key", cityKey)
        .maybeSingle();
      if (!cancelled) setThreadId(th?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, cityKey, navigate]);

  const fmtDate = (s: string) => new Date(s).toLocaleDateString(undefined, { day: "2-digit", month: "short" });

  return (
    <MobileFrame>
      <ScreenHeader
        title={cityLabel || "Travel city"}
        subtitle={myStart && myEnd ? `${fmtDate(myStart)} → ${fmtDate(myEnd)}` : undefined}
        back
      />
      <div className="px-6 pb-8 space-y-4">
        <div className="rounded-2xl border border-border bg-surface p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl gold-gradient text-gold-foreground flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">{peers ? peers.length : "…"} traveler{peers && peers.length === 1 ? "" : "s"}</div>
              <div className="text-xs text-muted-foreground">in <span className="text-foreground">{cityLabel}</span> on overlapping dates</div>
            </div>
          </div>
          {threadId && (
            <Link
              to="/chat"
              search={{ id: threadId }}
              className="rounded-full bg-navy text-white px-3 py-2 text-xs font-semibold flex items-center gap-1.5"
            >
              <MessageCircle className="h-4 w-4" /> Group chat
            </Link>
          )}
        </div>

        {peers === null ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <ul className="space-y-2">
            {peers.map((p) => (
              <li key={`${p.user_id}-${p.date_start}`} className="rounded-2xl border border-border bg-surface p-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-navy text-white flex items-center justify-center text-sm font-semibold overflow-hidden">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt={p.display_name} className="h-full w-full object-cover" />
                    ) : (
                      (p.display_name?.[0] ?? "?").toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">
                      {p.display_name}{p.is_me && <span className="text-muted-foreground font-normal"> · you</span>}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" /> {fmtDate(p.date_start)} → {fmtDate(p.date_end)}
                    </div>
                    {p.note && <div className="text-xs text-muted-foreground mt-1 italic">"{p.note}"</div>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1">
          <MapPin className="h-3 w-3" /> Only visible to travelers in the same city on overlapping dates.
        </div>
      </div>
    </MobileFrame>
  );
}
