// Données fictives pour tester l'interface sans serveur MOTIS (VITE_DEMO=1).
// Scénario : Palaiseau → Paris 15e, avec un parking relais à Massy-Palaiseau.

const PLACES = [
  { id: 'd1', name: 'Palaiseau, Mairie', label: 'Palaiseau, Mairie, 91120 Palaiseau', lat: 48.7146, lon: 2.2457, type: 'PLACE' },
  { id: 'd2', name: 'Paris 15e, Rue de Vaugirard', label: '200 Rue de Vaugirard, 75015 Paris', lat: 48.8418, lon: 2.3134, type: 'ADDRESS' },
  { id: 'd3', name: 'Massy-Palaiseau', label: 'Gare de Massy-Palaiseau, 91300 Massy', lat: 48.7252, lon: 2.2570, type: 'STOP' },
  { id: 'd4', name: 'Montparnasse', label: 'Gare Montparnasse, 75015 Paris', lat: 48.8412, lon: 2.3206, type: 'STOP' },
  { id: 'd5', name: 'Versailles Chantiers', label: 'Gare de Versailles Chantiers, 78000 Versailles', lat: 48.7955, lon: 2.1356, type: 'STOP' },
  { id: 'd6', name: 'Orsay, Université', label: 'Université Paris-Saclay, 91400 Orsay', lat: 48.7054, lon: 2.1750, type: 'PLACE' },
]

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

export async function searchPlaces(text) {
  await wait(200)
  const t = text.toLowerCase()
  return PLACES.filter((p) => p.label.toLowerCase().includes(t))
}

export async function reverseGeocode(lat, lon) {
  await wait(100)
  return { id: `${lat},${lon}`, name: 'Point sur la carte', label: `${lat.toFixed(4)}, ${lon.toFixed(4)}`, lat, lon }
}

const line = (a, b, n = 8) =>
  Array.from({ length: n + 1 }, (_, i) => [a.lat + ((b.lat - a.lat) * i) / n, a.lon + ((b.lon - a.lon) * i) / n])

function leg(mode, from, to, minutes, km, extra = {}) {
  return {
    mode,
    isTransit: !['WALK', 'CAR', 'CAR_PARKING'].includes(mode),
    from: { name: from.name, lat: from.lat, lon: from.lon },
    to: { name: to.name, lat: to.lat, lon: to.lon },
    duration: minutes * 60,
    distance: km * 1000,
    line: null, headsign: null, agency: null,
    color: { WALK: '#5f6368', CAR: '#1a73e8', CAR_PARKING: '#1a73e8', RAIL: '#7b1fa2', METRO: '#e37400', BUS: '#c62828' }[mode],
    coords: line(from, to),
    ...extra,
  }
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

export async function planAll(from, to) {
  await wait(600)
  const massy = PLACES[2], montparnasse = PLACES[3], versailles = PLACES[4]
  const nearDest = { name: 'Arrêt Vaugirard', lat: to.lat - 0.002, lon: to.lon + 0.002 }

  return {
    car: [itin('car', [leg('CAR', from, to, 34, 22.5)])],
    parkride: [
      itin('parkride', [
        leg('CAR_PARKING', from, massy, 6, 2.4),
        leg('WALK', massy, massy, 3, 0.2),
        leg('RAIL', massy, montparnasse, 14, 15.3, { line: 'N', headsign: 'Paris Montparnasse', agency: 'Transilien' }),
        leg('WALK', montparnasse, to, 9, 0.7),
      ], 0),
      itin('parkride', [
        leg('CAR_PARKING', from, versailles, 15, 11.0),
        leg('WALK', versailles, versailles, 3, 0.2),
        leg('RAIL', versailles, montparnasse, 22, 17.0, { line: 'N', headsign: 'Paris Montparnasse', agency: 'Transilien' }),
        leg('WALK', montparnasse, to, 9, 0.7),
      ], 0),
    ],
    transit: [
      itin('transit', [
        leg('WALK', from, massy, 14, 1.1),
        leg('RAIL', massy, montparnasse, 14, 15.3, { line: 'N', headsign: 'Paris Montparnasse', agency: 'Transilien' }),
        leg('METRO', montparnasse, nearDest, 4, 1.4, { line: '12', headsign: 'Front Populaire', agency: 'RATP' }),
        leg('WALK', nearDest, to, 3, 0.2),
      ], 1),
    ],
  }
}
