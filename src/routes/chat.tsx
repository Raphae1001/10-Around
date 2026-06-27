import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader } from "@/components/ui-bits";
import { Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

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
  const { id } = Route.useSearch();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { display_name: string | null; avatar_url: string | null }>>({});
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!id || !user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: th }, { data: msgs }] = await Promise.all([
        supabase.from("chat_threads").select("id,kind,title").eq("id", id).maybeSingle(),
        supabase.from("chat_messages").select("*").eq("thread_id", id).order("created_at", { ascending: true }).limit(200),
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
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `thread_id=eq.${id}` }, async (payload) => {
        const m = payload.new as Msg;
        setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
        await loadProfiles([m.user_id]);
      })
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function loadProfiles(ids: string[]) {
    const need = Array.from(new Set(ids)).filter((i) => i && !profiles[i]);
    if (!need.length) return;
    const { data } = await supabase.from("profiles").select("id,display_name,avatar_url").in("id", need);
    if (data) {
      setProfiles((prev) => {
        const next = { ...prev };
        for (const p of data) next[p.id] = { display_name: p.display_name, avatar_url: p.avatar_url };
        return next;
      });
    }
  }

  async function send() {
    const content = text.trim();
    if (!content || !user || !id) return;
    setSending(true);
    const { data: inserted, error } = await supabase
      .from("chat_messages")
      .insert({ thread_id: id, user_id: user.id, content })
      .select("id,user_id,content,created_at")
      .single();
    setSending(false);
    if (error) {
      toast.error("Could not send", { description: error.message });
      return;
    }
    if (inserted) {
      setMessages((prev) => (prev.some((p) => p.id === inserted.id) ? prev : [...prev, inserted as Msg]));
      await loadProfiles([inserted.user_id]);
    }
    setText("");
  }

  return (
    <MobileFrame>
      <ScreenHeader title={thread?.title || "Chat"} subtitle={thread?.kind === "travel_city" ? "Travelers group" : "Minyan group"} back />
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-2 space-y-2 min-h-[50vh] max-h-[60vh]">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : messages.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-10">Be the first to say hi 👋</p>
        ) : (
          messages.map((m) => {
            const mine = m.user_id === user?.id;
            const p = profiles[m.user_id];
            const name = p?.display_name ?? "Someone";
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[78%] rounded-2xl px-3 py-2 ${mine ? "gold-gradient text-gold-foreground" : "bg-surface border border-border"}`}>
                  {!mine && <div className="text-[10px] font-semibold opacity-70 mb-0.5">{name}</div>}
                  <div className="text-sm whitespace-pre-wrap break-words">{m.content}</div>
                  <div className={`text-[10px] mt-1 ${mine ? "opacity-80" : "text-muted-foreground"}`}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="sticky bottom-0 bg-background border-t border-border p-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Write a message…"
          className="flex-1 rounded-2xl border border-border bg-surface p-3 text-sm outline-none focus:border-gold"
        />
        <button
          onClick={send}
          disabled={sending || !text.trim()}
          className="h-11 w-11 rounded-2xl gold-gradient text-gold-foreground flex items-center justify-center shadow-glow-gold disabled:opacity-50"
          aria-label="Send"
        >
          {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </button>
      </div>
    </MobileFrame>
  );
}
