import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader } from "@/components/ui-bits";
import {
  Award,
  Plane,
  Flame,
  Settings,
  ChevronRight,
  Shield,
  CalendarCheck,
  LogOut,
  MessageCircle,
  Pencil,
  Star,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { tapLight } from "@/lib/haptics";

export const Route = createFileRoute("/profile")({ component: Profile });

type ProfileRow = {
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  backup_mode: boolean;
  backup_radius_m: number;
  trust_score: number;
};

type StatsRow = {
  minyanim_count: number;
  completed_count: number;
  streak_days: number;
  stars: number;
};

function Profile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [editing, setEditing] = useState(false);
  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [stats, setStats] = useState<StatsRow | null>(null);
  const [recent, setRecent] = useState<
    Array<{ minyan_id: string; prayer: string | null; address: string | null; joined_at: string }>
  >([]);
  const [savingBackup, setSavingBackup] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    void (supabase as any).rpc("get_my_profile").then(({ data }: any) => {
      setProfile(Array.isArray(data) ? data[0] : data);
    });
    void (supabase as any).rpc("get_my_stats").then(({ data }: any) => {
      setStats(Array.isArray(data) ? data[0] : data);
    });
    void (supabase as any)
      .rpc("get_my_recent_participations", { _limit: 5 })
      .then(({ data }: any) => {
        setRecent(Array.isArray(data) ? data : []);
      });
  }, [user]);

  const first = profile?.first_name ?? "";
  const last = profile?.last_name ?? "";
  const name =
    first || last ? `${first} ${last}`.trim() : (profile?.display_name ?? t("profile.guest"));
  const initial = name[0]?.toUpperCase() ?? "?";
  const backupOn = profile?.backup_mode ?? false;
  const stars = Number(stats?.stars ?? 0);

  function startEdit() {
    void tapLight();
    setEditFirst(first);
    setEditLast(last);
    setEditing(true);
  }

  async function saveName() {
    if (!user || !profile) return;
    const f = editFirst.trim();
    const l = editLast.trim();
    if (f.length < 2 || l.length < 2) {
      toast.error(t("profile.nameRequired"));
      return;
    }
    setSavingName(true);
    const display = `${f} ${l}`;
    const { error } = await supabase
      .from("profiles")
      .update({ first_name: f, last_name: l, display_name: display } as any)
      .eq("id", user.id);
    setSavingName(false);
    if (error) {
      toast.error(t("profile.nameSaveError"), { description: error.message });
      return;
    }
    setProfile({ ...profile, first_name: f, last_name: l, display_name: display });
    setEditing(false);
    void import("@/lib/analytics").then(({ track }) => track("update_profile", { field: "name" }));
  }

  async function toggleBackup() {
    if (!user || !profile) return;
    void tapLight();
    const next = !backupOn;
    setSavingBackup(true);
    setProfile({ ...profile, backup_mode: next });
    const { error } = await supabase
      .from("profiles")
      .update({ backup_mode: next })
      .eq("id", user.id);
    setSavingBackup(false);
    if (error) {
      setProfile({ ...profile, backup_mode: !next });
      toast.error(t("profile.backupUpdateError"), { description: error.message });
    } else {
      void import("@/lib/analytics").then(({ track }) =>
        track("update_profile", { field: "backup_mode" }),
      );
      toast.success(next ? t("profile.backupOnToast") : t("profile.backupOffToast"));
    }
  }

  async function signOut() {
    void import("@/lib/analytics").then(({ track }) => track("sign_out"));
    try {
      await supabase.auth.signOut();
    } catch {}
    try {
      const { nativeAuthClear } = await import("@/lib/native-auth");
      await nativeAuthClear();
    } catch {}
    if (typeof window !== "undefined") {
      window.location.assign("/auth");
    } else {
      navigate({ to: "/auth", replace: true });
    }
  }

  return (
    <MobileFrame>
      <ScreenHeader
        title={t("profile.title")}
        right={
          <Link
            to="/settings"
            onClick={() => void tapLight()}
            className="h-9 w-9 rounded-full bg-surface border border-border flex items-center justify-center active:scale-95 transition-transform"
            aria-label={t("common.settings")}
          >
            <Settings className="h-4 w-4" />
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto overscroll-y-contain px-6 space-y-6 pb-8">
        {/* Identity card — focal point kept */}
        <div className="rounded-3xl navy-gradient text-white p-5 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-gold/30 blur-2xl pointer-events-none" />
          <div className="relative flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl gold-gradient text-navy flex items-center justify-center text-xl font-bold shrink-0">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xl font-semibold truncate leading-tight">{name}</div>
              <button
                onClick={startEdit}
                className="text-xs text-gold font-medium mt-1 inline-flex items-center gap-1 active:opacity-70"
              >
                <Pencil className="h-3 w-3" /> {t("profile.editProfile")}
              </button>
              <div className="mt-2 flex items-center gap-2 text-xs text-white/80">
                <Star className="h-3.5 w-3.5 fill-gold text-gold shrink-0" />
                <span className="font-medium text-white">{stars.toFixed(1)}</span>
                <span className="text-white/50">·</span>
                <span>
                  {t("profile.trust")} {profile?.trust_score ?? 0}
                </span>
              </div>
            </div>
          </div>
          <div className="relative grid grid-cols-3 gap-2 mt-5 pt-5 border-t border-white/10 text-center">
            <HeroStat
              label={t("profile.stats.minyanim")}
              value={String(stats?.minyanim_count ?? 0)}
            />
            <HeroStat
              label={t("profile.stats.completed")}
              value={String(stats?.completed_count ?? 0)}
            />
            <HeroStat label={t("profile.stats.streak")} value={`${stats?.streak_days ?? 0}d`} />
          </div>
        </div>

        {/* Badges — grouped list */}
        <ProfileSection title={t("profile.badges")}>
          <BadgeRow
            icon={Flame}
            label={t("profile.badgeMaker")}
            sub={t("profile.badgeMakerProgress", { count: stats?.completed_count ?? 0 })}
            locked={(stats?.completed_count ?? 0) === 0}
          />
          <BadgeRow
            icon={Plane}
            label={t("profile.badgeTraveler")}
            sub={t("profile.badgeTravelerProgress", { count: stats?.minyanim_count ?? 0 })}
            locked={(stats?.minyanim_count ?? 0) === 0}
          />
          <BadgeRow
            icon={Award}
            label={t("profile.badgeTrusted")}
            sub={`${stars.toFixed(1)} / 5`}
            locked={stars === 0}
            isLast
          />
        </ProfileSection>

        {/* Shortcuts — single group */}
        <ProfileSection title={t("profile.shortcuts")}>
          <button
            type="button"
            onClick={toggleBackup}
            disabled={savingBackup || !profile}
            className="w-full px-4 py-3.5 flex items-center gap-3 text-left border-b border-border/60 active:bg-muted/50 disabled:opacity-50"
          >
            <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Shield className="h-[18px] w-[18px] text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-medium">{t("profile.backupMode")}</div>
              <div className="text-[13px] text-muted-foreground mt-0.5 leading-snug">
                {t("profile.backupHint")}
              </div>
            </div>
            <IosSwitch on={backupOn} />
          </button>
          <NavRow
            to="/trust"
            label={t("profile.trustReliability")}
            sub={t("profile.trustSub")}
            icon={Shield}
          />
          <NavRow
            to="/chats"
            label={t("profile.groupChats")}
            sub={t("profile.groupChatsSub")}
            icon={MessageCircle}
            isLast
          />
        </ProfileSection>

        {/* Recent */}
        <ProfileSection title={t("profile.recent")}>
          {recent.length === 0 ? (
            <p className="px-4 py-5 text-[13px] text-muted-foreground text-center">
              {t("profile.noHistory")}
            </p>
          ) : (
            recent.map((h, idx) => (
              <Link
                key={h.minyan_id}
                to="/minyan"
                search={{ id: h.minyan_id }}
                onClick={() => void tapLight()}
                className={`flex items-center gap-3 px-4 py-3.5 min-h-[60px] active:bg-muted/50 ${
                  idx < recent.length - 1 ? "border-b border-border/60" : ""
                }`}
              >
                <div className="h-9 w-9 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                  <CalendarCheck className="h-[18px] w-[18px] text-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-medium truncate">
                    {h.prayer
                      ? t(`prayer.${h.prayer}`, { defaultValue: h.prayer })
                      : t("minyan.title")}
                    {h.address ? ` · ${h.address}` : ""}
                  </div>
                  <div className="text-[13px] text-muted-foreground mt-0.5">
                    {new Date(h.joined_at).toLocaleString()}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Link>
            ))
          )}
        </ProfileSection>

        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface py-3.5 text-sm font-medium text-muted-foreground active:bg-muted/50 transition-colors"
        >
          <LogOut className="h-4 w-4" /> {t("common.signOut")}
        </button>
        <p className="text-[11px] text-muted-foreground text-center -mt-4 px-4">
          {t("profile.signOutHint")}
        </p>
      </div>

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
          onClick={() => !savingName && setEditing(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-background p-5 shadow-lift"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-lg font-semibold mb-3">{t("profile.editProfile")}</div>
            <label className="block mb-3">
              <span className="text-xs font-medium text-muted-foreground">
                {t("profile.firstName")}
              </span>
              <input
                value={editFirst}
                onChange={(e) => setEditFirst(e.target.value)}
                maxLength={40}
                className="mt-1 w-full rounded-2xl border border-border bg-surface p-3 text-sm outline-none focus:border-gold"
              />
            </label>
            <label className="block mb-4">
              <span className="text-xs font-medium text-muted-foreground">
                {t("profile.lastName")}
              </span>
              <input
                value={editLast}
                onChange={(e) => setEditLast(e.target.value)}
                maxLength={40}
                className="mt-1 w-full rounded-2xl border border-border bg-surface p-3 text-sm outline-none focus:border-gold"
              />
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(false)}
                disabled={savingName}
                className="flex-1 rounded-2xl border border-border py-3 text-sm font-semibold"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={saveName}
                disabled={savingName}
                className="flex-1 rounded-2xl bg-foreground text-background py-3 text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </MobileFrame>
  );
}

function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
        {title}
      </h2>
      <div className="rounded-2xl bg-surface border border-border overflow-hidden">{children}</div>
    </section>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-2xl font-semibold text-gold leading-none">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-white/50 mt-1">{label}</div>
    </div>
  );
}

function BadgeRow({
  icon: Icon,
  label,
  sub,
  locked,
  isLast,
}: {
  icon: typeof Flame;
  label: string;
  sub: string;
  locked?: boolean;
  isLast?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3.5 ${!isLast ? "border-b border-border/60" : ""} ${
        locked ? "opacity-50" : ""
      }`}
    >
      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
        <Icon className="h-[18px] w-[18px] text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-medium">{label}</div>
        <div className="text-[13px] text-muted-foreground mt-0.5">{sub}</div>
      </div>
    </div>
  );
}

function NavRow({
  to,
  label,
  sub,
  icon: Icon,
  isLast,
}: {
  to: string;
  label: string;
  sub: string;
  icon: typeof Shield;
  isLast?: boolean;
}) {
  return (
    <Link
      to={to}
      onClick={() => void tapLight()}
      className={`flex items-center gap-3 px-4 py-3.5 active:bg-muted/50 ${!isLast ? "border-b border-border/60" : ""}`}
    >
      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
        <Icon className="h-[18px] w-[18px] text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-medium">{label}</div>
        <div className="text-[13px] text-muted-foreground mt-0.5 leading-snug">{sub}</div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </Link>
  );
}

function IosSwitch({ on }: { on: boolean }) {
  return (
    <div
      className={`relative h-[31px] w-[51px] rounded-full shrink-0 transition-colors ${on ? "bg-gold" : "bg-muted"}`}
      aria-hidden
    >
      <div
        className={`absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-[22px]" : "translate-x-[2px]"
        }`}
      />
    </div>
  );
}
