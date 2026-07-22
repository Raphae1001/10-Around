import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader } from "@/components/ui-bits";
import { Flag, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { tapLight } from "@/lib/haptics";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/chat")({
  validateSearch: (s: Record<string, unknown>): { id?: string } => ({
    id: typeof s.id === "string" ? s.id : undefined,
  }),
  component: ChatPage,
});

type Msg = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
};

type Thread = { id: string; kind: string; title: string | null };

function ChatPage() {
  const { t } = useTranslation();
  const { id } = Route.useSearch();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [profiles, setProfiles] = useState<
    Record<string, { display_name: string | null; avatar_url: string | null }>
  >({});
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reportTarget, setReportTarget] = useState<Msg | null>(null);
  const [reporting, setReporting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const profilesRef = useRef(profiles);
  profilesRef.current = profiles;

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!id || !user) return;
    let cancelled = false;

    async function loadProfiles(ids: string[]) {
      const need = Array.from(new Set(ids)).filter((i) => i && !profilesRef.current[i]);
      if (!need.length) return;
      const { data } = await supabase
        .from("profiles")
        .select("id,display_name,avatar_url")
        .in("id", need);
      if (data && !cancelled) {
        setProfiles((prev) => {
          const next = { ...prev };
          for (const p of data)
            next[p.id] = { display_name: p.display_name, avatar_url: p.avatar_url };
          return next;
        });
      }
    }

    (async () => {
      setLoading(true);
      const [{ data: th }, { data: msgs }] = await Promise.all([
        supabase.from("chat_threads").select("id,kind,title").eq("id", id).maybeSingle(),
        supabase
          .from("chat_messages")
          .select("*")
          .eq("thread_id", id)
          .order("created_at", { ascending: true })
          .limit(200),
      ]);
      if (cancelled) return;
      setThread(th as Thread | null);
      const list = (msgs ?? []) as Msg[];
      setMessages(list);
      await loadProfiles(list.map((m) => m.user_id));
      setLoading(false);
    })();

    const channel = supabase
      .channel(`chat-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `thread_id=eq.${id}` },
        async (payload) => {
          const m = payload.new as Msg;
          setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
          await loadProfiles([m.user_id]);
        },
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [id, user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send() {
    const content = text.trim();
    if (!content || !user || !id) return;
    void tapLight();
    setSending(true);
    const { data: inserted, error } = await supabase
      .from("chat_messages")
      .insert({ thread_id: id, user_id: user.id, content })
      .select("id,user_id,content,created_at")
      .single();
    setSending(false);
    if (error) {
      toast.error(t("chats.sendError"), { description: error.message });
      return;
    }
    if (inserted) {
      setMessages((prev) =>
        prev.some((p) => p.id === inserted.id) ? prev : [...prev, inserted as Msg],
      );
    }
    setText("");
  }

  async function submitReport() {
    if (!reportTarget || !user || !id) return;
    setReporting(true);
    const { error } = await supabase.from("content_reports").insert({
      reporter_id: user.id,
      message_id: reportTarget.id,
      thread_id: id,
      reported_user_id: reportTarget.user_id,
      reason: "inappropriate",
      message_snapshot: reportTarget.content.slice(0, 2000),
    });
    setReporting(false);
    setReportTarget(null);
    if (error) {
      toast.error(t("chats.reportError"), { description: error.message });
      return;
    }
    void tapLight();
    toast.success(t("chats.reportThanks"));
  }

  const subtitle =
    thread?.kind === "travel_city" ? t("chats.travelersGroup") : t("chats.minyanGroup");

  return (
    <MobileFrame>
      <ScreenHeader title={thread?.title || t("chats.chat")} subtitle={subtitle} back />

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-y-contain px-4 py-3 space-y-2"
      >
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="h-14 w-14 rounded-full bg-gold-soft text-gold flex items-center justify-center mb-3">
              <Send className="h-6 w-6" />
            </div>
            <p className="text-[15px] font-medium text-foreground">
              {t("chats.firstMessageTitle")}
            </p>
            <p className="text-[13px] text-muted-foreground mt-1 max-w-[240px]">
              {t("chats.firstMessageDesc")}
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.user_id === user?.id;
            const p = profiles[m.user_id];
            // Never show another member's real name — privacy, group chats included.
            const name = t("common.anonymousUser");
            const initial = (name[0] ?? "?").toUpperCase();
            return (
              <div key={m.id} className={`flex gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                {!mine && (
                  <div className="h-8 w-8 rounded-full bg-navy text-white flex items-center justify-center text-[11px] font-semibold shrink-0 mt-auto overflow-hidden">
                    {p?.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      initial
                    )}
                  </div>
                )}
                <div
                  className={`max-w-[78%] rounded-[18px] px-3.5 py-2 ${
                    mine
                      ? "gold-gradient text-gold-foreground rounded-br-md"
                      : "bg-surface border border-border rounded-bl-md"
                  }`}
                >
                  {!mine && (
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <div className="text-[11px] font-semibold text-muted-foreground">{name}</div>
                      <button
                        type="button"
                        onClick={() => setReportTarget(m)}
                        className="p-0.5 rounded text-muted-foreground/70 hover:text-urgent"
                        aria-label={t("chats.report")}
                      >
                        <Flag className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  <div className="text-[15px] whitespace-pre-wrap break-words leading-snug">
                    {m.content}
                  </div>
                  <div
                    className={`text-[10px] mt-1 ${mine ? "opacity-80 text-right" : "text-muted-foreground"}`}
                  >
                    {new Date(m.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-border/60 bg-background/95 backdrop-blur px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-end gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder={t("chats.writePh")}
          className="flex-1 rounded-full border border-border bg-surface px-4 py-2.5 text-[15px] outline-none focus:border-gold"
        />
        <button
          onClick={() => void send()}
          disabled={sending || !text.trim()}
          className="h-10 w-10 rounded-full gold-gradient text-gold-foreground flex items-center justify-center shrink-0 disabled:opacity-40 active:scale-95 transition-transform"
          aria-label={t("chats.send")}
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>

      <AlertDialog open={!!reportTarget} onOpenChange={(o) => !o && setReportTarget(null)}>
        <AlertDialogContent className="max-w-[340px]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("chats.reportTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("chats.reportBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogAction
              disabled={reporting}
              onClick={(e) => {
                e.preventDefault();
                void submitReport();
              }}
              className="w-full bg-urgent text-white hover:bg-urgent/90"
            >
              {reporting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("chats.reportConfirm")}
            </AlertDialogAction>
            <AlertDialogCancel className="w-full mt-0">{t("common.cancel")}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileFrame>
  );
}
