import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MobileFrame } from "@/components/MobileFrame";
import { GoogleMapCanvas } from "@/components/GoogleMap";
import { LiveBadge, StatusPill, EmptyState } from "@/components/ui-bits";
import {
  Search,
  Locate,
  Filter,
  Navigation,
  Plus,
  Sunrise,
  Sun,
  Moon,
  X,
  ChevronUp,
  MapPin,
} from "lucide-react";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useNearbyMinyanim, type MinyanRow } from "@/hooks/use-minyanim";
import { openDirections } from "@/lib/directions";
import { guardLegacyScreen } from "@/lib/legacy-route";

export const Route = createFileRoute("/map")({
  beforeLoad: guardLegacyScreen,
  validateSearch: (s: Record<string, unknown>) => ({
    id: typeof s.id === "string" ? s.id : undefined,
  }),
  component: LiveMap,
});

const FALLBACK = { lat: 40.7588, lng: -73.9857 };

// Sheet states: hidden (just handle), collapsed (peek ~120px), expanded (~70vh).
type SheetState = "hidden" | "collapsed" | "expanded";

function LiveMap() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: focusId } = Route.useSearch();
  const { position, request } = useGeolocation(true);
  const { data: minyanim, error: minyanError } = useNearbyMinyanim(position, 5000);
  const [selectedId, setSelectedId] = useState<string | null>(focusId ?? null);
  useEffect(() => {
    if (focusId) {
      setSelectedId(focusId);
      setSheet("expanded");
    }
  }, [focusId]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("All");
  const [sheet, setSheet] = useState<SheetState>("collapsed");

  // Drag-to-resize
  const dragStartY = useRef<number | null>(null);
  const dragStartState = useRef<SheetState>("collapsed");
  function onDragStart(e: React.PointerEvent) {
    dragStartY.current = e.clientY;
    dragStartState.current = sheet;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onDragEnd(e: React.PointerEvent) {
    if (dragStartY.current == null) return;
    const dy = e.clientY - dragStartY.current;
    dragStartY.current = null;
    if (dy < -40) setSheet(dragStartState.current === "hidden" ? "collapsed" : "expanded");
    else if (dy > 40) setSheet(dragStartState.current === "expanded" ? "collapsed" : "hidden");
  }

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

  function handlePinSelect(id: string) {
    setSelectedId(id);
    setSheet("expanded");
  }
  function handleMapBackgroundTap() {
    if (selectedId) setSelectedId(null);
    setSheet((s) => (s === "expanded" ? "collapsed" : s));
  }

  const sheetHeight = sheet === "expanded" ? "70%" : sheet === "collapsed" ? "180px" : "44px";

  return (
    <MobileFrame bg="map">
      <div className="px-4 pt-2">
        <div className="bg-surface/95 backdrop-blur rounded-2xl shadow-card border border-border p-2 flex items-center gap-2 transition-colors focus-within:border-gold">
          <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("map.searchPh")}
            className="bg-transparent text-sm flex-1 min-w-0 outline-none placeholder:text-muted-foreground"
          />
          <button className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <Filter className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto hide-scrollbar">
          {(
            [
              { id: "All", label: t("map.filters.all") },
              { id: "Shacharit", label: t("prayer.shacharit") },
              { id: "Mincha", label: t("prayer.mincha") },
              { id: "Maariv", label: t("prayer.maariv") },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors ${
                filter === f.id
                  ? "bg-foreground text-background border-foreground"
                  : "bg-surface/90 border-border hover:border-gold/50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative flex-1 mt-3 min-h-[300px]">
        {/* Transparent overlay catches taps on the empty map area to collapse the sheet.
            Pin markers sit above this overlay because the Google Maps canvas renders
            its own DOM and we listen on the underlying container click. */}
        <div className="absolute inset-0" onClick={handleMapBackgroundTap}>
          <GoogleMapCanvas
            className="absolute inset-0"
            center={center}
            user={position}
            pins={filtered.map((m) => ({
              id: m.id,
              lat: m.latitude,
              lng: m.longitude,
              label: String(m.present_count ?? 1),
              tone:
                (m.present_count ?? 1) >= 10
                  ? "success"
                  : (m.present_count ?? 1) >= 9
                    ? "urgent"
                    : "gold",
              onClick: () => handlePinSelect(m.id),
            }))}
          />
        </div>

        {minyanError && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 rounded-full bg-urgent/90 text-white text-[11px] px-3 py-1 shadow-soft">
            {t("map.connectionIssue")}
          </div>
        )}

        <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              request();
            }}
            className="h-10 w-10 rounded-xl bg-surface/90 backdrop-blur border border-border shadow-card flex items-center justify-center transition-transform active:scale-[0.97]"
            aria-label={t("map.recenter")}
          >
            <Locate className="h-4 w-4 text-sky" />
          </button>
        </div>

        <div className="absolute top-3 left-3 z-10">
          {filtered.length > 0 ? (
            <LiveBadge>
              {filtered.length} {t("common.live")}
            </LiveBadge>
          ) : (
            <span className="inline-flex items-center rounded-full bg-surface/90 backdrop-blur px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground shadow-card border border-border">
              {t("map.noneAround")}
            </span>
          )}
        </div>

        {/* Bottom sheet — draggable, collapsible, fully dismissible. */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ height: sheetHeight }}
          className="absolute left-0 right-0 bottom-0 bg-surface rounded-t-3xl border-t border-border shadow-lift z-10 transition-[height] duration-300 ease-out flex flex-col overflow-hidden"
        >
          {/* Drag handle row */}
          <div
            onPointerDown={onDragStart}
            onPointerUp={onDragEnd}
            onPointerCancel={onDragEnd}
            className="pt-2 pb-1 px-5 cursor-grab active:cursor-grabbing select-none touch-none flex items-center justify-between"
          >
            <div className="flex-1 flex justify-center">
              <button
                onClick={() =>
                  setSheet(
                    sheet === "expanded"
                      ? "collapsed"
                      : sheet === "collapsed"
                        ? "expanded"
                        : "collapsed",
                  )
                }
                aria-label="Toggle sheet"
                className="h-1.5 w-12 rounded-full bg-muted"
              />
            </div>
            <button
              onClick={() => setSheet(sheet === "hidden" ? "collapsed" : "hidden")}
              aria-label={sheet === "hidden" ? "Open list" : "Hide list"}
              className="absolute right-4 top-2 h-7 w-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center"
            >
              {sheet === "hidden" ? <ChevronUp className="h-4 w-4" /> : <X className="h-4 w-4" />}
            </button>
          </div>

          {sheet !== "hidden" && (
            <div className="px-5 pb-5 flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-3 gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold text-lg leading-tight truncate">
                    {selected ? t("map.selected") : t("map.liveNear")}
                  </h2>
                  <p className="text-xs text-muted-foreground truncate">
                    {selected
                      ? (selected.address ?? t("map.unknownSpot"))
                      : t("map.minyanimCount", { count: filtered.length })}
                  </p>
                </div>
                {(() => {
                  const forming = filtered.filter((m) => (m.present_count ?? 1) < 10).length;
                  return (
                    <StatusPill tone={forming > 0 ? "gold" : "default"}>
                      {t("map.forming", { count: forming })}
                    </StatusPill>
                  );
                })()}
              </div>
              <div className="space-y-2 flex-1 overflow-y-auto hide-scrollbar">
                {(selected ? [selected] : filtered)
                  .slice(0, sheet === "expanded" ? 20 : 2)
                  .map((m) => (
                    <MapCard
                      key={m.id}
                      m={m}
                      active={selectedId === m.id}
                      onSelect={() => handlePinSelect(m.id)}
                    />
                  ))}
                {filtered.length === 0 && (
                  <EmptyState icon={MapPin} title={t("map.noNearby")} />
                )}
                <button
                  onClick={() => navigate({ to: "/create" })}
                  className="w-full text-center text-sm font-semibold text-gold py-2 flex items-center justify-center gap-1"
                >
                  <Plus className="h-4 w-4" /> {t("map.startHere")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </MobileFrame>
  );
}

function MapCard({ m, active, onSelect }: { m: MinyanRow; active: boolean; onSelect: () => void }) {
  const { t } = useTranslation();
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
        <div className="text-sm font-semibold truncate">
          {m.address ?? t("map.unknownSpot")}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {t(`prayer.${m.prayer}`, { defaultValue: m.prayer })} · {m.present_count}/10 · {m.type}
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          openDirections(m.latitude, m.longitude, m.address ?? undefined);
        }}
        className="h-9 px-3 rounded-xl gold-gradient text-gold-foreground text-xs font-semibold flex items-center gap-1"
      >
        <Navigation className="h-3.5 w-3.5" /> {t("common.go")}
      </button>
    </div>
  );
}
