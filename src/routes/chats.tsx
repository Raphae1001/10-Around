import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader, EmptyState } from "@/components/ui-bits";
import { MessageCircle, Users, MapPin, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { tapLight } from "@/lib/haptics";
import { humanTimeAgo } from "@/lib/time";
import { LEGACY_SCREENS_ENABLED } from "@/lib/feature-flags";

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
  const { t } = useTranslation();
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
      const [{ data: tRows }, { data: c }] = await Promise.all([
        supabase.rpc("my_chat_threads"),
        supabase.rpc("my_travel_cities"),
      ]);
      if (cancelled) return;
      setThreads(((tRows ?? []) as ThreadRow[]).filter((thread) => thread.kind !== "travel_city"));
      setCities((c ?? []) as TravelCity[]);
    };
    void loadAll();

    const channel = supabase
      .channel("chats-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages" },
        () => void loadAll(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_thread_members" },
        () => void loadAll(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "minyanim" },
        () => void loadAll(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loading = threads === null;
  const empty = !loading && threads!.length === 0 && (!cities || cities.length === 0);

  return (
    <MobileFrame>
      <ScreenHeader title={t("chats.title")} subtitle={t("chats.subtitle")} back />

      <div className="flex-1 overflow-y-auto overscroll-y-contain px-6 space-y-6 pb-8">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : empty ? (
          <EmptyState
            icon={MessageCircle}
            title={t("chats.emptyTitle")}
            description={t("chats.emptyDesc")}
            action={
              <Link
                to="/planned"
                onClick={() => void tapLight()}
                className="text-gold font-semibold text-sm"
              >
                {t("chats.emptyCta")}
              </Link>
            }
          />
        ) : (
          <>
            {cities && cities.length > 0 && (
              <section>
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                  {t("chats.tripsSection")}
                </h2>
                <div className="rounded-2xl bg-surface border border-border overflow-hidden">
                  {cities.map((c, idx) => {
                    const rowClass = `flex items-center gap-3 px-4 py-3.5 min-h-[68px] active:bg-muted/50 ${
                      idx < cities.length - 1 ? "border-b border-border/60" : ""
                    }`;
                    const inner = (
                      <>
                        <div className="h-11 w-11 rounded-full bg-gold/10 text-gold flex items-center justify-center shrink-0">
                          <MapPin className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[15px] font-medium truncate">{c.city_label}</div>
                          <div className="text-[13px] text-muted-foreground mt-0.5 truncate">
                            {t("chats.peerCount", { count: c.peer_count })}
                          </div>
                        </div>
                        {LEGACY_SCREENS_ENABLED && (
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                      </>
                    );
                    // The travel-city screen is feature-flagged off (see PlannedMinyanRow.tsx) —
                    // render the row inert instead of dead-ending on tap.
                    if (!LEGACY_SCREENS_ENABLED) {
                      return (
                        <div key={c.city_key} className={rowClass}>
                          {inner}
                        </div>
                      );
                    }
                    return (
                      <Link
                        key={c.city_key}
                        to="/travel-city/$cityKey"
                        params={{ cityKey: c.city_key }}
                        search={{ from: c.date_start, to: c.date_end }}
                        onClick={() => void tapLight()}
                        className={rowClass}
                      >
                        {inner}
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {threads && threads.length > 0 && (
              <section>
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                  {t("chats.minyanSection")}
                </h2>
                <div className="rounded-2xl bg-surface border border-border overflow-hidden">
                  {threads.map((row, idx) => (
                    <Link
                      key={row.id}
                      to="/chat"
                      search={{ id: row.id }}
                      onClick={() => void tapLight()}
                      className={`flex items-center gap-3 px-4 py-3.5 min-h-[68px] active:bg-muted/50 ${
                        idx < threads.length - 1 ? "border-b border-border/60" : ""
                      }`}
                    >
                      <div className="h-11 w-11 rounded-full bg-navy text-white flex items-center justify-center shrink-0">
                        <Users className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[15px] font-medium truncate">
                            {row.title || t("chats.minyanChat")}
                          </span>
                          <span className="text-[11px] text-muted-foreground shrink-0">
                            · {row.member_count}
                          </span>
                        </div>
                        <div className="text-[13px] text-muted-foreground mt-0.5 truncate">
                          {row.last_message ?? t("chats.noMessages")}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {row.last_at && (
                          <span className="text-[11px] text-muted-foreground">
                            {humanTimeAgo(row.last_at, t)}
                          </span>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </MobileFrame>
  );
}
