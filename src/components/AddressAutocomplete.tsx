import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";
import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY as
  string | undefined;

export type AddressPick = {
  address: string;
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  placeId: string;
};

type Props = {
  value: string;
  onChange: (v: string) => void;
  onPick: (pick: AddressPick) => void;
  placeholder?: string;
  /** Bias suggestions to cities only (for "Abroad" destination). */
  citiesOnly?: boolean;
  className?: string;
};

export function AddressAutocomplete(props: Props) {
  if (!API_KEY) {
    return (
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        className={
          props.className ??
          "w-full rounded-2xl border border-border bg-surface p-3 text-sm outline-none focus:border-gold"
        }
      />
    );
  }
  return (
    <APIProvider apiKey={API_KEY}>
      <Inner {...props} />
    </APIProvider>
  );
}

function Inner({ value, onChange, onPick, placeholder, citiesOnly, className }: Props) {
  const placesLib = useMapsLibrary("places") as any;
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const sessionTokenRef = useRef<any>(null);
  const debounceRef = useRef<number | null>(null);

  const lastQueryRef = useRef<string>("");

  useEffect(() => {
    if (!placesLib) return;
    if (!sessionTokenRef.current)
      sessionTokenRef.current = new placesLib.AutocompleteSessionToken();

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const q = value.trim();
    if (!q || q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      lastQueryRef.current = q;
      try {
        const { suggestions } = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions(
          {
            input: q,
            sessionToken: sessionTokenRef.current!,
            includedPrimaryTypes: citiesOnly
              ? ["locality", "administrative_area_level_3"]
              : undefined,
          },
        );
        if (lastQueryRef.current === q) {
          setSuggestions(suggestions);
          setOpen(true);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [value, placesLib, citiesOnly]);

  async function handlePick(s: any) {
    if (!s.placePrediction) return;
    const place = s.placePrediction.toPlace();
    await place.fetchFields({
      fields: ["formattedAddress", "location", "addressComponents", "displayName"],
    });
    const addr = place.formattedAddress ?? place.displayName ?? s.placePrediction.text?.text ?? "";
    const comps: any[] = place.addressComponents ?? [];
    const city =
      comps.find((c: any) => c.types.includes("locality"))?.longText ??
      comps.find((c: any) => c.types.includes("postal_town"))?.longText ??
      comps.find((c: any) => c.types.includes("administrative_area_level_2"))?.longText ??
      null;
    const country = comps.find((c: any) => c.types.includes("country"))?.longText ?? null;

    onChange(addr);
    onPick({
      address: addr,
      city,
      country,
      lat: place.location?.lat() ?? null,
      lng: place.location?.lng() ?? null,
      placeId: place.id ?? "",
    });
    setOpen(false);
    sessionTokenRef.current = new placesLib!.AutocompleteSessionToken();
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className={
            className ??
            "w-full rounded-2xl border border-border bg-surface p-3 pr-9 text-sm outline-none focus:border-gold"
          }
        />
        {loading && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
        )}
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 rounded-2xl border border-border bg-background shadow-soft overflow-hidden max-h-64 overflow-y-auto">
          {suggestions.map((s, i) => {
            const main = s.placePrediction?.mainText?.text ?? s.placePrediction?.text?.text ?? "";
            const sec = s.placePrediction?.secondaryText?.text ?? "";
            return (
              <button
                type="button"
                key={i}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handlePick(s);
                }}
                className="w-full flex items-start gap-2 px-3 py-2.5 text-left hover:bg-muted/60 border-b border-border last:border-b-0"
              >
                <MapPin className="h-4 w-4 text-gold mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{main}</div>
                  {sec && <div className="text-[11px] text-muted-foreground truncate">{sec}</div>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
