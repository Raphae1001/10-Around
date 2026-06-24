import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader } from "@/components/ui-bits";
import { MessageCircle, Users, MapPin, ChevronRight, Loader2, Globe2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type TravelCity = {
  city_key: string;
  city_label: string;
  date_start: string;
  date_end: string;
  peer_count: number;
  thread_id: string | null;
};

export const Route = createFileRoute("/chats")({
  component: ChatsPage,
});

type ThreadRow = {
  id: string;
  kind: string;
  title: string | null;
  minyan_id: string | null;
  city_key: string | null;
  member_count: number;
  last_message: string | null;
  last_at: string;
};

function ChatsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<ThreadRow[] | null>(null);
  const [cities, setCities] = useState<TravelCity[] | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const loadAll = async () => {
      const [{ data: t }, { data: c }] = await Promise.all([
        supabase.rpc("my_chat_threads"),
        supabase.rpc("my_travel_cities"),
      ]);
      if (cancelled) return;
      setThreads((t ?? []) as ThreadRow[]);
      setCities((c ?? []) as TravelCity[]);
    };
    loadAll();

    const channel = supabase
      .channel("chats-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_thread_members" }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "travel_presence" }, loadAll)
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fmt = (s: string) => new Date(s).toLocaleDateString(undefined, { day: "2-digit", month: "short" });

  return (
    <MobileFrame>
      <ScreenHeader title="Your chats" subtitle="Talk with your minyan and fellow travelers" back />
      <div className="px-6 pb-8">
        {threads === null ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : threads.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-6 text-center">
            <MessageCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <div className="text-sm font-semibold">No chats yet</div>
            <p className="text-xs text-muted-foreground mt-1">
              Join a minyan or register a trip — a group chat opens automatically.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {threads.map((t) => (
              <li key={t.id}>
                <Link
                  to="/chat"
                  search={{ id: t.id }}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 hover:border-gold/60 transition-colors"
                >
                  <div className={`h-11 w-11 rounded-2xl flex items-center justify-center ${t.kind === "minyan" ? "bg-navy text-white" : "gold-gradient text-gold-foreground"}`}>
                    {t.kind === "minyan" ? <Users className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate">{t.title || (t.kind === "minyan" ? "Minyan chat" : "Travelers")}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">· {t.member_count}</span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {t.last_message ?? <span className="italic">No messages yet — say hi 👋</span>}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </MobileFrame>
  );
}
