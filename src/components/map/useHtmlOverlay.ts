/// <reference types="google.maps" />
import { useEffect, useRef } from "react";
import { useMap } from "@vis.gl/react-google-maps";

type HtmlOverlayHandle = google.maps.OverlayView & {
  setPosition(position: google.maps.LatLngLiteral): void;
};

/**
 * Creates an OverlayView only after the Maps JS API is loaded.
 * Must NOT extend google.maps.OverlayView at module scope — google is undefined
 * until APIProvider finishes loading the script.
 */
function createHtmlOverlay(
  position: google.maps.LatLngLiteral,
  div: HTMLDivElement,
): HtmlOverlayHandle {
  class Overlay extends google.maps.OverlayView {
    private pos: google.maps.LatLngLiteral;
    private readonly el: HTMLDivElement;

    constructor(pos: google.maps.LatLngLiteral, el: HTMLDivElement) {
      super();
      this.pos = pos;
      this.el = el;
    }

    onAdd() {
      this.getPanes()?.overlayMouseTarget.appendChild(this.el);
    }

    draw() {
      const proj = this.getProjection();
      if (!proj) return;
      const point = proj.fromLatLngToDivPixel(new google.maps.LatLng(this.pos));
      if (point) {
        this.el.style.left = `${point.x}px`;
        this.el.style.top = `${point.y}px`;
      }
    }

    onRemove() {
      this.el.parentNode?.removeChild(this.el);
    }

    setPosition(pos: google.maps.LatLngLiteral) {
      this.pos = pos;
      this.draw();
    }
  }

  return new Overlay(position, div);
}

/**
 * Attaches a centered, non-interactive HTML overlay to the map at
 * `position`, once the Maps JS API is ready, and keeps it repositioned as
 * `position` changes. Owns only the overlay's lifecycle (creation,
 * attachment, position sync, cleanup) — `mount` is called once with the
 * overlay's wrapper `<div>` (already styled `position:absolute`,
 * centered via `translate(-50%, -50%)`, `pointer-events:none`, and the
 * given `zIndex`) so the caller can fill it with its own content and
 * return an optional teardown for anything it set up.
 */
export function useHtmlOverlay(
  position: { lat: number; lng: number },
  zIndex: number,
  mount: (div: HTMLDivElement) => (() => void) | void,
): void {
  const map = useMap();
  const overlayRef = useRef<HtmlOverlayHandle | null>(null);

  useEffect(() => {
    if (!map || typeof google === "undefined") return;

    const div = document.createElement("div");
    div.style.position = "absolute";
    div.style.transform = "translate(-50%, -50%)";
    div.style.pointerEvents = "none";
    div.style.zIndex = String(zIndex);

    const teardown = mount(div);

    const overlay = createHtmlOverlay(position, div);
    overlay.setMap(map);
    overlayRef.current = overlay;

    return () => {
      overlay.setMap(null);
      overlayRef.current = null;
      teardown?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  useEffect(() => {
    overlayRef.current?.setPosition(position);
  }, [position.lat, position.lng, position]);
}
