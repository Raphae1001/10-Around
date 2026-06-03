import { createFileRoute } from "@tanstack/react-router";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader } from "@/components/ui-bits";
import { Bell, Moon, Globe, Lock, MapPin, Accessibility, ChevronRight, Sparkles } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/settings")({
  component: Settings,
});

function Settings() {
  return (
    <MobileFrame>
      <ScreenHeader title="Settings" back />

      <div className="px-6 space-y-5 pb-8">
        <Group title="Notifications" icon={Bell}>
          <Toggle label="Urgent (missing 1-2)" defaultOn />
          <Toggle label="Kaddish requests nearby" defaultOn />
          <Toggle label="Minyan confirmed" defaultOn />
          <Toggle label="Quiet hours · 10 PM – 6 AM" />
        </Group>

        <Group title="Nusach preferences" icon={Sparkles}>
          <Row label="Primary nusach" value="Ashkenaz" />
          <Row label="Also show" value="Sephard, Nusach Ari" />
        </Group>

        <Group title="Shabbat & Yom Tov" icon={Moon}>
          <Toggle label="Auto Shabbat mode (location)" defaultOn />
          <Toggle label="Mute all alerts on Shabbat" defaultOn />
        </Group>

        <Group title="Privacy" icon={Lock}>
          <Toggle label="Show me on the live map" defaultOn />
          <Toggle label="Share trust score publicly" defaultOn />
          <Row label="Profile visibility" value="Community only" />
        </Group>

        <Group title="Location" icon={MapPin}>
          <Row label="Permission" value="While using app" />
          <Toggle label="Background updates (traveler)" />
        </Group>

        <Group title="Language" icon={Globe}>
          <Row label="App language" value="English" />
          <Row label="Prayer text" value="Hebrew · transliteration" />
        </Group>

        <Group title="Accessibility" icon={Accessibility}>
          <Toggle label="Larger text" />
          <Toggle label="High contrast" />
          <Toggle label="Reduce motion" />
        </Group>

        <button className="w-full text-center text-sm text-urgent py-4 rounded-2xl border border-border bg-surface">
          Sign out
        </button>
      </div>
    </MobileFrame>
  );
}

function Group({ title, icon: Icon, children }: any) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      <div className="rounded-2xl bg-surface border border-border divide-y divide-border">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 flex items-center gap-3">
      <div className="flex-1 text-sm">{label}</div>
      <div className="text-sm text-muted-foreground">{value}</div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}

function Toggle({ label, defaultOn = false }: { label: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button onClick={() => setOn(!on)} className="w-full p-4 flex items-center gap-3 text-left">
      <div className="flex-1 text-sm">{label}</div>
      <div className={`relative h-6 w-10 rounded-full transition-colors ${on ? "bg-gold" : "bg-muted"}`}>
        <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-[18px]" : "translate-x-0.5"}`} />
      </div>
    </button>
  );
}
