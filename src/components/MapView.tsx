"use client";
import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import type { Lang, ListingRow } from "@/lib/types";
import { formatPrice } from "@/lib/i18n";

type Props = {
  listings: ListingRow[];
  lang: Lang;
  userId: string;
  selected: string | null;
  onSelect: (id: string) => void;
};

const CENTRE: [number, number] = [48.853, 2.266]; // between Auteuil and La Muette

function FlyTo({ listing }: { listing: ListingRow | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (listing?.lat != null && listing?.lng != null) map.flyTo([listing.lat, listing.lng], Math.max(map.getZoom(), 15), { duration: 0.6 });
  }, [listing, map]);
  return null;
}

export default function MapView({ listings, lang, userId, selected, onSelect }: Props) {
  const sel = listings.find((l) => l.id === selected);
  return (
    <MapContainer center={CENTRE} zoom={14} className="map" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
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
