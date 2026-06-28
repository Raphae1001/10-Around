import { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, Users, Clock, MapPin, Flame, Star, type LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-3 py-10">
      <div className="h-14 w-14 rounded-2xl bg-gold-soft text-gold-foreground flex items-center justify-center">
        <Icon className="h-7 w-7" />
      </div>
      <div className="space-y-1">
        <h3 className="font-display text-base text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground max-w-[260px] mx-auto leading-snug">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  back = false,
  right,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-6 pt-2 pb-4">
      <div className="flex items-center gap-3 min-w-0">
        {back && (
          <Link
            to="/home"
            className="h-9 w-9 rounded-full bg-surface border border-border shadow-card flex items-center justify-center"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
        )}
        <div className="min-w-0">
          <h1 className="font-display text-2xl leading-tight truncate">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

export function LiveBadge({ children = "LIVE" }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-urgent">
      <span className="relative inline-flex h-2 w-2">
        <span className="absolute inset-0 rounded-full bg-urgent opacity-50 live-pulse-ring" />
        <span className="relative inline-block h-2 w-2 rounded-full bg-urgent" />
      </span>
      {children}
    </span>
  );
}

export function StatusPill({
  tone = "default",
  children,
}: {
  tone?: "default" | "gold" | "urgent" | "success" | "sky";
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    default: "bg-muted text-foreground",
    gold: "gold-gradient text-gold-foreground",
    urgent: "bg-urgent/10 text-urgent",
    success: "bg-success/15 text-success",
    sky: "bg-accent text-accent-foreground",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export interface Minyan {
  id: string;
  name: string;
  type: "Shacharit" | "Mincha" | "Maariv";
  inMin: number;
  distance: string;
  confirmed: number;
  needed: number;
  nusach: string;
  urgency?: "kaddish" | "almost" | "missing" | "confirmed";
  location?: string;
  comment?: string;
}

export function MinyanCard({ m, compact = false }: { m: Minyan; compact?: boolean }) {
  const progress = Math.min(100, (m.confirmed / m.needed) * 100);
  const missing = Math.max(0, m.needed - m.confirmed);
  const isConfirmed = missing === 0;
  return (
    <Link
      to="/minyan"
      className="block bg-surface rounded-2xl border border-border shadow-card p-4 active:scale-[0.99] transition-transform"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusPill tone={isConfirmed ? "success" : m.urgency === "kaddish" ? "urgent" : "gold"}>
              {m.type}
            </StatusPill>
            {m.urgency === "kaddish" && <LiveBadge>Kaddish</LiveBadge>}
            {m.urgency === "almost" && <LiveBadge>Almost</LiveBadge>}
          </div>
          <h3 className="font-display text-lg leading-tight truncate">{m.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 truncate">
            <MapPin className="h-3 w-3" /> {m.distance} · {m.nusach}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">in</div>
          <div className="font-display text-2xl leading-none">{m.inMin}<span className="text-xs text-muted-foreground ml-0.5">m</span></div>
        </div>
      </div>

      {!compact && (
        <>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span className="text-sm text-foreground font-bold count-up">{m.confirmed} présents</span>
              <span>/ {m.needed}</span>
              {missing > 0 ? (
                <span className="ml-1 text-urgent font-medium">· {missing} manquent</span>
              ) : (
                <span className="ml-1 text-success font-medium">· minyan complet</span>
              )}
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" /> ~{m.inMin} min walk
            </span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden shimmer">
            <div
              className={`h-full rounded-full ${isConfirmed ? "bg-success" : "gold-gradient"}`}
              style={{ width: `${progress}%` }}
            />
            <span className="shimmer-bar" />
          </div>
        </>
      )}
    </Link>
  );
}

export function TrustBadge({ score = 4.9 }: { score?: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium">
      <Star className="h-3.5 w-3.5 fill-gold text-gold" />
      <span>{score.toFixed(1)}</span>
      <span className="text-muted-foreground">trust</span>
    </span>
  );
}

export function UrgentBanner({ children }: { children: ReactNode }) {
  return (
    <div className="mx-6 my-3 rounded-2xl border border-urgent/20 bg-urgent/5 p-3 flex items-center gap-3">
      <div className="h-9 w-9 rounded-full bg-urgent/10 flex items-center justify-center">
        <Flame className="h-4 w-4 text-urgent" />
      </div>
      <div className="text-sm leading-tight flex-1">{children}</div>
      <LiveBadge />
    </div>
  );
}
