import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
  Clock,
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
import { deleteAccountAndLeave, signOutAndLeave } from "@/lib/leave-account";
import { linkProviderIdentity } from "@/lib/native-auth";

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

  const signingOutRef = useRef(false);
  const [upgrading, setUpgrading] = useState<"apple" | "google" | null>(null);

  async function upgradeAccount(provider: "apple" | "google") {
    if (upgrading) return;
    setUpgrading(provider);
    try {
      await linkProviderIdentity(provider);
      toast.success(t("auth.upgradeSuccess"));
    } catch (e) {
      toast.error(t("auth.upgradeError"), { description: (e as Error).message });
    } finally {
      setUpgrading(null);
    }
  }

  async function signOut() {
    // Guards a double-tap: navigation is instant now, so nothing else
    // disables the button in between the click and the route change.
    if (signingOutRef.current) return;
    signingOutRef.current = true;
    void import("@/lib/analytics").then(({ track }) => track("sign_out"));
    // Navigate first (client-side, no reload) so the account teardown keeps
    // running in the background instead of blocking the screen transition.
    navigate({ to: "/onboarding" });
    try {
      if (user?.is_anonymous) {
        await deleteAccountAndLeave();
      } else {
        await signOutAndLeave();
      }
    } catch (e) {
      toast.error(t("common.couldNotSignOut"), { description: (e as Error).message });
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

      <div className="px-6 space-y-6 pb-8">
        {/* Identity card — ONLY dark surface in the app */}
        <div className="rounded-3xl bg-dark-surface text-dark-surface-foreground p-5">
          <div className="flex items-center gap-4">
            <div
              className="h-16 w-16 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0 text-dark-surface-foreground"
              style={{
                background: "oklch(0.32 0.015 250)",
                boxShadow: "0 0 0 2px var(--accent)",
              }}
            >
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xl font-semibold truncate leading-tight">{name}</div>
              <button
                onClick={startEdit}
                className="text-xs text-accent font-medium mt-1 inline-flex items-center gap-1 active:opacity-70"
              >
                <Pencil className="h-3 w-3" /> {t("profile.editProfile")}
              </button>
              <div className="mt-2 flex items-center gap-2 text-xs text-dark-surface-foreground/80">
                <Star className="h-3.5 w-3.5 fill-accent text-accent shrink-0" />
                <span className="font-medium">{stars.toFixed(1)}</span>
                <span className="opacity-50">·</span>
                <span>
                  {t("profile.trust")} {profile?.trust_score ?? 0}
                </span>
              </div>
              <div
                className="mt-2.5 h-1.5 rounded-full overflow-hidden"
                style={{ background: "oklch(0.3 0.015 250)" }}
              >
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{
                    width: `${Math.min(100, Math.max(0, profile?.trust_score ?? 0))}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Trio de stats — cartes séparées */}
        <div className="grid grid-cols-3 gap-2">
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
            <span
              className={`shrink-0 inline-flex rounded-full p-0.5 text-[11px] font-semibold ${
                backupOn ? "bg-accent/15" : "bg-surface-muted"
              }`}
              aria-hidden
            >
              <span
                className={`px-2.5 py-1 rounded-full transition-colors ${
                  !backupOn ? "bg-surface text-ink shadow-soft" : "text-ink-soft"
                }`}
              >
                {t("profile.backupOff")}
              </span>
              <span
                className={`px-2.5 py-1 rounded-full transition-colors ${
                  backupOn ? "bg-accent text-accent-foreground shadow-soft" : "text-ink-soft"
                }`}
              >
                {t("profile.backupOn")}
              </span>
            </span>
          </button>
          <NavRow
            to="/trust"
            label={t("profile.trustReliability")}
            sub={t("profile.trustSub")}
            icon={Shield}
          />
          <NavRow
            to="/zmanim"
            label={t("profile.zmanim")}
            sub={t("profile.zmanimSub")}
            icon={Clock}
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

        {user?.is_anonymous && (
          <section className="rounded-2xl bg-surface shadow-soft p-4 space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-ink">{t("auth.upgradeTitle")}</h2>
              <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
                {t("auth.upgradeBody")}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => void upgradeAccount("apple")}
                disabled={upgrading !== null}
                className="flex-1 h-11 flex items-center justify-center gap-2 rounded-2xl bg-black text-white text-sm font-semibold disabled:opacity-60"
              >
                {upgrading === "apple" && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("auth.upgradeApple")}
              </button>
              <button
                onClick={() => void upgradeAccount("google")}
                disabled={upgrading !== null}
                className="flex-1 h-11 flex items-center justify-center gap-2 rounded-2xl border border-border bg-white text-[#1f1f1f] text-sm font-semibold disabled:opacity-60"
              >
                {upgrading === "google" && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("auth.upgradeGoogle")}
              </button>
            </div>
          </section>
        )}

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
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft mb-2 px-1">
        {title}
      </h2>
      <div className="rounded-2xl bg-surface shadow-soft overflow-hidden">{children}</div>
    </section>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface shadow-soft p-3 text-center">
      <div className="font-serif-brand text-[22px] text-ink leading-none">{value}</div>
      <div className="text-[11px] text-ink-soft mt-1.5">{label}</div>
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
      className={`flex items-center gap-3 px-4 py-3.5 relative ${
        !isLast
          ? "after:absolute after:left-16 after:right-0 after:bottom-0 after:h-px after:bg-hairline"
          : ""
      } ${locked ? "opacity-50" : ""}`}
    >
      <div className="h-9 w-9 rounded-full bg-surface-muted flex items-center justify-center shrink-0">
        <Icon className="h-[18px] w-[18px] text-ink-soft" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-medium text-ink">{label}</div>
        <div className="text-[13px] text-ink-soft mt-0.5">{sub}</div>
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
