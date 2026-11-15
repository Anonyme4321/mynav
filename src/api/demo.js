// Données fictives pour tester l'interface sans serveur MOTIS (VITE_DEMO=1).
//
// Les itinéraires sont *simulés* à partir de vraies gares d'Île-de-France :
// gare la plus proche du départ (parking relais), gare la plus proche de
// l'arrivée, durées déduites des distances. Les tracés sont des courbes
// schématiques, pas des rues. Avec MOTIS, tout cela devient réel.

import { haversine } from '../lib/geo'

// Quelques gares / pôles d'Île-de-France (réseau RER / Transilien / grandes gares)
const STATIONS = [
  { name: 'Gare du Nord', lat: 48.8809, lon: 2.3553, lines: ['RER B', 'RER D'] },
  { name: 'Gare de Lyon', lat: 48.8443, lon: 2.3744, lines: ['RER A', 'RER D'] },
  { name: 'Montparnasse', lat: 48.8412, lon: 2.3206, lines: ['N'] },
  { name: 'Saint-Lazare', lat: 48.8765, lon: 2.3250, lines: ['J', 'L'] },
  { name: 'Châtelet-Les Halles', lat: 48.8619, lon: 2.3470, lines: ['RER A', 'RER B', 'RER D'] },
  { name: 'La Défense', lat: 48.8920, lon: 2.2380, lines: ['RER A', 'L'] },
  { name: 'Massy-Palaiseau', lat: 48.7252, lon: 2.2570, lines: ['RER B', 'RER C'] },
  { name: 'Versailles Chantiers', lat: 48.7955, lon: 2.1356, lines: ['RER C', 'N'] },
  { name: 'Saint-Quentin-en-Yvelines', lat: 48.7877, lon: 2.0450, lines: ['RER C', 'N'] },
  { name: 'Goussainville', lat: 49.0128, lon: 2.4640, lines: ['RER D'] },
  { name: 'Aéroport CDG 2', lat: 49.0046, lon: 2.5706, lines: ['RER B'] },
  { name: 'Aulnay-sous-Bois', lat: 48.9318, lon: 2.4959, lines: ['RER B'] },
  { name: 'Noisy-le-Grand Mont d\'Est', lat: 48.8406, lon: 2.5500, lines: ['RER A'] },
  { name: 'Marne-la-Vallée Chessy', lat: 48.8700, lon: 2.7826, lines: ['RER A'] },
  { name: 'Boissy-Saint-Léger', lat: 48.7530, lon: 2.5063, lines: ['RER A'] },
  { name: 'Juvisy', lat: 48.6890, lon: 2.3830, lines: ['RER C', 'RER D'] },
  { name: 'Évry-Courcouronnes', lat: 48.6260, lon: 2.4290, lines: ['RER D'] },
  { name: 'Melun', lat: 48.5272, lon: 2.6553, lines: ['RER D', 'R'] },
  { name: 'Saint-Germain-en-Laye', lat: 48.8983, lon: 2.0944, lines: ['RER A'] },
  { name: 'Cergy-Préfecture', lat: 49.0366, lon: 2.0773, lines: ['RER A'] },
  { name: 'Argenteuil', lat: 48.9460, lon: 2.2440, lines: ['J'] },
  { name: 'Pontoise', lat: 49.0507, lon: 2.0982, lines: ['RER C', 'H'] },
  { name: 'Mantes-la-Jolie', lat: 48.9898, lon: 1.7030, lines: ['J', 'N'] },
  { name: 'Saint-Denis', lat: 48.9346, lon: 2.3457, lines: ['RER D', 'H'] },
  { name: 'Sarcelles-Saint-Brice', lat: 48.9990, lon: 2.3680, lines: ['H'] },
]

const PLACES = [
  { id: 'p1', name: 'Goussainville, Mairie', label: 'Mairie, 95190 Goussainville', lat: 49.0135, lon: 2.4700, type: 'PLACE' },
  { id: 'p2', name: 'Palaiseau, Mairie', label: 'Mairie, 91120 Palaiseau', lat: 48.7146, lon: 2.2457, type: 'PLACE' },
  { id: 'p3', name: 'Paris 15e, Rue de Vaugirard', label: '200 Rue de Vaugirard, 75015 Paris', lat: 48.8418, lon: 2.3134, type: 'ADDRESS' },
  { id: 'p4', name: 'Paris 1er, Rue de Rivoli', label: '100 Rue de Rivoli, 75001 Paris', lat: 48.8600, lon: 2.3440, type: 'ADDRESS' },
  { id: 'p5', name: 'La Défense, Grande Arche', label: 'Parvis de la Défense, 92800 Puteaux', lat: 48.8927, lon: 2.2360, type: 'PLACE' },
  { id: 'p6', name: 'Orsay, Université', label: 'Université Paris-Saclay, 91400 Orsay', lat: 48.7054, lon: 2.1750, type: 'PLACE' },
  { id: 'p7', name: 'Créteil, Préfecture', label: 'Préfecture, 94000 Créteil', lat: 48.7800, lon: 2.4600, type: 'PLACE' },
  { id: 'p8', name: 'Cergy, Préfecture', label: 'Préfecture, 95000 Cergy', lat: 49.0380, lon: 2.0790, type: 'PLACE' },
  ...STATIONS.map((s, i) => ({ id: `s${i}`, name: s.name, label: `Gare de ${s.name}`, lat: s.lat, lon: s.lon, type: 'STOP' })),
]

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

export async function searchPlaces(text) {
  await wait(150)
  const t = text.toLowerCase()
  return PLACES.filter((p) => p.label.toLowerCase().includes(t)).slice(0, 6)
}

export async function reverseGeocode(lat, lon) {
  await wait(80)
  return { id: `${lat},${lon}`, name: 'Point sur la carte', label: `${lat.toFixed(4)}, ${lon.toFixed(4)}`, lat, lon }
}

// ---------- Simulation ----------

const DETOUR = 1.3 // les rues font ~30 % de plus que le vol d'oiseau
const SPEED = { CAR: 32, RAIL: 55, WALK: 4.5, BUS: 18, METRO: 25 } // km/h, moyennes porte à porte

function dist(a, b) { return haversine([a.lat, a.lon], [b.lat, b.lon]) }
function nearest(p) { return STATIONS.reduce((best, s) => (dist(s, p) < dist(best, p) ? s : best)) }

// Courbe schématique entre deux points (arc léger) pour distinguer les étapes
function arc(a, b, bow = 0.12, n = 24) {
  const mx = (a.lat + b.lat) / 2, my = (a.lon + b.lon) / 2
  const dx = b.lat - a.lat, dy = b.lon - a.lon
  const cx = mx - dy * bow, cy = my + dx * bow
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n
    return [
      (1 - t) ** 2 * a.lat + 2 * (1 - t) * t * cx + t ** 2 * b.lat,
      (1 - t) ** 2 * a.lon + 2 * (1 - t) * t * cy + t ** 2 * b.lon,
    ]
  })
}

function leg(mode, from, to, extra = {}) {
  const meters = dist(from, to) * DETOUR
  const speed = SPEED[mode === 'CAR_PARKING' ? 'CAR' : mode]
  const seconds = (meters / 1000 / speed) * 3600 + (mode === 'CAR' || mode === 'CAR_PARKING' ? 120 : 0)
  const isTransit = !['WALK', 'CAR', 'CAR_PARKING'].includes(mode)
  return {
    mode, isTransit,
    from: { name: from.name, lat: from.lat, lon: from.lon },
    to: { name: to.name, lat: to.lat, lon: to.lon },
    duration: Math.round(seconds),
    distance: Math.round(meters),
    line: null, headsign: null, agency: null,
    color: { WALK: '#5f6368', CAR: '#1a73e8', CAR_PARKING: '#1a73e8', RAIL: '#7b1fa2', METRO: '#e37400', BUS: '#c62828' }[mode],
    coords: arc(from, to, isTransit ? 0.08 : 0.15),
    ...extra,
  }
}

function transfer(station, minutes = 3) {
  return { mode: 'WALK', isTransit: false, from: { ...station }, to: { ...station }, duration: minutes * 60, distance: 150,
    line: null, headsign: null, agency: null, color: '#5f6368', coords: [] }
}

function itin(kind, legs, transfers = 0) {
  const now = Date.now()
  const duration = legs.reduce((s, l) => s + l.duration, 0)
  return {
    kind, duration, transfers, legs,
    start: new Date(now).toISOString(),
    end: new Date(now + duration * 1000).toISOString(),
    carDistance: legs.filter((l) => l.mode === 'CAR' || l.mode === 'CAR_PARKING').reduce((s, l) => s + l.distance, 0),
    transitDistance: legs.filter((l) => l.isTransit).reduce((s, l) => s + l.distance, 0),
    walkDistance: legs.filter((l) => l.mode === 'WALK').reduce((s, l) => s + l.distance, 0),
    coords: legs.flatMap((l) => l.coords),
  }
}

function railLeg(a, b) {
  const common = a.lines.find((l) => b.lines.includes(l))
  const line = common || `${a.lines[0]} + ${b.lines[0]}`
  return leg('RAIL', a, b, { line, headsign: b.name, agency: common ? 'Transilien / RATP' : 'Transilien (correspondance)' })
}

export async function planAll(from, to) {
  await wait(500)
  const direct = dist(from, to)

  // Tout voiture
  const car = [itin('car', [leg('CAR', from, to)])]

  // Park & ride : gare proche du départ, gare proche de l'arrivée
  const sA = nearest(from)
  const sB = nearest(to)
  const parkride = []
  const transit = []

  if (sA.name !== sB.name && direct > 3000) {
    const common = sA.lines.some((l) => sB.lines.includes(l))
    const legsPR = [
      leg('CAR_PARKING', from, sA),
      transfer(sA, 3),
      railLeg(sA, sB),
      leg('WALK', sB, to),
    ]
    parkride.push(itin('parkride', legsPR, common ? 0 : 1))

    // Variante : deuxième gare la plus proche du départ, si elle est différente
    const alt = STATIONS.filter((s) => s.name !== sA.name && s.name !== sB.name)
      .sort((x, y) => dist(x, from) - dist(y, from))[0]
    if (alt && dist(alt, from) < 20000) {
      parkride.push(itin('parkride', [leg('CAR_PARKING', from, alt), transfer(alt, 3), railLeg(alt, sB), leg('WALK', sB, to)], 1))
    }

    // Transports uniquement : marche ou bus jusqu'à la gare
    const toStation = dist(from, sA) < 1800 ? leg('WALK', from, sA) : leg('BUS', from, sA, { line: 'Bus', agency: 'Réseau local' })
    transit.push(itin('transit', [toStation, transfer(sA, 3), railLeg(sA, sB), leg('WALK', sB, to)], toStation.mode === 'BUS' ? 2 : 1))
  }

  return { car, parkride, transit }
}
