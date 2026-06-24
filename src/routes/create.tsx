import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { MobileFrame } from "@/components/MobileFrame";
import { ScreenHeader } from "@/components/ui-bits";
import { Sunrise, Sun, Moon, MapPin, Users, Crosshair, Plane, Building2, Globe2, Minus, Plus, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useGeolocation } from "@/hooks/use-geolocation";
import { supabase } from "@/integrations/supabase/client";
import { reverseGeocode } from "@/lib/geocoding";
import { AddressAutocomplete, type AddressPick } from "@/components/AddressAutocomplete";


type Context = "Street" | "Airport" | "Hotel" | "Travel";

export const Route = createFileRoute("/create")({
  validateSearch: (s: Record<string, unknown>): { ctx?: Context } => ({
    ctx: (["Street", "Airport", "Hotel", "Travel"] as const).includes(s.ctx as Context)
      ? (s.ctx as Context)
      : undefined,
  }),
  component: Create,
});

function Create() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { position, request: requestGeo } = useGeolocation(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  const { ctx: initialCtx } = Route.useSearch();
  const [ctx, setCtx] = useState<Context>(initialCtx ?? "Street");
  const [prayer, setPrayer] = useState("Mincha");
  const [when, setWhen] = useState("Now");
  const [present, setPresent] = useState(3);
  const [nusach, setNusach] = useState("Any");
  const [comment, setComment] = useState("");

  // Street
  const [street, setStreet] = useState("");
  const [streetAuto, setStreetAuto] = useState(false);

  // Auto-fill exact street name from GPS for Street context
  useEffect(() => {
    if (ctx !== "Street" || !position || streetAuto) return;
    let cancelled = false;
    reverseGeocode(position.lat, position.lng).then((addr) => {
      if (!cancelled && addr) {
        setStreet(addr);
        setStreetAuto(true);
      }
    });
    return () => { cancelled = true; };
  }, [ctx, position, streetAuto]);
  // Airport
  const [airport, setAirport] = useState("");
  const [gate, setGate] = useState("");
  // Hotel / "Other" — single address field with autocomplete
  const [hotelAddress, setHotelAddress] = useState("");
  const [hotelPick, setHotelPick] = useState<AddressPick | null>(null);
  // Travel / "Abroad" — destination city autocomplete
  const [tripCity, setTripCity] = useState("");
  const [tripPick, setTripPick] = useState<AddressPick | null>(null);
  const [tripDateStart, setTripDateStart] = useState("");
  const [tripDateEnd, setTripDateEnd] = useState("");
  // Scheduled time (Hotel & Travel only — can plan in advance)
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const prayers = [
    { name: "Shacharit", icon: Sunrise },
    { name: "Mincha", icon: Sun },
    { name: "Maariv", icon: Moon },
  ];

  const ctxLabel: Record<Context, string> = {
    Street: "On the street, right now",
    Airport: "At the airport before my flight",
    Hotel: "Hotel, synagogue, apartment… anywhere scheduled",
    Travel: "Destination city, not your current location",
  };

  const ctxDisplay: Record<Context, string> = {
    Street: t("ctx.Street"),
    Airport: t("ctx.Airport"),
    Hotel: t("ctx.Hotel"),
    Travel: t("ctx.Travel"),
  };

  useEffect(() => {
    if (ctx === "Street" && !position) requestGeo();
  }, [ctx, position, requestGeo]);

  const tripCityLabel = getTravelCityLabel(tripPick, tripCity);



  const locationSummary =
    ctx === "Street" ? street :
    ctx === "Airport" ? [airport, gate && `Gate ${gate}`].filter(Boolean).join(" · ") || "Set airport & gate" :
    ctx === "Hotel" ? (hotelAddress || "Set the address") :
    [tripCityLabel || tripCity, tripDateStart && tripDateEnd ? `${tripDateStart} → ${tripDateEnd}` : tripDateStart].filter(Boolean).join(" · ") || "Set city & dates";


  return (
    <MobileFrame>
      <ScreenHeader
        title={ctx === "Travel" ? "Abroad" : "Start a minyan"}
        subtitle={ctx === "Travel" ? "Create" : "Fill in the details — everyone will see them"}
        back
      />

      <div className="px-6 space-y-5 pb-4">
        {/* 1. WHERE */}
        <Section step="1" title={ctx === "Travel" ? "Where will you be?" : "Where are you?"}>
          <div className="grid grid-cols-4 gap-2">
            {(["Street", "Airport", "Hotel", "Travel"] as Context[]).map((c) => {
              const Icon = c === "Street" ? MapPin : c === "Airport" ? Plane : c === "Hotel" ? Building2 : Globe2;
              const active = ctx === c;
              return (
                <button
                  key={c}
                  onClick={() => setCtx(c)}
                  className={`rounded-2xl border p-3 flex flex-col items-center gap-1.5 transition-all ${
                    active ? "border-gold ring-2 ring-gold/30 bg-gold/5" : "border-border bg-surface"
                  }`}
                >
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${active ? "gold-gradient text-gold-foreground" : "bg-muted text-muted-foreground"}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-[11px] font-semibold">{ctxDisplay[c]}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">{ctxLabel[ctx]}</p>

          {/* Context-specific inputs */}
          {ctx === "Street" && (
            <div className="mt-3 space-y-2">
              <div className="rounded-2xl border border-gold/30 bg-gold/5 p-3 flex items-center gap-3">
                <Crosshair className="h-4 w-4 text-gold" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold leading-tight">GPS auto-detected</div>
                  <div className="text-[11px] text-muted-foreground">Drop pin on your exact spot</div>
                </div>
              </div>
              <input
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="Street, corner, landmark…"
                className="w-full rounded-2xl border border-border bg-surface p-3 text-sm outline-none focus:border-gold"
              />
            </div>
          )}
          {ctx === "Airport" && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <input
                value={airport}
                onChange={(e) => setAirport(e.target.value)}
                placeholder="Airport (e.g. JFK, CDG)"
                className="rounded-2xl border border-border bg-surface p-3 text-sm outline-none focus:border-gold"
              />
              <input
                value={gate}
                onChange={(e) => setGate(e.target.value)}
                placeholder="Terminal / Gate (e.g. T2 · B14)"
                className="rounded-2xl border border-border bg-surface p-3 text-sm outline-none focus:border-gold"
              />
            </div>
          )}
          {ctx === "Hotel" && (
            <div className="mt-3 space-y-2">
              <AddressAutocomplete
                value={hotelAddress}
                onChange={setHotelAddress}
                onPick={setHotelPick}
                placeholder="Address (hotel, shul, apartment…)"
              />
              <p className="text-[11px] text-muted-foreground">Type a place — pick it from the suggestions to lock the exact spot on the map.</p>
            </div>
          )}
          {ctx === "Travel" && (
            <div className="mt-3 space-y-2">
              <AddressAutocomplete
                value={tripCity}
                onChange={(value) => {
                  setTripCity(value);
                  setTripPick(null);
                }}
                onPick={setTripPick}
                placeholder="Destination city"
                citiesOnly
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground ml-1">From</label>
                  <input
                    value={tripDateStart}
                    onChange={(e) => setTripDateStart(e.target.value)}
                    type="date"
                    className="w-full rounded-2xl border border-border bg-surface p-3 text-sm outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground ml-1">To</label>
                  <input
                    value={tripDateEnd}
                    onChange={(e) => setTripDateEnd(e.target.value)}
                    type="date"
                    className="w-full rounded-2xl border border-border bg-surface p-3 text-sm outline-none focus:border-gold"
                  />
                </div>
              </div>
            </div>
          )}
        </Section>


        {/* 1b. SCHEDULE — Hotel only (Travel uses trip dates) */}
        {ctx === "Hotel" && (
          <Section step="★" title="Schedule the minyan (date & time)">
            <div className="grid grid-cols-2 gap-2">
              <input
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                type="date"
                className="rounded-2xl border border-border bg-surface p-3 text-sm outline-none focus:border-gold"
              />
              <input
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                type="time"
                className="rounded-2xl border border-border bg-surface p-3 text-sm outline-none focus:border-gold"
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Travelers can plan in advance — pick when the minyan starts.
            </p>
          </Section>
        )}

        {/* PRAYER / WHEN / HOW MANY / NUSACH — hidden for Travel */}
        {ctx !== "Travel" && (
          <>
            <Section step="2" title="Which prayer?">
              <div className="grid grid-cols-3 gap-2">
                {prayers.map(({ name, icon: Icon }) => {
                  const active = prayer === name;
                  return (
                    <button
                      key={name}
                      onClick={() => setPrayer(name)}
                      className={`flex flex-col items-center gap-2 py-4 rounded-2xl border transition-all ${
                        active ? "border-gold bg-gold/10 shadow-soft" : "border-border bg-surface"
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${active ? "text-gold" : "text-muted-foreground"}`} />
                      <span className="text-xs font-semibold">{name}</span>
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* "Starting in…" only for live contexts (Street/Airport). Hotel has its own schedule. */}
            {(ctx === "Street" || ctx === "Airport") && (
              <Section step="3" title="Starting in…">
                <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-1 px-1">
                  {["Now", "+5 min", "+10 min", "+15 min", "+30 min", "+1 h"].map((t) => {
                    const a = when === t;
                    return (
                      <button
                        key={t}
                        onClick={() => setWhen(t)}
                        className={`shrink-0 rounded-2xl px-4 py-3 text-sm font-semibold border transition-all ${
                          a
                            ? "gold-gradient text-gold-foreground border-transparent shadow-glow-gold"
                            : "bg-surface border-border text-muted-foreground"
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </Section>
            )}

            <Section step="4" title="How many of us are already here?">
              <div className="flex items-center justify-between rounded-2xl border border-border bg-surface p-3">
                <button
                  onClick={() => setPresent(Math.max(1, present - 1))}
                  className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center active:scale-95"
                  aria-label="Less"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="text-center">
                  <div className="font-display text-3xl leading-none">{present}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">already here</div>
                </div>
                <button
                  onClick={() => setPresent(present + 1)}
                  className="h-10 w-10 rounded-xl gold-gradient text-gold-foreground flex items-center justify-center active:scale-95"
                  aria-label="More"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                You + anyone already with you. A minyan needs 10, but you can still join a full one.
              </p>
            </Section>

            <Section step="5" title="Nusach">
              <div className="flex gap-2 flex-wrap">
                {["Any", "Ashkenaz", "Sephard", "Nusach Ari", "Edot Mizrach"].map((n) => {
                  const a = nusach === n;
                  return (
                    <button
                      key={n}
                      onClick={() => setNusach(n)}
                      className={`rounded-full px-3.5 py-2 text-xs font-medium border ${
                        a ? "bg-foreground text-background border-foreground" : "bg-surface border-border"
                      }`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </Section>
          </>
        )}

        <Section step={ctx === "Travel" ? "2" : "6"} title={ctx === "Travel" ? "Comment (optional)" : "Comment (optional)"}>
          <textarea
            rows={ctx === "Travel" ? 3 : 2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={ctx === "Travel" ? "Where you'll stay, your shul preference, kosher tips…" : "Kaddish · Yahrzeit · bring tefillin…"}
            className="w-full rounded-2xl border border-border bg-surface p-3 text-sm outline-none focus:border-gold"
          />
          {ctx !== "Travel" && <p className="text-[10px] text-muted-foreground mt-1">Visible to everyone notified.</p>}
        </Section>

        {/* Preview */}
        {ctx !== "Travel" && <div className="rounded-2xl bg-navy/[0.04] border border-border p-4 space-y-2">
          <div className="flex items-start gap-3">
            <Users className="h-4 w-4 text-gold mt-0.5 shrink-0" />
            <div className="text-xs leading-snug">
              {ctx === "Street" || ctx === "Airport" ? (
                <><strong className="text-foreground">~38 people</strong> within 1 km will be notified now.</>
              ) : (
                <><strong className="text-foreground">Scheduled minyan</strong> — travelers heading there will see it in advance.</>
              )}
            </div>
          </div>
          <div className="border-t border-border pt-2 text-[11px] text-muted-foreground space-y-1">
            <div><span className="font-semibold text-foreground">{prayer}</span> · {when} · {present} here · {present >= 10 ? "minyan ready — join us too" : `${Math.max(0, 10 - present)} missing`}</div>
            <div className="flex items-start gap-1"><MapPin className="h-3 w-3 mt-0.5 shrink-0" /><span className="truncate">{locationSummary}</span></div>
            {ctx === "Hotel" && (scheduledDate || scheduledTime) && (
              <div>Scheduled: <span className="text-foreground">{[scheduledDate, scheduledTime].filter(Boolean).join(" · ")}</span></div>
            )}
            <div>Nusach: <span className="text-foreground">{nusach}</span></div>
            {comment && <div className="italic">"{comment}"</div>}
          </div>
        </div>}
      </div>

      <div className="sticky bottom-24 px-6 pb-2">
        <button
          onClick={publish}
          disabled={publishing}
          className="flex items-center justify-center gap-2 w-full gold-gradient text-gold-foreground font-semibold py-5 rounded-2xl shadow-glow-gold text-base disabled:opacity-60"
        >
          {publishing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Users className="h-5 w-5" />}
          {ctx === "Travel" ? "Create" : "Publish minyan"}
        </button>
        {ctx !== "Travel" && <p className="text-center text-[11px] text-muted-foreground mt-2">
          {ctx === "Street" || ctx === "Airport"
            ? position
              ? "Your GPS position will be shared with this minyan only."
              : "Tap to allow location — needed to publish a street/airport minyan."
            : "Travelers will see it in advance."}
        </p>}
      </div>
    </MobileFrame>
  );

  async function publish() {
    if (!user) {
      toast.error("Please sign in first.");
      navigate({ to: "/auth" });
      return;
    }

    // ===== TRAVEL: register a city presence (not a minyan) =====
    if (ctx === "Travel") {
      const cityLabel = getTravelCityLabel(tripPick, tripCity);
      if (!cityLabel || !tripDateStart || !tripDateEnd) {
        toast.error("Pick a city and your travel dates.");
        return;
      }
      if (tripDateEnd < tripDateStart) {
        toast.error("Pick valid dates.");
        return;
      }
      setPublishing(true);
      try {
        const cityKey = cityLabel.trim().toLowerCase();
        const { error } = await supabase.from("travel_presence").insert({
          user_id: user.id,
          city_key: cityKey,
          city_label: cityLabel,
          address: tripPick?.address ?? tripCity,
          latitude: tripPick?.lat ?? null,
          longitude: tripPick?.lng ?? null,
          date_start: tripDateStart,
          date_end: tripDateEnd,
          note: comment || null,
        });
        if (error) throw error;

        void import("@/lib/analytics").then(({ track }) => track("create_minyan", { type: "travel" }));
        toast.success(`Created in ${cityLabel}`);
        navigate({ to: "/travel-city/$cityKey", params: { cityKey } });
      } catch (e) {
        toast.error("Could not register", { description: (e as Error).message });
      } finally {
        setPublishing(false);
      }
      return;
    }

    const liveCtx = ctx === "Street" || ctx === "Airport";
    if (liveCtx && !position) {
      requestGeo();
      toast.error("We need your location for a live minyan.");
      return;
    }
    setPublishing(true);
    try {
      // Resolve coords
      let lat: number;
      let lng: number;
      if (liveCtx && position) {
        lat = position.lat;
        lng = position.lng;
      } else if (ctx === "Hotel" && hotelPick?.lat != null && hotelPick?.lng != null) {
        lat = hotelPick.lat;
        lng = hotelPick.lng;
      } else {
        lat = position?.lat ?? 0;
        lng = position?.lng ?? 0;
      }

      let scheduled_at: string | null = null;
      const now = Date.now();
      if (liveCtx && when !== "Now") {
        const offsetMin =
          when === "+1 h" ? 60 :
          when.startsWith("+") ? parseInt(when.replace(/\D/g, "") || "0", 10) : 0;
        if (offsetMin > 0) {
          scheduled_at = new Date(now + offsetMin * 60 * 1000).toISOString();
        }
      } else if (ctx === "Hotel" && scheduledDate && scheduledTime) {
        scheduled_at = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
      }

      if (liveCtx) {
        const startIso = scheduled_at ?? new Date(now).toISOString();
        const { data: nearbyCount, error: rpcErr } = await supabase.rpc("count_minyanim_within", {
          lat,
          lng,
          radius_m: 200,
          _start: startIso,
        });
        if (rpcErr) throw rpcErr;
        if ((nearbyCount ?? 0) > 0) {
          toast.error("Another minyan starts within 30 min nearby", {
            description: "Pick a start time at least 30 min apart, or join the existing one.",
          });
          setPublishing(false);
          return;
        }
      }

      let expires_at: string;
      if (liveCtx) {
        const startMs = scheduled_at ? new Date(scheduled_at).getTime() : now;
        expires_at = new Date(startMs + 2 * 60 * 60 * 1000).toISOString();
      } else if (scheduled_at) {
        expires_at = new Date(new Date(scheduled_at).getTime() + 4 * 60 * 60 * 1000).toISOString();
      } else {
        expires_at = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
      }

      const prayerMap: Record<string, "shacharit" | "mincha" | "maariv"> = {
        Shacharit: "shacharit",
        Mincha: "mincha",
        Maariv: "maariv",
      };

      const { data: created, error } = await supabase
        .from("minyanim")
        .insert({
          creator_id: user.id,
          type: ctx.toLowerCase() as "street" | "airport" | "hotel",
          prayer: prayerMap[prayer] ?? "mincha",
          nusach,
          message: comment || null,
          address: locationSummary,
          latitude: lat,
          longitude: lng,
          is_live: liveCtx,
          scheduled_at,
          present_count: present,
          extra_present: Math.max(0, present - 1),
          expires_at,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from("minyan_participants")
        .insert({ minyan_id: created.id, user_id: user.id });

      void import("@/lib/analytics").then(({ track }) => track("create_minyan", { type: ctx.toLowerCase(), prayer: prayer.toLowerCase(), scheduled: Boolean(scheduled_at) }));
      toast.success("Minyan published!");
      navigate({ to: "/success", search: { id: created.id } });
    } catch (e) {
      toast.error("Could not publish", { description: (e as Error).message });
    } finally {
      setPublishing(false);
    }
  }
}


function getTravelCityLabel(pick: AddressPick | null, raw: string) {
  return (pick?.city || raw.split(",")[0] || "").trim();
}


function Section({ step, title, children }: { step: string; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="h-5 w-5 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center">{step}</span>
        <h3 className="font-display text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}
