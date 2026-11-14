// Client MOTIS (https://github.com/motis-project/motis, licence MIT)
// Un seul serveur auto-hébergé pour : recherche d'adresse, géocodage inverse,
// itinéraires voiture / transports / park & ride.
// Doc API : http://localhost:8080/api (OpenAPI) une fois le serveur lancé.

import { decodePolyline } from '../lib/polyline'
import * as demo from './demo'

const BASE = (import.meta.env.VITE_MOTIS_URL || 'http://localhost:8080').replace(/\/$/, '')
export const DEMO = import.meta.env.VITE_DEMO === '1'

async function get(path, params) {
  const url = `${BASE}${path}?${new URLSearchParams(params)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`MOTIS ${res.status} sur ${path}`)
  return res.json()
}

// ---------- Géocodage ----------

function toPlace(m) {
  const area = (m.areas || []).find((a) => a.adminLevel === 8 || a.default)?.name
    || m.areas?.[0]?.name || ''
  const street = [m.houseNumber, m.street].filter(Boolean).join(' ')
  const label = [m.name, street && street !== m.name ? street : null, m.zip, area]
    .filter(Boolean).join(', ')
  return { id: m.id || `${m.lat},${m.lon}`, name: m.name, label, lat: m.lat, lon: m.lon, type: m.type }
}

export async function searchPlaces(text, { limit = 6 } = {}) {
  if (!text || text.trim().length < 2) return []
  if (DEMO) return demo.searchPlaces(text)
  const data = await get('/api/v1/geocode', { text, language: 'fr' })
  return data.slice(0, limit).map(toPlace)
}

export async function reverseGeocode(lat, lon) {
  if (DEMO) return demo.reverseGeocode(lat, lon)
  const data = await get('/api/v1/reverse-geocode', { place: `${lat},${lon}` })
  if (!data.length) return { id: `${lat},${lon}`, name: 'Point', label: `${lat.toFixed(5)}, ${lon.toFixed(5)}`, lat, lon }
  return { ...toPlace(data[0]), lat, lon }
}

// ---------- Itinéraires ----------

// Modes de transport renvoyés par MOTIS, regroupés pour l'affichage
export const STREET_MODES = new Set(['WALK', 'BIKE', 'CAR', 'CAR_PARKING', 'RENTAL', 'ODM', 'FLEX'])

export function modeInfo(mode) {
  const m = {
    WALK: { icon: '🚶', label: 'Marche', color: '#5f6368' },
    BIKE: { icon: '🚴', label: 'Vélo', color: '#0b8043' },
    CAR: { icon: '🚗', label: 'Voiture', color: '#1a73e8' },
    CAR_PARKING: { icon: '🅿️', label: 'Voiture → parking', color: '#1a73e8' },
    RAIL: { icon: '🚆', label: 'Train', color: '#7b1fa2' },
    HIGHSPEED_RAIL: { icon: '🚄', label: 'TGV', color: '#7b1fa2' },
    LONG_DISTANCE: { icon: '🚆', label: 'Train', color: '#7b1fa2' },
    REGIONAL_RAIL: { icon: '🚆', label: 'TER', color: '#7b1fa2' },
    REGIONAL_FAST_RAIL: { icon: '🚆', label: 'RER', color: '#7b1fa2' },
    SUBURBAN: { icon: '🚆', label: 'Transilien', color: '#7b1fa2' },
    METRO: { icon: '🚇', label: 'Métro', color: '#e37400' },
    SUBWAY: { icon: '🚇', label: 'Métro', color: '#e37400' },
    TRAM: { icon: '🚊', label: 'Tram', color: '#00897b' },
    BUS: { icon: '🚌', label: 'Bus', color: '#c62828' },
    COACH: { icon: '🚌', label: 'Car', color: '#c62828' },
    FERRY: { icon: '⛴️', label: 'Ferry', color: '#0277bd' },
  }
  return m[mode] || { icon: '🚏', label: mode, color: '#444' }
}

function toLeg(l) {
  return {
    mode: l.mode,
    isTransit: !STREET_MODES.has(l.mode),
    from: { name: l.from?.name, lat: l.from?.lat, lon: l.from?.lon },
    to: { name: l.to?.name, lat: l.to?.lat, lon: l.to?.lon },
    start: l.startTime,
    end: l.endTime,
    duration: l.duration,                         // secondes
    distance: l.distance ?? estimateDistance(l),  // mètres
    line: l.routeShortName || l.routeLongName || null,
    headsign: l.headsign || null,
    agency: l.agencyName || null,
    color: l.routeColor ? `#${l.routeColor}` : modeInfo(l.mode).color,
    coords: l.legGeometry?.points ? decodePolyline(l.legGeometry.points, l.legGeometry.precision ?? 7) : [],
  }
}

// MOTIS ne donne pas toujours la distance des étapes en transports : on la
// déduit du tracé.
function estimateDistance(l) {
  const pts = l.legGeometry?.points ? decodePolyline(l.legGeometry.points, l.legGeometry.precision ?? 7) : []
  let d = 0
  for (let i = 1; i < pts.length; i++) d += haversine(pts[i - 1], pts[i])
  return d
}

export function haversine([lat1, lon1], [lat2, lon2]) {
  const R = 6371000, r = Math.PI / 180
  const dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

function toItinerary(it, kind) {
  const legs = it.legs.map(toLeg)
  return {
    kind,                                   // 'car' | 'parkride' | 'transit'
    duration: it.duration,                  // secondes
    start: it.startTime,
    end: it.endTime,
    transfers: it.transfers ?? 0,
    legs,
    carDistance: legs.filter((l) => l.mode === 'CAR' || l.mode === 'CAR_PARKING').reduce((s, l) => s + l.distance, 0),
    transitDistance: legs.filter((l) => l.isTransit).reduce((s, l) => s + l.distance, 0),
    walkDistance: legs.filter((l) => l.mode === 'WALK').reduce((s, l) => s + l.distance, 0),
    coords: legs.flatMap((l) => l.coords),
  }
}

/**
 * Calcule les trois familles d'itinéraires entre deux points :
 *   - car      : tout voiture
 *   - parkride : voiture jusqu'à un parking proche d'une gare, puis transports
 *   - transit  : transports en commun uniquement (marche pour rejoindre l'arrêt)
 */
export async function planAll(from, to, { time = new Date(), maxCarMinutes = 45 } = {}) {
  if (DEMO) return demo.planAll(from, to)

  const common = {
    fromPlace: `${from.lat},${from.lon}`,
    toPlace: `${to.lat},${to.lon}`,
    time: time.toISOString(),
    numItineraries: 5,
    transitModes: 'TRANSIT',
    postTransitModes: 'WALK',
  }

  const [pr, tr] = await Promise.all([
    get('/api/v1/plan', {
      ...common,
      directModes: 'CAR',
      preTransitModes: 'CAR_PARKING',
      maxPreTransitTime: maxCarMinutes * 60,
    }),
    get('/api/v1/plan', { ...common, directModes: 'WALK', preTransitModes: 'WALK' }),
  ])

  const car = (pr.direct || []).filter((it) => it.legs.some((l) => l.mode === 'CAR')).map((it) => toItinerary(it, 'car'))
  const parkride = (pr.itineraries || [])
    .filter((it) => it.legs.some((l) => l.mode === 'CAR' || l.mode === 'CAR_PARKING'))
    .map((it) => toItinerary(it, 'parkride'))
  const transit = (tr.itineraries || []).map((it) => toItinerary(it, 'transit'))

  return { car, parkride, transit }
}
