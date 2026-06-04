import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader } from "@/components/ui-bits";
import { Copy, Send, MessageCircle, Check } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/share")({
  component: Share,
});

const message = `🚨 URGENT — Minyan needs participants
📍 Aaron's Loft · 225 W 35th St
🕒 Mincha at 13:30
📈 Status: 9/10 — Only 1 more person needed
⚡ Confirm attendance instantly via MinyanLive

https://minyanlive.app/m/aaronloft`;

function Share() {
  const [copied, setCopied] = useState(false);

  return (
    <MobileFrame showNav={false}>
      <ScreenHeader title="Share minyan" subtitle="Beautiful WhatsApp invitation" back />

      {/* WhatsApp-style preview */}
      <div className="mx-6 rounded-3xl overflow-hidden border border-border shadow-lift" style={{ background: "#ECE5DD" }}>
        <div className="px-4 py-3 text-[11px] text-center" style={{ background: "#075E54", color: "white" }}>
          Bayit Group · 38 members
        </div>
        <div className="p-4 space-y-2">
          <div className="ml-auto max-w-[88%] rounded-2xl rounded-tr-md px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-line text-[#0b1f1c] shadow-sm" style={{ background: "#DCF8C6" }}>
            {message}
            <div className="text-[10px] text-[#4a6b5a] text-right mt-1">13:18 ✓✓</div>
          </div>

          {/* Rich link card */}
          <div className="ml-auto max-w-[88%] rounded-2xl rounded-tr-md overflow-hidden shadow-sm" style={{ background: "#DCF8C6" }}>
            <div className="h-24 navy-gradient flex items-center justify-center text-white">
              <div className="text-center">
                <div className="font-display text-2xl text-gold">9/10</div>
                <div className="text-[10px] uppercase tracking-wider text-white/70">One more needed</div>
              </div>
            </div>
            <div className="p-3">
              <div className="text-[12px] font-semibold text-[#0b1f1c]">Aaron's Loft · Mincha 13:30</div>
              <div className="text-[10px] text-[#4a6b5a]">minyanlive.app</div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 mt-5 space-y-2">
        <button
          className="w-full font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 text-white shadow-lift"
          style={{ background: "#25D366" }}
        >
          <MessageCircle className="h-5 w-5" /> Send via WhatsApp
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1400); }}
            className="bg-surface border border-border font-medium py-3 rounded-2xl text-sm flex items-center justify-center gap-2"
          >
            {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy text"}
          </button>
          <button className="bg-surface border border-border font-medium py-3 rounded-2xl text-sm flex items-center justify-center gap-2">
            <Send className="h-4 w-4" /> Other apps
          </button>
        </div>

        {/* Smart suggestions */}
        <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Smart targeting</div>
          <div className="space-y-2 text-sm">
            {[
              "Bayit Group · 38 nearby",
              "Office Minyan · 12 within 5 min walk",
              "Family · 4 in Manhattan",
            ].map((g) => (
              <label key={g} className="flex items-center gap-3 py-1.5">
                <input type="checkbox" defaultChecked className="accent-[oklch(0.82_0.14_80)]" />
                <span>{g}</span>
              </label>
            ))}
          </div>
        </div>

        <Link to="/minyan" className="block text-center text-xs text-muted-foreground py-3">Back to minyan</Link>
      </div>
    </MobileFrame>
  );
}
