import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MobileFrame } from "@/components/MobileFrame";
import { GoogleMapCanvas } from "@/components/GoogleMap";
import { LiveBadge, StatusPill } from "@/components/ui-bits";
import { Search, Locate, Filter, Navigation, Plus, Sunrise, Sun, Moon } from "lucide-react";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useNearbyMinyanim, type MinyanRow } from "@/hooks/use-minyanim";
import { openDirections } from "@/lib/directions";

export const Route = createFileRoute("/map")({
  component: LiveMap,
});

const FALLBACK = { lat: 40.7588, lng: -73.9857 }; // Midtown NYC

function LiveMap() {
  const navigate = useNavigate();
  const { position, request } = useGeolocation(true);
  const { data: minyanim } = useNearbyMinyanim(position, 5000);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("All");

  const center = position ?? FALLBACK;
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return minyanim.filter((m) => {
      if (filter !== "All" && m.prayer.toLowerCase() !== filter.toLowerCase()) return false;
      if (term && !(m.address ?? "").toLowerCase().includes(term)) return false;
      return true;
    });
  }, [minyanim, filter, search]);

  const selected = filtered.find((m) => m.id === selectedId) ?? null;

  return (
    <MobileFrame bg="map">
      <div className="px-4 pt-2">
        <div className="bg-surface/95 backdrop-blur rounded-2xl shadow-lift border border-border p-2 flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search city, synagogue, or address"
            className="bg-transparent text-sm flex-1 outline-none placeholder:text-muted-foreground"
          />
          <button className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center">
            <Filter className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto hide-scrollbar">
          {["All", "Shacharit", "Mincha", "Maariv"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium border ${
                filter === f ? "bg-foreground text-background border-foreground" : "bg-surface/90 border-border"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="relative flex-1 mt-3">
        <GoogleMapCanvas
          className="absolute inset-0"
          center={center}
          user={position}
          pins={filtered.map((m) => ({
            id: m.id,
            lat: m.latitude,
            lng: m.longitude,
            label: String(m.present_count ?? 1),
            tone: (m.present_count ?? 1) >= 10 ? "success" : (m.present_count ?? 1) >= 9 ? "urgent" : "gold",
            onClick: () => setSelectedId(m.id),
          }))}
        />

        <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
          <button
            onClick={request}
            className="h-10 w-10 rounded-xl bg-surface/95 border border-border shadow-soft flex items-center justify-center"
            aria-label="Recenter on me"
          >
            <Locate className="h-4 w-4 text-sky" />
          </button>
        </div>

        <div className="absolute top-3 left-3 z-10">
          <LiveBadge>{filtered.length} LIVE</LiveBadge>
        </div>

        <div className="absolute left-0 right-0 bottom-0 bg-surface rounded-t-3xl border-t border-border shadow-lift px-5 pt-3 pb-6 z-10">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-muted mb-3" />
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-display text-xl leading-tight">{selected ? "Selected minyan" : "Live near you"}</h2>
              <p className="text-xs text-muted-foreground">
                {selected ? selected.address ?? "Unknown spot" : `${filtered.length} minyanim`}
              </p>
            </div>
            <StatusPill tone="gold">{filtered.filter((m) => (m.present_count ?? 1) < 10).length} forming</StatusPill>
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto hide-scrollbar">
            {(selected ? [selected] : filtered).slice(0, 6).map((m) => (
              <MapCard key={m.id} m={m} active={selectedId === m.id} onSelect={() => setSelectedId(m.id)} />
            ))}
            {filtered.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-4">
                No minyanim around — be the first.
              </div>
            )}
            <button
              onClick={() => navigate({ to: "/create", search: { ctx: "Street" } })}
              className="w-full text-center text-sm font-semibold text-gold py-2 flex items-center justify-center gap-1"
            >
              <Plus className="h-4 w-4" /> Don't see one? Start a minyan here
            </button>
          </div>
        </div>
      </div>
    </MobileFrame>
  );
}

function MapCard({ m, active, onSelect }: { m: MinyanRow; active: boolean; onSelect: () => void }) {
  const Icon = m.prayer === "shacharit" ? Sunrise : m.prayer === "mincha" ? Sun : Moon;
  return (
    <div
      onClick={onSelect}
      className={`rounded-2xl border p-3 flex items-center gap-3 cursor-pointer transition ${
        active ? "border-gold bg-gold/5" : "border-border bg-surface"
      }`}
    >
      <div className="h-10 w-10 rounded-xl bg-gold/10 text-gold flex items-center justify-center">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">{m.address ?? "Unknown spot"}</div>
        <div className="text-[11px] text-muted-foreground">
          {m.prayer} · {m.present_count}/10 · {m.type}
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          openDirections(m.latitude, m.longitude, m.address ?? undefined);
        }}
        className="h-9 px-3 rounded-xl gold-gradient text-gold-foreground text-xs font-semibold flex items-center gap-1"
      >
        <Navigation className="h-3.5 w-3.5" /> Go
      </button>
    </div>
  );
}
