import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import { MapPinOff } from "lucide-react";
import { fileUrl } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { formatDateTime, placeLabel } from "@/lib/format";

const pin = (m) => L.divIcon({
  className: "",
  html: `<div class="tg-pin" style="width:44px;height:44px;${m.thumb_url ? `background-image:url('${fileUrl(m.thumb_url)}')` : ""}"></div>`,
  iconSize: [44, 44], iconAnchor: [22, 22],
});

function Fit({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 1) map.setView(points[0], 12);
    else if (points.length > 1) map.fitBounds(points, { padding: [40, 40] });
  }, [map, points]);
  return null;
}

export default function TripMap({ media, onOpen }) {
  const { t, locale } = useI18n();
  const geo = useMemo(() => media.filter((m) => m.lat != null && m.lng != null).sort((a, b) => (a.taken_at || "").localeCompare(b.taken_at || "")), [media]);
  const points = useMemo(() => geo.map((m) => [m.lat, m.lng]), [geo]);

  if (!geo.length) {
    return (
      <div data-testid="interactive-map-view" className="rounded-3xl border border-dashed py-20 text-center text-muted-foreground">
        <MapPinOff className="h-8 w-8 mx-auto" /><p className="mt-3">{t("map_empty")}</p>
      </div>
    );
  }
  return (
    <div data-testid="interactive-map-view" className="h-[65vh] rounded-3xl overflow-hidden border">
      <MapContainer center={points[0]} zoom={5} className="h-full w-full" scrollWheelZoom>
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Polyline positions={points} pathOptions={{ color: "#2563EB", weight: 2, dashArray: "6 6" }} />
        {geo.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={pin(m)}>
            <Popup>
              <div className="w-48" data-testid="map-pin-popup">
                {m.thumb_url && <img src={fileUrl(m.thumb_url)} alt="" className="w-full h-28 object-cover rounded-lg" />}
                <p className="mt-2 text-xs font-semibold">{placeLabel(m)}</p>
                <p className="text-[11px] text-gray-500">{formatDateTime(m.taken_at, locale)} · {m.uploader_name}</p>
                <button className="mt-1 text-xs text-blue-600 underline" onClick={() => onOpen(m.id)}>→</button>
              </div>
            </Popup>
          </Marker>
        ))}
        <Fit points={points} />
      </MapContainer>
    </div>
  );
}
