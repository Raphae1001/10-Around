import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MobileFrame } from "@/components/MobileFrame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildDirectionsUrls, openDirections } from "@/lib/directions";
import { shareAny } from "@/lib/share";
import { toast } from "sonner";

export const Route = createFileRoute("/maps-test")({
  head: () => ({ meta: [{ title: "Maps & Share — Diagnostic" }] }),
  component: MapsTest,
});

function MapsTest() {
  const [lat, setLat] = useState("32.1656");
  const [lng, setLng] = useState("34.8434");
  const [label, setLabel] = useState("Herzliya");

  const urls = useMemo(() => {
    const la = parseFloat(lat), ln = parseFloat(lng);
    if (!isFinite(la) || !isFinite(ln)) return null;
    return buildDirectionsUrls(la, ln, label || undefined);
  }, [lat, lng, label]);

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const hasWebShare = typeof navigator !== "undefined" && typeof (navigator as Navigator & { share?: unknown }).share === "function";

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast("Copié", { description: text });
    } catch {
      toast("Copie impossible");
    }
  }

  return (
    <MobileFrame>
      <div className="min-h-screen p-4 space-y-4 overflow-y-auto">
        <h1 className="text-xl font-bold">Maps & Share — Diagnostic</h1>
        <p className="text-xs text-muted-foreground break-all">UA: {ua}</p>
        <p className="text-xs">navigator.share: <b>{hasWebShare ? "oui" : "non"}</b></p>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Lat</Label>
            <Input value={lat} onChange={(e) => setLat(e.target.value)} />
          </div>
          <div>
            <Label>Lng</Label>
            <Input value={lng} onChange={(e) => setLng(e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Label</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
        </div>

        {urls && (
          <div className="space-y-3">
            <h2 className="font-semibold">URLs générées</h2>
            {([
              ["Google Maps (web)", urls.web],
              ["iOS Google Maps app", urls.iosGoogle],
              ["iOS Apple Maps", urls.iosApple],
              ["Android geo:", urls.androidGeo],
            ] as const).map(([name, url]) => (
              <div key={name} className="border rounded p-2 space-y-2 bg-card">
                <div className="text-xs font-medium">{name}</div>
                <div className="text-xs break-all font-mono opacity-80">{url}</div>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" asChild>
                    <a href={url} target="_blank" rel="noopener noreferrer">Ouvrir</a>
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => copy(url)}>Copier</Button>
                </div>
              </div>
            ))}

            <Button
              className="w-full"
              onClick={() => openDirections(parseFloat(lat), parseFloat(lng), label || undefined)}
            >
              Tester openDirections() (auto OS)
            </Button>
          </div>
        )}

        <div className="space-y-2 pt-4 border-t">
          <h2 className="font-semibold">Partage</h2>
          <Button
            className="w-full"
            onClick={() => shareAny({
              title: "Test MinyanNow",
              text: "Minyan test à " + (label || "destination"),
              url: urls?.web,
            })}
          >
            Tester shareAny()
          </Button>
          <p className="text-xs text-muted-foreground">
            Si le partage natif n'est pas disponible, le lien sera copié et affiché dans un toast — jamais api.whatsapp.com.
          </p>
        </div>
      </div>
    </MobileFrame>
  );
}
