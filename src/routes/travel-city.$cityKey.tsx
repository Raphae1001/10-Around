import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader } from "@/components/ui-bits";
import { MessageCircle, Users, Loader2, CalendarDays, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { shareWhatsApp, appOrigin } from "@/lib/share";

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
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  async function load() {
    if (!user) return;
    const { data: mine } = await supabase
      .from("travel_presence")
      .select("city_label,date_start,date_end")
      .eq("user_id", user.id)
      .eq("city_key", cityKey)
      .order("date_start", { ascending: true });

    let dStart: string;
    let dEnd: string;
    if (mine && mine.length > 0) {
      setRegistered(true);
      setCityLabel(mine[0].city_label);
      dStart = mine[0].date_start;
      dEnd = mine[mine.length - 1].date_end;
    } else {
      setRegistered(false);
      // wide default window so the page is browseable
      const today = new Date();
      const in60 = new Date(today.getTime() + 60 * 86400_000);
      dStart = today.toISOString().slice(0, 10);
      dEnd = in60.toISOString().slice(0, 10);
      // Try to pick a nice label from any presence in this city
      const { data: any1 } = await supabase
        .from("travel_presence")
        .select("city_label")
        .eq("city_key", cityKey)
        .limit(1)
        .maybeSingle();
      setCityLabel(any1?.city_label ?? cityKey);
    }
    setMyStart(dStart);
    setMyEnd(dEnd);

    const { data: peerData, error } = await supabase.rpc("list_city_peers", {
      _city_key: cityKey,
      _from: dStart,
      _to: dEnd,
    });
    if (error) toast.error(error.message);
    else setPeers((peerData ?? []) as Peer[]);

    const { data: th } = await supabase
      .from("chat_threads")
      .select("id")
      .eq("kind", "travel_city")
      .eq("city_key", cityKey)
      .maybeSingle();
    setThreadId(th?.id ?? null);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, cityKey]);

  const fmtDate = (s: string) => new Date(s).toLocaleDateString(undefined, { day: "2-digit", month: "short" });

  async function registerMe() {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    const in7 = new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10);
    const { error } = await supabase.from("travel_presence").insert({
      user_id: user.id,
      city_key: cityKey,
      city_label: cityLabel || cityKey,
      date_start: today,
      date_end: in7,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Registered — you can chat now");
    load();
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
              <div className="text-xs text-muted-foreground">{peers ? peers.length : "…"} person{peers && peers.length === 1 ? "" : "s"}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={shareCity} className="rounded-full border border-border bg-surface px-3 py-2 text-xs font-semibold flex items-center gap-1.5">
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

        {!registered && (
          <div className="rounded-2xl border border-dashed border-gold/60 bg-gold/5 p-4 text-sm">
            <p className="mb-2">Register your dates here to join the group chat and let others know you're around.</p>
            <button onClick={registerMe} className="rounded-full gold-gradient text-gold-foreground px-4 py-2 text-xs font-bold">
              Register me (next 7 days)
            </button>
          </div>
        )}

        {peers === null ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : peers.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">No one registered here yet.</p>
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
      </div>
    </MobileFrame>
  );
}

