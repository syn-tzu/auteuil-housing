"use client";
import { useEffect, useRef } from "react";
import type { ZoomPanOptions } from "leaflet";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import type { Lang, ListingRow } from "@/lib/types";
import { formatPrice } from "@/lib/i18n";

type Props = {
  listings: ListingRow[];
  lang: Lang;
  userId: string;
  selected: string | null;
  onSelect: (id: string) => void;
  /** Changes when the phone layout toggles List/Map so the map re-measures itself. */
  visibleKey: string;
};

const CENTRE: [number, number] = [48.853, 2.266]; // between Auteuil and La Muette

/**
 * Leaflet measures its container once. Re-measure after mount, whenever the pane changes size,
 * and whenever the phone layout switches between List and Map (the map is display:none in List mode).
 */
function FitContainer({ visibleKey }: { visibleKey: string }) {
  const map = useMap();
  const wasEmpty = useRef(true);
  useEffect(() => {
    const el = map.getContainer();
    const fix = () => {
      const size = map.getSize();
      if (size.x === 0 || size.y === 0) {
        wasEmpty.current = true; // hidden (display:none); nothing to measure yet
        return;
      }
      map.invalidateSize({ pan: false });
      if (wasEmpty.current) {
        // First time the map has a real size: Leaflet computed marker positions against a 0×0 view,
        // so force a full view reset to re-project everything and restore the intended centre.
        wasEmpty.current = false;
        // `reset` is a real Leaflet option (forces a viewreset) that the type definitions omit.
        map.setView(CENTRE, map.getZoom(), { animate: false, reset: true } as ZoomPanOptions);
      }
    };
    const t1 = setTimeout(fix, 50);
    const t2 = setTimeout(fix, 400);
    const ro = new ResizeObserver(fix);
    ro.observe(el);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      ro.disconnect();
    };
  }, [map, visibleKey]);
  return null;
}

function FlyTo({ listing }: { listing: ListingRow | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (listing?.lat != null && listing?.lng != null) map.flyTo([listing.lat, listing.lng], Math.max(map.getZoom(), 15), { duration: 0.6 });
  }, [listing, map]);
  return null;
}

export default function MapView({ listings, lang, userId, selected, onSelect, visibleKey }: Props) {
  const sel = listings.find((l) => l.id === selected);
  return (
    <MapContainer center={CENTRE} zoom={14} className="map" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitContainer visibleKey={visibleKey} />
      <FlyTo listing={sel} />
      {listings.map((l) => {
        if (l.lat == null || l.lng == null) return null;
        const mine = l.interactions.find((i) => i.user_id === userId && (i.action === "favorite" || i.action === "reject"))?.action;
        const anyFav = l.interactions.some((i) => i.action === "favorite");
        const color = mine === "reject" ? "#999" : anyFav ? "#c9962b" : l.transaction_type === "rent" ? "#2e7d4f" : "#1f3a5f";
        const title = (lang === "fr" ? l.title_fr : l.title_en) ?? l.title_fr ?? "";
        return (
          <CircleMarker
            key={l.id}
            center={[l.lat, l.lng]}
            radius={selected === l.id ? 11 : 7}
            pathOptions={{ color: "#fff", weight: 1.5, fillColor: color, fillOpacity: l.geocode_precise ? 0.95 : 0.6 }}
            eventHandlers={{ click: () => onSelect(l.id) }}
          >
            <Popup>
              <b>{formatPrice(lang, l.price_eur, l.transaction_type)}</b>
              <br />
              {title}
              {l.surface_sqm ? <><br />{l.surface_sqm} m²</> : null}
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
