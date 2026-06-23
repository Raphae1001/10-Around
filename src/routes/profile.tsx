import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader, TrustBadge, StatusPill } from "@/components/ui-bits";
import { Award, Plane, Flame, Settings, ChevronRight, Shield, CalendarCheck, Users, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/profile")({ component: Profile });

function Profile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null; backup_mode: boolean; backup_radius_m: number; trust_score: number } | null>(null);
  const [stats, setStats] = useState<{ minyanim_count: number; completed_count: number; streak_days: number; stars: number } | null>(null);
  const [recent, setRecent] = useState<Array<{ minyan_id: string; prayer: string | null; address: string | null; joined_at: string }>>([]);
  const [savingBackup, setSavingBackup] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (supabase as any).rpc("get_my_profile").then(({ data }: any) => {
      setProfile(Array.isArray(data) ? data[0] : data);
    });
    (supabase as any).rpc("get_my_stats").then(({ data }: any) => {
      setStats(Array.isArray(data) ? data[0] : data);
    });
    (supabase as any).rpc("get_my_recent_participations", { _limit: 5 }).then(({ data }: any) => {
      setRecent(Array.isArray(data) ? data : []);
    });
  }, [user]);


  const name = profile?.display_name ?? user?.email?.split("@")[0] ?? t("profile.guest");
  const initial = name[0]?.toUpperCase() ?? "?";
  const backupOn = profile?.backup_mode ?? false;

  async function toggleBackup() {
    if (!user || !profile) return;
    const next = !backupOn;
    setSavingBackup(true);
    setProfile({ ...profile, backup_mode: next });
    const { error } = await supabase.from("profiles").update({ backup_mode: next }).eq("id", user.id);
    setSavingBackup(false);
    if (error) {
      setProfile({ ...profile, backup_mode: !next });
      toast.error(t("profile.backupUpdateError"), { description: error.message });
    } else {
      toast.success(next ? t("profile.backupOnToast") : t("profile.backupOffToast"));
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <MobileFrame>
      <ScreenHeader title={t("profile.title")} right={
        <Link to="/settings" className="h-9 w-9 rounded-full bg-surface border border-border flex items-center justify-center">
          <Settings className="h-4 w-4" />
        </Link>
      } />

      <div className="mx-6 rounded-3xl navy-gradient text-white p-5 shadow-lift relative overflow-hidden">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-gold/20 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl gold-gradient text-navy flex items-center justify-center text-xl font-bold">{initial}</div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-xl truncate">{name}</div>
            <div className="text-xs text-white/60 truncate">{user?.email}</div>
            <div className="mt-2 flex items-center gap-2">
              <TrustBadge score={stats?.stars ?? 0} />
              <StatusPill tone="gold">{t("profile.trust")} {profile?.trust_score ?? 0}</StatusPill>
            </div>
          </div>
        </div>
        <div className="relative grid grid-cols-3 gap-2 mt-5 pt-5 border-t border-white/10 text-center">
          <Stat label={t("profile.stats.minyanim")} value={String(stats?.minyanim_count ?? 0)} />
          <Stat label={t("profile.stats.completed")} value={String(stats?.completed_count ?? 0)} />
          <Stat label={t("profile.stats.streak")} value={`${stats?.streak_days ?? 0}d`} />
        </div>

      </div>

      <div className="px-6 mt-6">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">{t("profile.badges")}</div>
        <div className="grid grid-cols-3 gap-3">
          <Badge icon={Flame} tone="urgent" label={t("profile.badgeMaker")} sub={t("profile.badgeMakerSub")} />
          <Badge icon={Plane} tone="sky" label={t("profile.badgeTraveler")} sub={t("profile.badgeTravelerSub")} />
          <Badge icon={Award} tone="gold" label={t("profile.badgeTrusted")} sub={t("profile.badgeTrustedSub")} />
        </div>
      </div>

      <div className="mx-6 mt-6 rounded-2xl border border-border bg-surface p-4 shadow-soft">
        <div className="flex items-start gap-3">
          <div className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 ${backupOn ? "gold-gradient text-gold-foreground" : "bg-muted text-muted-foreground"}`}>
            <Shield className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold">{t("profile.backupMode")}</div>
              {backupOn && <StatusPill tone="success">{t("profile.backupOn")}</StatusPill>}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{t("profile.backupHint")}</div>
          </div>
          <button onClick={toggleBackup} disabled={savingBackup || !profile} aria-label="Toggle backup mode"
            className={`h-7 w-12 rounded-full relative transition-colors shrink-0 ${backupOn ? "bg-gold" : "bg-muted"} disabled:opacity-50`}>
            <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${backupOn ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </div>
      </div>

      <Link to="/trust" className="mx-6 mt-4 rounded-2xl border border-border bg-surface p-4 flex items-center gap-3 shadow-soft block">
        <div className="h-10 w-10 rounded-2xl bg-success/15 flex items-center justify-center">
          <Shield className="h-5 w-5 text-success" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold">{t("profile.trustReliability")}</div>
          <div className="text-xs text-muted-foreground">{t("profile.trustSub")}</div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>

      <div className="px-6 mt-6 mb-8">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">{t("profile.recent")}</div>
        <div className="rounded-2xl border border-border bg-surface divide-y divide-border">
          {[
            { name: "Mincha · Park Ave Shul", time: "Today, 1:30 PM" },
            { name: "Maariv · Midtown Chabad", time: "Yesterday, 8:15 PM" },
            { name: "Shacharit · JFK T4 Chapel", time: "Sunday, 6:45 AM" },
            { name: "Mincha · Aaron's Loft", time: "Friday, 6:20 PM" },
          ].map((h, i) => (
            <div key={i} className="p-3.5 flex items-center gap-3">
              <CalendarCheck className="h-4 w-4 text-success" />
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{h.name}</div>
                <div className="text-[11px] text-muted-foreground">{h.time}</div>
              </div>
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 pb-10">
        <button onClick={signOut} className="w-full flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface py-3.5 text-sm font-semibold text-urgent">
          <LogOut className="h-4 w-4" /> {t("common.signOut")}
        </button>
      </div>
    </MobileFrame>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-display text-2xl text-gold">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-white/60 mt-0.5">{label}</div>
    </div>
  );
}

function Badge({ icon: Icon, tone, label, sub }: any) {
  const toneBg = tone === "urgent" ? "bg-urgent/10 text-urgent" : tone === "sky" ? "sky-gradient text-navy" : "gold-gradient text-gold-foreground";
  return (
    <div className="rounded-2xl border border-border bg-surface p-3 text-center">
      <div className={`mx-auto h-10 w-10 rounded-2xl flex items-center justify-center ${toneBg}`}><Icon className="h-5 w-5" /></div>
      <div className="text-xs font-semibold mt-2">{label}</div>
      <div className="text-[10px] text-muted-foreground">{sub}</div>
    </div>
  );
}
