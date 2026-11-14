import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl })

const makeIcon = (color) =>
  L.divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
const startIcon = makeIcon('#34a853')
const endIcon = makeIcon('#ea4335')
const parkIcon = L.divIcon({
  className: '',
  html: `<div style="width:22px;height:22px;border-radius:5px;background:#1a73e8;color:#fff;font:bold 13px/22px sans-serif;text-align:center;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)">P</div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

function Controller({ center, itinerary }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.flyTo([center.lat, center.lon], Math.max(map.getZoom(), 14))
  }, [center, map])
  useEffect(() => {
    if (itinerary?.coords?.length) map.fitBounds(L.latLngBounds(itinerary.coords), { padding: [60, 60] })
  }, [itinerary, map])
  return null
}

function ClickHandler({ onClick }) {
  useMapEvents({ click(e) { onClick?.(e.latlng.lat, e.latlng.lng) } })
  return null
}

// Fond de carte : tuiles OSM pour le développement. Pour la production,
// remplacer par tes propres tuiles (Protomaps / MapLibre, voir README).
const TILE_URL = import.meta.env.VITE_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

export default function MapView({ userPos, center, selected, from, to, itinerary, onMapClick }) {
  const initial = userPos ? [userPos.lat, userPos.lon] : [48.8566, 2.3522]

  return (
    <MapContainer center={initial} zoom={12} className="map" zoomControl={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · itinéraires <a href="https://github.com/motis-project/motis">MOTIS</a> · horaires <a href="https://transport.data.gouv.fr">transport.data.gouv.fr</a>'
        url={TILE_URL}
      />
      <Controller center={center} itinerary={itinerary} />
      <ClickHandler onClick={onMapClick} />

      {userPos && (
        <CircleMarker center={[userPos.lat, userPos.lon]} radius={8} pathOptions={{ color: '#fff', fillColor: '#1a73e8', fillOpacity: 1, weight: 3 }}>
          <Popup>Vous êtes ici</Popup>
        </CircleMarker>
      )}

      {selected && !from && !to && (
        <Marker position={[selected.lat, selected.lon]}><Popup>{selected.label}</Popup></Marker>
      )}

      {from && <Marker position={[from.lat, from.lon]} icon={startIcon}><Popup>Départ : {from.label}</Popup></Marker>}
      {to && <Marker position={[to.lat, to.lon]} icon={endIcon}><Popup>Arrivée : {to.label}</Popup></Marker>}

      {itinerary?.legs.map((l, i) =>
        l.coords.length > 1 && (
          <Polyline
            key={i}
            positions={l.coords}
            pathOptions={{
              color: l.color,
              weight: l.isTransit ? 6 : 5,
              opacity: 0.9,
              dashArray: l.mode === 'WALK' ? '2 8' : undefined,
            }}
          />
        )
      )}

      {itinerary?.legs
        .filter((l) => l.mode === 'CAR_PARKING' && l.to?.lat)
        .map((l, i) => (
          <Marker key={`p${i}`} position={[l.to.lat, l.to.lon]} icon={parkIcon}>
            <Popup>Parking relais : {l.to.name || 'gare'}</Popup>
          </Marker>
        ))}
    </MapContainer>
  )
}
