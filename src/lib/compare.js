// Évaluation économique et environnementale d'un itinéraire.
// Toutes les hypothèses sont modifiables par l'utilisateur (SettingsPanel).

export const DEFAULT_SETTINGS = {
  consumption: 6.5,     // L / 100 km (voiture thermique moyenne)
  fuelPrice: 1.75,      // € / L
  wearPerKm: 0.08,      // € / km : usure, pneus, entretien (hors carburant)
  countWear: false,     // inclure l'usure dans le coût voiture ?
  parkingDest: 0,       // € : stationnement à destination (tout-voiture)
  parkingPR: 0,         // € : parking relais (souvent gratuit avec un abonnement)
  ticketPrice: 2.50,    // € : prix d'un trajet en transports
  hasPass: false,       // abonnement (Navigo…) → coût marginal des transports = 0
  co2Car: 0.19,         // kg CO2e / km, voiture thermique (ordre de grandeur ADEME)
  co2Rail: 0.006,       // kg CO2e / km, train / RER / métro électrique
  co2Bus: 0.10,         // kg CO2e / km, bus
}

export function evaluate(it, s = DEFAULT_SETTINGS) {
  const carKm = it.carDistance / 1000
  const fuelLiters = (carKm * s.consumption) / 100
  const fuelCost = fuelLiters * s.fuelPrice
  const wearCost = s.countWear ? carKm * s.wearPerKm : 0

  const transitLegs = it.legs.filter((l) => l.isTransit)
  const usesTransit = transitLegs.length > 0
  const transitCost = usesTransit && !s.hasPass ? s.ticketPrice : 0

  let parkingCost = 0
  if (it.kind === 'car') parkingCost = s.parkingDest
  if (it.kind === 'parkride') parkingCost = s.parkingPR

  const co2Transit = transitLegs.reduce((sum, l) => {
    const perKm = l.mode === 'BUS' || l.mode === 'COACH' ? s.co2Bus : s.co2Rail
    return sum + (l.distance / 1000) * perKm
  }, 0)
  const co2 = carKm * s.co2Car + co2Transit

  return {
    carKm,
    fuelLiters,
    fuelCost,
    wearCost,
    transitCost,
    parkingCost,
    totalCost: fuelCost + wearCost + transitCost + parkingCost,
    co2,
    minutes: Math.round(it.duration / 60),
  }
}

// Compare chaque alternative au tout-voiture de référence
export function compareToCar(alt, car) {
  if (!car) return null
  return {
    extraMinutes: alt.minutes - car.minutes,
    savedEuros: car.totalCost - alt.totalCost,
    savedFuel: car.fuelLiters - alt.fuelLiters,
    savedCo2: car.co2 - alt.co2,
  }
}

export const fmtEur = (n) => `${n.toFixed(2).replace('.', ',')} €`
export const fmtKg = (n) => (n < 1 ? `${Math.round(n * 1000)} g` : `${n.toFixed(1).replace('.', ',')} kg`)
export const fmtMin = (m) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`)
export const fmtKm = (m) => (m >= 1000 ? `${(m / 1000).toFixed(1).replace('.', ',')} km` : `${Math.round(m)} m`)
