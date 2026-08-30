import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader } from "@/components/ui-bits";
import { Copy, Send, MessageCircle, Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { shareAny, shareWhatsApp, appOrigin } from "@/lib/share";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QUORUM_SIZE } from "@/lib/constants";

export const Route = createFileRoute("/share")({
  validateSearch: (s: Record<string, unknown>) => ({
    id: typeof s.id === "string" ? s.id : undefined,
  }),
  component: Share,
});

type MinyanInfo = {
  address: string | null;
  city: string | null;
  prayer: string;
  present_count: number;
  scheduled_at: string | null;
};

const NEEDED = QUORUM_SIZE;

function Share() {
  const { t } = useTranslation();
  const { id } = Route.useSearch();
  const [copied, setCopied] = useState(false);
  const [minyan, setMinyan] = useState<MinyanInfo | null>(null);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void supabase
      .rpc("get_minyan_by_id", { _id: id })
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setMinyan((data as MinyanInfo) ?? null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const prayerLabel = minyan ? t(`prayer.${minyan.prayer}`, { defaultValue: minyan.prayer }) : "";
  const place = minyan?.address || minyan?.city || "";
  const timeLabel = minyan?.scheduled_at
    ? new Date(minyan.scheduled_at).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  const count = minyan?.present_count ?? 0;
  const shareUrl = id ? `${appOrigin()}/minyan/${id}` : undefined;

  const message = minyan
    ? `🚨 ${t("share.messageHeader")}
📍 ${place}
🕒 ${prayerLabel}${timeLabel ? ` ${t("share.messageAt", { defaultValue: "at" })} ${timeLabel}` : ""}
📈 ${count}/${NEEDED} ${t("share.messageStatus")}
⚡ ${t("share.messageCta")}`
    : `🚨 ${t("share.messageHeader")}
⚡ ${t("share.messageCta")}`;

  if (loading) {
    return (
      <MobileFrame>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </MobileFrame>
    );
  }

  return (
    <MobileFrame>
      <ScreenHeader title={t("share.title")} subtitle={t("share.subtitle")} back />

      <div
        className="mx-6 rounded-3xl overflow-hidden border border-border shadow-lift"
        style={{ background: "#ECE5DD" }}
      >
        <div
          className="px-4 py-3 text-[11px] text-center"
          style={{ background: "#075E54", color: "white" }}
        >
          {t("share.group")}
        </div>
        <div className="p-4 space-y-2">
          <div
            className="ml-auto max-w-[88%] rounded-2xl rounded-tr-md px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-line text-[#0b1f1c] shadow-sm"
            style={{ background: "#DCF8C6" }}
          >
            {message}
            {shareUrl && <div className="mt-1 text-[#1a73e8] underline break-all">{shareUrl}</div>}
          </div>

          {minyan && (
            <div
              className="ml-auto max-w-[88%] rounded-2xl rounded-tr-md overflow-hidden shadow-sm"
              style={{ background: "#DCF8C6" }}
            >
              <div className="h-24 navy-gradient flex items-center justify-center text-white">
                <div className="text-center">
                  <div className="text-2xl font-semibold text-gold tabular-nums">
                    {count}/{NEEDED}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-white/70">
                    {t("share.oneMore")}
                  </div>
                </div>
              </div>
              <div className="p-3">
                <div className="text-[12px] font-semibold text-[#0b1f1c]">
                  {place}
                  {place && prayerLabel ? " · " : ""}
                  {prayerLabel}
                  {timeLabel ? ` ${timeLabel}` : ""}
                </div>
                <div className="text-[10px] text-[#4a6b5a]">
                  {appOrigin().replace(/^https?:\/\//, "")}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-6 mt-5 space-y-2">
        <button
          onClick={() => shareWhatsApp(message, shareUrl)}
          className="w-full font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 text-white shadow-lift"
          style={{ background: "#25D366" }}
        >
          <MessageCircle className="h-5 w-5" /> {t("share.sendWhatsapp")}
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={async () => {
              const full = shareUrl ? `${message}\n${shareUrl}` : message;
              try {
                await navigator.clipboard.writeText(full);
                setCopied(true);
                setTimeout(() => setCopied(false), 1400);
              } catch {
                toast("Copie impossible", { description: full });
              }
            }}
            className="btn-secondary active:scale-[0.99]"
          >
            {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            {copied ? t("share.copied") : t("share.copyText")}
          </button>
          <button
            onClick={() => shareAny({ title: "10 Around", text: message, url: shareUrl })}
            className="btn-secondary active:scale-[0.99]"
          >
            <Send className="h-4 w-4" /> {t("share.otherApps")}
          </button>
        </div>

        <Link
          to="/minyan"
          search={{ id }}
          className="block text-center text-xs text-muted-foreground py-3"
        >
          {t("share.back")}
        </Link>
      </div>
    </MobileFrame>
  );
}
