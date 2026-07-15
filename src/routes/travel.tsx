import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader, StatusPill, LiveBadge } from "@/components/ui-bits";
import {
  Plane,
  Calendar,
  MapPin,
  Users,
  Plus,
  Check,
  Bell,
  Eye,
  EyeOff,
  Lock,
  Building2,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { guardLegacyScreen } from "@/lib/legacy-route";

export const Route = createFileRoute("/travel")({
  beforeLoad: guardLegacyScreen,
  component: TravelMinyan,
});

type Privacy = "public" | "minyan" | "private";

type ScheduledMinyan = {
  id: string;
  date: string;
  time: string;
  type: "Shacharit" | "Mincha" | "Maariv";
  venue: string;
  venueType: "Synagogue" | "Hotel" | "Street" | "Airport";
  nusach: string;
  confirmed: number;
  needed: number;
  joined: boolean;
};

const SUGGESTED_CITIES = ["Tel Aviv", "Paris", "Miami", "London", "Marrakech", "Rome"];

const SYNAGOGUES = [
  { id: "s1", name: "Great Synagogue", area: "Allenby St", walk: "5 min" },
  { id: "s2", name: "Beit Yaakov", area: "Rothschild Blvd", walk: "9 min" },
  { id: "s3", name: "Heichal Shlomo", area: "King George", walk: "12 min" },
];

const INITIAL_SCHEDULE: ScheduledMinyan[] = [
  {
    id: "m1",
    date: "Mar 14",
    time: "06:40",
    type: "Shacharit",
    venue: "Great Synagogue",
    venueType: "Synagogue",
    nusach: "Sephard",
    confirmed: 8,
    needed: 10,
    joined: false,
  },
  {
    id: "m2",
    date: "Mar 14",
    time: "19:10",
    type: "Mincha",
    venue: "Hotel Rothschild · Lobby",
    venueType: "Hotel",
    nusach: "Any",
    confirmed: 6,
    needed: 10,
    joined: false,
  },
  {
    id: "m3",
    date: "Mar 15",
    time: "06:45",
    type: "Shacharit",
    venue: "Beit Yaakov",
    venueType: "Synagogue",
    nusach: "Ashkenaz",
    confirmed: 10,
    needed: 10,
    joined: true,
  },
  {
    id: "m4",
    date: "Mar 15",
    time: "20:00",
    type: "Maariv",
    venue: "Allenby Beach Promenade",
    venueType: "Street",
    nusach: "Any",
    confirmed: 4,
    needed: 10,
    joined: false,
  },
];

function TravelMinyan() {
  const [city, setCity] = useState("Tel Aviv");
  const [arrival, setArrival] = useState("2026-03-14");
  const [departure, setDeparture] = useState("2026-03-18");
  const [privacy, setPrivacy] = useState<Privacy>("minyan");
  const [tripCreated, setTripCreated] = useState(false);
  const [schedule, setSchedule] = useState<ScheduledMinyan[]>(INITIAL_SCHEDULE);
  const [tab, setTab] = useState<"minyanim" | "synagogues">("minyanim");

  const nights = useMemo(() => {
    const d1 = new Date(arrival).getTime();
    const d2 = new Date(departure).getTime();
    if (!d1 || !d2 || d2 <= d1) return 0;
    return Math.round((d2 - d1) / 86_400_000);
  }, [arrival, departure]);

  const toggleJoin = (id: string) => {
    setSchedule((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const joining = !m.joined;
        const confirmed = Math.max(0, Math.min(m.needed, m.confirmed + (joining ? 1 : -1)));
        if (joining && confirmed === m.needed) {
          toast.success("Minyan complete — 10 of 10", {
            description: `${m.type} · ${m.venue} · you'll be notified`,
          });
        } else if (joining) {
          toast(`You're in for ${m.type} · ${m.venue}`, {
            description: `${confirmed}/${m.needed} confirmed · alert at 10`,
          });
        }
        return { ...m, joined: joining, confirmed };
      }),
    );
  };

  const createTrip = () => {
    if (!city || !arrival || !departure || nights <= 0) {
      toast.error("Pick a city and valid dates");
      return;
    }
    setTripCreated(true);
    toast.success(`Trip to ${city} saved`, {
      description: `${nights} nights · pinging local minyanim`,
    });
  };

  return (
    <MobileFrame>
      <ScreenHeader
        back
        title="Travel Minyan"
        subtitle="Pray everywhere. Plan ahead."
        right={<Plane className="h-5 w-5 text-gold" />}
      />

      {/* TRIP SETUP */}
      <div className="px-6">
        <div className="rounded-3xl navy-gradient text-white p-5 shadow-lift relative overflow-hidden">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold/20 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-white/60">
              <MapPin className="h-3 w-3 text-gold" /> Destination
            </div>

            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
              className="mt-1 w-full bg-transparent font-display text-3xl tracking-tight outline-none placeholder:text-white/30"
            />

            <div className="mt-2 flex flex-wrap gap-1.5">
              {SUGGESTED_CITIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCity(c)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition ${
                    city === c
                      ? "bg-gold text-gold-foreground border-gold"
                      : "border-white/20 text-white/80"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <DateField label="Arrival" value={arrival} onChange={setArrival} />
              <DateField label="Departure" value={departure} onChange={setDeparture} />
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-white/70">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />{" "}
                {nights > 0 ? `${nights} nights` : "Pick valid dates"}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-gold" /> 142 jews planning
              </span>
            </div>
          </div>
        </div>

        {/* Privacy */}
        <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
            Trip visibility
          </div>
          <div className="grid grid-cols-3 gap-2">
            <PrivacyTile
              active={privacy === "public"}
              onClick={() => setPrivacy("public")}
              icon={Eye}
              label="Everyone"
              hint="All members"
            />
            <PrivacyTile
              active={privacy === "minyan"}
              onClick={() => setPrivacy("minyan")}
              icon={EyeOff}
              label="Minyan only"
              hint="Participants"
            />
            <PrivacyTile
              active={privacy === "private"}
              onClick={() => setPrivacy("private")}
              icon={Lock}
              label="Private"
              hint="Only me"
            />
          </div>
        </div>

        <button
          onClick={createTrip}
          className="mt-4 w-full rounded-2xl gold-gradient text-gold-foreground font-semibold py-3.5 shadow-glow-gold active:scale-[0.99] transition-transform flex items-center justify-center gap-2"
        >
          {tripCreated ? (
            <>
              <Check className="h-4 w-4" /> Trip saved · updating live
            </>
          ) : (
            <>Save trip & find minyanim</>
          )}
        </button>
      </div>

      {/* SCHEDULE */}
      <div className="px-6 mt-7">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-display text-xl">During your stay</h2>
            <p className="text-xs text-muted-foreground">
              {city} · {nights > 0 ? `${nights} nights` : "no dates"}
            </p>
          </div>
          <LiveBadge>Live</LiveBadge>
        </div>

        <div className="flex bg-muted rounded-full p-1 mb-4">
          <TabBtn active={tab === "minyanim"} onClick={() => setTab("minyanim")}>
            Minyanim ({schedule.length})
          </TabBtn>
          <TabBtn active={tab === "synagogues"} onClick={() => setTab("synagogues")}>
            Synagogues ({SYNAGOGUES.length})
          </TabBtn>
        </div>

        {tab === "minyanim" ? (
          <div className="space-y-3">
            {schedule.map((m) => (
              <ScheduledCard key={m.id} m={m} onJoin={() => toggleJoin(m.id)} />
            ))}

            <Link
              to="/create"
              className="rounded-2xl border-2 border-dashed border-gold/40 bg-gold/5 p-4 flex items-center gap-3 active:scale-[0.99] transition-transform"
            >
              <div className="h-10 w-10 rounded-xl gold-gradient text-gold-foreground flex items-center justify-center shadow-glow-gold">
                <Plus className="h-5 w-5" strokeWidth={2.6} />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm">Create a minyan in {city}</div>
                <div className="text-[11px] text-muted-foreground">
                  Pick a time & spot · we ping locals + travelers
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {SYNAGOGUES.map((s) => (
              <div
                key={s.id}
                className="rounded-2xl border border-border bg-surface p-4 flex items-center gap-3"
              >
                <div className="h-10 w-10 rounded-xl bg-sky/30 text-navy flex items-center justify-center">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm truncate">{s.name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {s.area} · {s.walk} from hotel
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notification reminder */}
      <div className="px-6 mt-6 mb-8">
        <div className="rounded-2xl border border-gold/30 bg-gold/5 p-4 flex items-start gap-3">
          <Bell className="h-5 w-5 text-gold mt-0.5" />
          <div className="text-sm leading-snug">
            <div className="font-semibold flex items-center gap-2">
              You'll be notified the moment a minyan reaches 10
              <Sparkles className="h-4 w-4 text-gold" />
            </div>
            <span className="text-muted-foreground text-xs">
              Quiet during Shabbat & Yom Tov in {city}.
            </span>
          </div>
        </div>
      </div>
    </MobileFrame>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block rounded-xl bg-white/10 border border-white/15 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-white/60">{label}</div>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-sm font-semibold outline-none text-white [color-scheme:dark]"
      />
    </label>
  );
}

function PrivacyTile({
  active,
  onClick,
  icon: Icon,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Eye;
  label: string;
  hint: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border p-3 text-left transition ${
        active ? "border-gold bg-gold/10 ring-2 ring-gold/30" : "border-border bg-surface"
      }`}
    >
      <Icon className={`h-4 w-4 mb-1 ${active ? "text-gold" : "text-muted-foreground"}`} />
      <div className="text-xs font-semibold leading-tight">{label}</div>
      <div className="text-[10px] text-muted-foreground">{hint}</div>
    </button>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 text-xs font-semibold py-2 rounded-full transition ${
        active ? "bg-surface shadow-soft text-foreground" : "text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function ScheduledCard({ m, onJoin }: { m: ScheduledMinyan; onJoin: () => void }) {
  const progress = Math.min(100, (m.confirmed / m.needed) * 100);
  const complete = m.confirmed >= m.needed;
  return (
    <div className="bg-surface rounded-2xl border border-border shadow-soft p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <StatusPill tone={complete ? "success" : "gold"}>{m.type}</StatusPill>
            <span className="text-[11px] text-muted-foreground">
              {m.date} · {m.time}
            </span>
            {complete && <LiveBadge>10/10</LiveBadge>}
          </div>
          <h3 className="font-display text-base leading-tight truncate">{m.venue}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
            <MapPin className="h-3 w-3" /> {m.venueType} · {m.nusach}
          </p>
        </div>
        <button
          onClick={onJoin}
          className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-all active:scale-[0.97] ${
            m.joined
              ? "bg-success/15 text-success border border-success/30"
              : "gold-gradient text-gold-foreground shadow-glow-gold"
          }`}
        >
          {m.joined ? (
            <span className="flex items-center gap-1">
              <Check className="h-3.5 w-3.5" /> In
            </span>
          ) : (
            "Je participe"
          )}
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span className="text-foreground font-semibold count-up">{m.confirmed}</span>/{m.needed}
          {!complete ? (
            <span className="ml-1 text-urgent font-medium">· {m.needed - m.confirmed} to go</span>
          ) : (
            <span className="ml-1 text-success font-medium">· complete</span>
          )}
        </span>
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Bell className="h-3 w-3" /> alert at 10
        </span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${complete ? "bg-success" : "gold-gradient"}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
