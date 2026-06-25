import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader } from "@/components/ui-bits";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Bell, Moon, Lock, MapPin, Accessibility, ChevronDown, Sparkles, BarChart3, Trash2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { deleteMyAccount } from "@/lib/account.functions";
import { track, setAnalyticsEnabled, isAnalyticsEnabled } from "@/lib/analytics";
import { toast } from "sonner";
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

export const Route = createFileRoute("/settings")({
  component: Settings,
});

function Settings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const deleteAccountFn = useServerFn(deleteMyAccount);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function signOut() {
    track("sign_out");
    try { await queryClient.cancelQueries(); } catch {}
    try { queryClient.clear(); } catch {}
    try { await supabase.auth.signOut(); } catch { /* ignore — we reload anyway */ }
    try { const { nativeAuthClear } = await import("@/lib/native-auth"); await nativeAuthClear(); } catch {}
    if (typeof window !== "undefined") {
      window.location.assign("/auth");
    } else {
      navigate({ to: "/auth", replace: true });
    }
  }

  async function handleDelete() {
    if (confirmText !== "DELETE") return;
    setDeleting(true);
    // Safety net so the spinner never spins forever if the network hangs.
    const timeout = setTimeout(() => {
      setDeleting(false);
      toast.error("Delete timed out. Please try again.");
    }, 15000);
    try {
      // Prefer the edge function (works in both web + Capacitor SPA).
      // Fall back to the server fn only if invoke fails entirely.
      let ok = false;
      try {
        const { data, error } = await supabase.functions.invoke("delete-account", { body: {} });
        if (!error && (data?.ok ?? true)) ok = true;
        else if (error) throw error;
      } catch (invokeErr) {
        // Fallback for the SSR/web build that still has the real server fn.
        try { await deleteAccountFn(); ok = true; } catch { throw invokeErr; }
      }
      if (!ok) throw new Error("Delete failed");
      track("delete_account");
      try { await queryClient.cancelQueries(); } catch {}
      try { queryClient.clear(); } catch {}
      try { await supabase.auth.signOut(); } catch {}
      try { localStorage.clear(); } catch {}
      clearTimeout(timeout);
      toast.success("Account deleted");
      if (typeof window !== "undefined") window.location.assign("/auth");
      else navigate({ to: "/auth", replace: true });
    } catch (e) {
      clearTimeout(timeout);
      toast.error("Could not delete account", { description: (e as Error).message });
      setDeleting(false);
    }
  }

  return (
    <MobileFrame>
      <ScreenHeader title={t("settings.title")} back />

      <div className="px-6 space-y-5 pb-8">
        <LanguageSwitcher />

        <Group title={t("settings.notifications")} icon={Bell}>
          <Toggle storageKey="notif.urgent" label={t("settings.urgent")} defaultOn />
          <Toggle storageKey="notif.kaddish" label={t("settings.kaddishNearby")} defaultOn />
          <Toggle storageKey="notif.confirmed" label={t("settings.minyanConfirmed")} defaultOn />
          <Toggle storageKey="notif.quiet" label={t("settings.quietHours")} />
        </Group>

        <Group title={t("settings.nusachPrefs")} icon={Sparkles}>
          <SelectRow
            storageKey="nusach.primary"
            label={t("settings.primaryNusach")}
            defaultValue="Ashkenaz"
            options={["Ashkenaz", "Sephard", "Nusach Ari", "Edot Mizrach", "Yemenite"]}
          />
          <SelectRow
            storageKey="nusach.also"
            label={t("settings.alsoShow")}
            defaultValue="Sephard, Nusach Ari"
            options={["None", "Sephard", "Nusach Ari", "Sephard, Nusach Ari", "All"]}
          />
        </Group>

        <Group title={t("settings.shabbat")} icon={Moon}>
          <Toggle storageKey="shabbat.auto" label={t("settings.autoShabbat")} defaultOn />
          <Toggle storageKey="shabbat.mute" label={t("settings.muteShabbat")} defaultOn />
        </Group>

        <Group title={t("settings.privacy")} icon={Lock}>
          <Toggle storageKey="privacy.showMap" label={t("settings.showOnMap")} defaultOn />
          <Toggle storageKey="privacy.shareTrust" label={t("settings.shareTrust")} defaultOn />
          <SelectRow
            storageKey="privacy.visibility"
            label={t("settings.profileVisibility")}
            defaultValue={t("settings.communityOnly")}
            options={[t("settings.communityOnly"), "Public", "Private"]}
          />
        </Group>

        <Group title="Analytics" icon={BarChart3}>
          <AnalyticsToggle />
        </Group>

        <Group title={t("settings.location")} icon={MapPin}>
          <SelectRow
            storageKey="location.permission"
            label={t("settings.permission")}
            defaultValue={t("settings.whileUsing")}
            options={[t("settings.whileUsing"), "Always", "Never"]}
          />
          <Toggle storageKey="location.bg" label={t("settings.bgUpdates")} />
        </Group>

        <Group title={t("settings.accessibility")} icon={Accessibility}>
          <Toggle storageKey="a11y.largerText" label={t("settings.largerText")} />
          <Toggle storageKey="a11y.highContrast" label={t("settings.highContrast")} />
          <Toggle storageKey="a11y.reduceMotion" label={t("settings.reduceMotion")} />
        </Group>

        <div className="rounded-2xl bg-surface border border-border divide-y divide-border">
          <Link to="/privacy" className="block p-4 text-sm">Privacy Policy</Link>
          <Link to="/terms" className="block p-4 text-sm">Terms of Service</Link>
          <Link to="/support" className="block p-4 text-sm">Support</Link>
        </div>

        <button
          onClick={signOut}
          className="w-full text-center text-sm text-urgent py-4 rounded-2xl border border-border bg-surface"
        >
          Reset this device
        </button>

        <button
          onClick={() => { setConfirmText(""); setDeleteOpen(true); }}
          className="w-full flex items-center justify-center gap-2 text-center text-sm text-urgent py-4 rounded-2xl border border-urgent/30 bg-urgent/5"
        >
          <Trash2 className="h-4 w-4" /> Delete Account
        </button>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={(v) => { if (!deleting) setDeleteOpen(v); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes your profile, push tokens, participation history, and chat membership.
              Minyanim you created and joined will be removed from your account. This cannot be undone.
              <br /><br />
              Type <span className="font-semibold">DELETE</span> to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            disabled={deleting}
            className="w-full rounded-xl border border-border bg-surface p-3 text-sm outline-none focus:border-urgent"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmText !== "DELETE" || deleting}
              onClick={(e) => { e.preventDefault(); void handleDelete(); }}
              className="bg-urgent text-white hover:bg-urgent/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete forever"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

function AnalyticsToggle() {
  const [on, setOn] = useState(true);
  useEffect(() => { setOn(isAnalyticsEnabled()); }, []);
  function toggle() {
    const next = !on;
    setOn(next);
    setAnalyticsEnabled(next);
  }
  return (
    <button onClick={toggle} className="w-full p-4 flex items-center gap-3 text-left">
      <div className="flex-1 text-sm">
        Help improve MinyanNow
        <div className="text-[11px] text-muted-foreground mt-0.5">Anonymous usage analytics. No personal data.</div>
      </div>
      <div className={`relative h-6 w-10 rounded-full transition-colors ${on ? "bg-gold" : "bg-muted"}`}>
        <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-[18px]" : "translate-x-0.5"}`} />
      </div>
    </button>
  );
}

function SelectRow({
  label,
  defaultValue,
  options,
  storageKey,
}: {
  label: string;
  defaultValue: string;
  options: string[];
  storageKey: string;
}) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`minyannow.${storageKey}`);
      if (saved) setValue(saved);
    } catch {}
  }, [storageKey]);

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    setValue(next);
    try {
      localStorage.setItem(`minyannow.${storageKey}`, next);
    } catch {}
  }

  return (
    <label className="p-4 flex items-center gap-3 cursor-pointer">
      <div className="flex-1 text-sm">{label}</div>
      <div className="relative flex items-center gap-1 text-sm text-muted-foreground">
        <span>{value}</span>
        <ChevronDown className="h-4 w-4" />
        <select
          value={value}
          onChange={onChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        >
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </div>
    </label>
  );
}

function Toggle({ label, defaultOn = false, storageKey }: { label: string; defaultOn?: boolean; storageKey: string }) {
  const [on, setOn] = useState(defaultOn);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`minyannow.${storageKey}`);
      if (saved !== null) setOn(saved === "1");
    } catch {}
  }, [storageKey]);

  function toggle() {
    const next = !on;
    setOn(next);
    try {
      localStorage.setItem(`minyannow.${storageKey}`, next ? "1" : "0");
    } catch {}
  }

  return (
    <button onClick={toggle} className="w-full p-4 flex items-center gap-3 text-left">
      <div className="flex-1 text-sm">{label}</div>
      <div className={`relative h-6 w-10 rounded-full transition-colors ${on ? "bg-gold" : "bg-muted"}`}>
        <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-[18px]" : "translate-x-0.5"}`} />
      </div>
    </button>
  );
}
