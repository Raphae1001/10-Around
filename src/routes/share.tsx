import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader } from "@/components/ui-bits";
import { Copy, Send, MessageCircle, Check } from "lucide-react";
import { useState } from "react";
import { shareAny, shareWhatsApp } from "@/lib/share";
import { toast } from "sonner";

export const Route = createFileRoute("/share")({ component: Share });

function Share() {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const message = `🚨 ${t("share.messageHeader")}
📍 Aaron's Loft · 225 W 35th St
🕒 Mincha at 13:30
📈 ${t("share.messageStatus")}
⚡ ${t("share.messageCta")}

https://minyanlive.app/m/aaronloft`;

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
            <div className="text-[10px] text-[#4a6b5a] text-right mt-1">13:18 ✓✓</div>
          </div>

          <div
            className="ml-auto max-w-[88%] rounded-2xl rounded-tr-md overflow-hidden shadow-sm"
            style={{ background: "#DCF8C6" }}
          >
            <div className="h-24 navy-gradient flex items-center justify-center text-white">
              <div className="text-center">
                <div className="text-2xl font-semibold text-gold tabular-nums">9/10</div>
                <div className="text-[10px] uppercase tracking-wider text-white/70">
                  {t("share.oneMore")}
                </div>
              </div>
            </div>
            <div className="p-3">
              <div className="text-[12px] font-semibold text-[#0b1f1c]">
                Aaron's Loft · Mincha 13:30
              </div>
              <div className="text-[10px] text-[#4a6b5a]">minyanlive.app</div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 mt-5 space-y-2">
        <button
          onClick={() => shareWhatsApp(message)}
          className="w-full font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 text-white shadow-lift"
          style={{ background: "#25D366" }}
        >
          <MessageCircle className="h-5 w-5" /> {t("share.sendWhatsapp")}
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(message);
                setCopied(true);
                setTimeout(() => setCopied(false), 1400);
              } catch {
                toast("Copie impossible", { description: message });
              }
            }}
            className="btn-secondary active:scale-[0.99]"
          >
            {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            {copied ? t("share.copied") : t("share.copyText")}
          </button>
          <button
            onClick={() => shareAny({ title: "MinyanNow", text: message })}
            className="btn-secondary active:scale-[0.99]"
          >
            <Send className="h-4 w-4" /> {t("share.otherApps")}
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
            {t("share.smartTargeting")}
          </div>
          <div className="space-y-2 text-sm">
            {(["bayit", "office", "family"] as const).map((g) => (
              <label key={g} className="flex items-center gap-3 py-1.5">
                <input type="checkbox" defaultChecked className="accent-gold" />
                <span>{t(`share.targets.${g}` as any)}</span>
              </label>
            ))}
          </div>
        </div>

        <Link to="/minyan" className="block text-center text-xs text-muted-foreground py-3">
          {t("share.back")}
        </Link>
      </div>
    </MobileFrame>
  );
}
