"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export type RoutePoint = { lat: number; lng: number; label: string; main: boolean; number?: number };

/** OpenStreetMap with numbered stops joined in order. Leaflet loads only in the browser. */
export function RouteMap({ points }: { points: RoutePoint[] }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: import("leaflet").Map | undefined;
    let cancelled = false;

    void import("leaflet").then((L) => {
      if (cancelled || !container.current) return;
      map = L.map(container.current, { scrollWheelZoom: false, attributionControl: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const latLngs = points.map((p) => L.latLng(p.lat, p.lng));
      // Straight lines between stops — the real road route may differ
      L.polyline(latLngs, { color: "#0126a0", weight: 3, opacity: 0.7, dashArray: "6 6" }).addTo(map);

      for (const point of points) {
        const html = point.main
          ? `<span style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;background:#0126a0;color:#fff;font:600 12px/1 sans-serif;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)">${point.number ?? ""}</span>`
          : `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:#fff;border:3px solid #0126a0;box-shadow:0 1px 3px rgba(0,0,0,.3)"></span>`;
        const size = point.main ? 28 : 14;
        L.marker([point.lat, point.lng], {
          icon: L.divIcon({ html, className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2] }),
          title: point.label,
          keyboard: false,
        })
          .bindTooltip(point.label)
          .addTo(map);
      }

      if (latLngs.length === 1) map.setView(latLngs[0], 12);
      else map.fitBounds(L.latLngBounds(latLngs), { padding: [28, 28] });
    });

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [points]);

  return <div ref={container} className="h-full min-h-72 w-full overflow-hidden rounded-2xl bg-border ring-1 ring-border" aria-label="Route map" role="img" />;
}
