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
  // Tolérance au temps supplémentaire par rapport au tout-voiture
  maxExtraPct: 25,      // % : au-delà, le trajet mixte est jugé trop lent
  maxExtraMin: 20,      // minutes : plafond absolu
  timeValue: 0,         // €/h : valeur que tu donnes à ton temps (0 = ignorer)
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

/**
 * Verdict lisible pour une alternative au tout-voiture.
 * Renvoie { level: 'great'|'good'|'tradeoff'|'bad', title, detail, eurosPerHour }
 *
 *  - great    : plus rapide ET moins cher
 *  - good     : moins cher, et le temps en plus reste sous ta tolérance
 *  - tradeoff : moins cher (ou moins de CO2) mais trop lent pour ta tolérance
 *  - bad      : plus cher et pas plus rapide
 */
export function verdict(alt, car, s = DEFAULT_SETTINGS) {
  if (!car) return null
  const vs = compareToCar(alt, car)
  const extra = vs.extraMinutes
  const pct = car.minutes > 0 ? (extra / car.minutes) * 100 : 0
  const tooSlow = extra > s.maxExtraMin || pct > s.maxExtraPct
  // Euros économisés par heure de trajet en plus : la vraie question à se poser
  const eurosPerHour = extra > 0 ? vs.savedEuros / (extra / 60) : null
  // Coût "généralisé" : argent + temps valorisé
  const timeCost = s.timeValue > 0 ? (extra / 60) * s.timeValue : 0
  const netGain = vs.savedEuros - timeCost

  const pctTxt = `+${extra} min sur ${fmtMin(car.minutes)} (+${Math.round(pct)} %)`

  if (extra <= 0 && vs.savedEuros >= 0) {
    return {
      level: 'great', title: 'Ça vaut le coup, sans hésiter',
      detail: `${extra === 0 ? 'Aussi rapide' : `${-extra} min plus rapide`} et ${vs.savedEuros > 0 ? `${fmtEur(vs.savedEuros)} de moins` : 'même prix'} que la voiture.`,
      eurosPerHour, netGain, pct,
    }
  }
  if (vs.savedEuros <= 0 && extra >= 0) {
    return {
      level: 'bad', title: 'Pas intéressant',
      detail: `${pctTxt} et ${vs.savedEuros < 0 ? `${fmtEur(-vs.savedEuros)} de plus` : 'aucune économie'}. ${vs.savedCo2 > 0.5 ? `Seul gain : −${fmtKg(vs.savedCo2)} CO₂.` : ''}`.trim(),
      eurosPerHour, netGain, pct,
    }
  }
  if (vs.savedEuros > 0 && !tooSlow && netGain >= 0) {
    return {
      level: 'good', title: 'Ça vaut le coup',
      detail: `${pctTxt} pour économiser ${fmtEur(vs.savedEuros)}${eurosPerHour ? `, soit ${fmtEur(eurosPerHour)} par heure de trajet en plus` : ''}.`,
      eurosPerHour, netGain, pct,
    }
  }
  if (vs.savedEuros > 0) {
    return {
      level: 'tradeoff', title: 'Trop lent pour ce que ça rapporte',
      detail: `${pctTxt} pour ${fmtEur(vs.savedEuros)} d'économie${eurosPerHour ? ` : ${fmtEur(eurosPerHour)} par heure perdue` : ''}. À envisager pour le CO₂ (−${fmtKg(vs.savedCo2)}) ou si tu peux utiliser ce temps (lire, travailler).`,
      eurosPerHour, netGain, pct,
    }
  }
  // Plus rapide mais plus cher
  return {
    level: 'tradeoff', title: 'Plus rapide, mais plus cher',
    detail: `${-extra} min de gagnées pour ${fmtEur(-vs.savedEuros)} de plus.`,
    eurosPerHour, netGain, pct,
  }
}

export const fmtEur =(n) => `${n.toFixed(2).replace('.', ',')} €`
export const fmtKg = (n) => (n < 1 ? `${Math.round(n * 1000)} g` : `${n.toFixed(1).replace('.', ',')} kg`)
export const fmtMin = (m) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`)
export const fmtKm = (m) => (m >= 1000 ? `${(m / 1000).toFixed(1).replace('.', ',')} km` : `${Math.round(m)} m`)
