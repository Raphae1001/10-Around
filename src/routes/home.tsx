import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader, StatusPill, type Minyan } from "@/components/ui-bits";
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
import { MapPin, Users, Plane, Building2, Plus, Clock, Sunrise, Sun, Moon, Check } from "lucide-react";

export const Route = createFileRoute("/home")({
  component: Home,
});

type Context = "Street" | "Airport" | "Hotel" | "Travel";

const initialMinyanim: Minyan[] = [
  { id: "1", name: "Corner of 5th & 42nd", type: "Mincha", inMin: 4, distance: "120 m", confirmed: 7, needed: 10, nusach: "Any", urgency: "almost", location: "Street" },
  { id: "2", name: "Bryant Park · north fountain", type: "Mincha", inMin: 12, distance: "380 m", confirmed: 5, needed: 10, nusach: "Sephard", location: "Street" },
  { id: "3", name: "Lobby · Hotel Marriott", type: "Maariv", inMin: 25, distance: "640 m", confirmed: 3, needed: 10, nusach: "Ashkenaz", location: "Hotel" },
  { id: "4", name: "Madison Sq · NE bench", type: "Mincha", inMin: 8, distance: "910 m", confirmed: 9, needed: 10, nusach: "Any", urgency: "almost", location: "Street", comment: "Kaddish for Avraham ben Yitzchak" },
];

function Home() {
  // ctx state removed — each tile now navigates directly
  const [minyanim, setMinyanim] = useState(initialMinyanim);
  const [joined, setJoined] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState<Minyan | null>(null);
  const [justJoined, setJustJoined] = useState<Minyan | null>(null);

  const confirmJoin = () => {
    if (!pending) return;
    const id = pending.id;
    let updated: Minyan | null = null;
    setMinyanim((list) =>
      list.map((m) => {
        if (m.id !== id) return m;
        const confirmed = m.confirmed + 1;
        if (confirmed === m.needed) {
          toast.success("Minyan confirmed!", { description: `${m.name} · 10/10 — heading there now.` });
        } else {
          toast(`You're in — ${confirmed}/${m.needed}`, { description: `${m.needed - confirmed} more needed.` });
        }
        updated = { ...m, confirmed };
        return updated;
      }),
    );
    setJoined((j) => ({ ...j, [id]: true }));
    setJustJoined(updated ?? pending);
    setPending(null);
  };

  return (
    <MobileFrame>
      <ScreenHeader
        title="MinyanStreet"
        subtitle="Find or start a minyan within 1 km"
        right={
          <Link to="/profile" className="h-9 w-9 rounded-full bg-gold/20 flex items-center justify-center text-xs font-semibold">D</Link>
        }
      />

      {/* Where are you — TOP — each tile opens /create pre-filled */}
      <div className="px-6">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">Start a minyan — where are you?</div>
        <div className="grid grid-cols-4 gap-2">
          <CtxTile id="Street" icon={MapPin} />
          <CtxTile id="Airport" icon={Plane} />
          <CtxTile id="Hotel" icon={Building2} />
          <CtxTile id="Travel" icon={Plane} />
        </div>
      </div>

      {/* THE one true action */}
      <div className="px-6 mt-5">
        <Link
          to="/create"
          search={{ ctx: "Street" }}
          className="relative block rounded-3xl overflow-hidden navy-gradient text-white p-5 shadow-lift active:scale-[0.99] transition-transform"
        >
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold/25 blur-3xl" />
          <div className="relative flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-white/60">
                <MapPin className="h-3 w-3 text-gold" /> Right where you stand
              </div>
              <h2 className="mt-1.5 font-display text-[26px] leading-[1.05]">
                Start a minyan<br /><span className="text-gold">right here.</span>
              </h2>
            </div>
            <div className="h-14 w-14 shrink-0 rounded-full gold-gradient text-gold-foreground flex items-center justify-center shadow-glow-gold">
              <Plus className="h-7 w-7" strokeWidth={2.6} />
            </div>
          </div>
        </Link>
      </div>

      {/* Join a nearby minyan */}
      <div className="px-6 mt-6 mb-2 flex items-end justify-between">
        <div>
          <h2 className="font-display text-xl">Or join one nearby</h2>
          <p className="text-xs text-muted-foreground">Within 1 km · live right now</p>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">1 km max</span>
      </div>

      <div className="px-6 space-y-3 pb-8">
        {minyanim.map((m) => (
          <NearbyCard
            key={m.id}
            m={m}
            joined={!!joined[m.id]}
            onJoinRequest={() => setPending(m)}
          />
        ))}
      </div>

      {/* Double-confirm dialog */}
      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you'll show up?</AlertDialogTitle>
            <AlertDialogDescription>
              {pending && (
                <>
                  You're committing to <strong>{pending.type}</strong> at <strong>{pending.name}</strong> in {pending.inMin} min.
                  <br /><br />
                  Others count on your presence. Cancelling lowers your trust score.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not yet</AlertDialogCancel>
            <AlertDialogAction onClick={confirmJoin}>I commit — count me in</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* After-join: offer directions on the map */}
      <AlertDialog open={!!justJoined} onOpenChange={(o) => !o && setJustJoined(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>You're in! Want directions?</AlertDialogTitle>
            <AlertDialogDescription>
              {justJoined && (
                <>
                  Open the map to walk to <strong>{justJoined.name}</strong> — {justJoined.distance} away, starts in {justJoined.inMin} min.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Later</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Link to="/map" onClick={() => setJustJoined(null)}>Open map</Link>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileFrame>
  );
}

function CtxTile({
  id, icon: Icon,
}: { id: Context; icon: typeof MapPin }) {
  return (
    <Link
      to="/create"
      search={{ ctx: id }}
      className="rounded-2xl border bg-surface border-border p-3 flex flex-col items-center gap-1.5 transition-all active:scale-[0.97] hover:border-gold/60"
    >
      <div className="h-9 w-9 rounded-xl bg-muted text-muted-foreground flex items-center justify-center">
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-xs font-semibold">{id}</div>
    </Link>
  );
}


function NearbyCard({
  m, joined, onJoinRequest,
}: { m: Minyan; joined: boolean; onJoinRequest: () => void }) {
  const missing = Math.max(0, m.needed - m.confirmed);
  const confirmed = missing === 0;
  const PrayerIcon = m.type === "Shacharit" ? Sunrise : m.type === "Mincha" ? Sun : Moon;
  const progress = Math.min(100, (m.confirmed / m.needed) * 100);

  return (
    <div className="bg-surface rounded-2xl border border-border shadow-soft p-4">
      <div className="flex items-start gap-3">
        <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${confirmed ? "bg-success/15 text-success" : "bg-gold/10 text-gold"}`}>
          <PrayerIcon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <StatusPill tone={confirmed ? "success" : "gold"}>{m.type}</StatusPill>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> in {m.inMin} min
            </span>
          </div>
          <h3 className="font-display text-base leading-tight truncate">{m.name}</h3>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <MapPin className="h-3 w-3" /> {m.distance} · {m.nusach}
          </p>
          {m.comment && (
            <p className="text-[11px] mt-1 italic text-urgent">"{m.comment}"</p>
          )}
        </div>

        <button
          onClick={onJoinRequest}
          disabled={joined || confirmed}
          aria-label="Join this minyan"
          className={`h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center transition-all ${
            joined
              ? "bg-success text-white"
              : confirmed
                ? "bg-muted text-muted-foreground"
                : "gold-gradient text-gold-foreground shadow-glow-gold active:scale-95"
          }`}
        >
          {joined ? <Check className="h-6 w-6" strokeWidth={2.8} /> : <Plus className="h-6 w-6" strokeWidth={2.8} />}
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-semibold">{m.confirmed}/{m.needed}</span>
          {missing > 0 ? (
            <span className="text-urgent font-medium">· {missing} missing</span>
          ) : (
            <span className="text-success font-medium">· complete</span>
          )}
        </span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${confirmed ? "bg-success" : "gold-gradient"}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
