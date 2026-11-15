import SearchBox from './SearchBox'
import { modeInfo, DEMO } from '../api/motis'
import { evaluate, compareToCar, fmtEur, fmtKg, fmtMin, fmtKm } from '../lib/compare'

const KIND = {
  car: { label: 'Tout voiture', icon: '🚗' },
  parkride: { label: 'Voiture + transports', icon: '🅿️' },
  transit: { label: 'Transports uniquement', icon: '🚆' },
}

export default function ComparePanel({
  from, to, results, loading, error, settings, selected,
  onFromChange, onToChange, onCompute, onSwap, onClear, onUseMyPosition, onSelect, onSaveRoute,
}) {
  // Évaluation de chaque itinéraire + comparaison au meilleur tout-voiture
  let rows = []
  let carRef = null
  if (results) {
    const all = [...results.car, ...results.parkride, ...results.transit]
    rows = all.map((it) => ({ it, ev: evaluate(it, settings) }))
    carRef = rows.find((r) => r.it.kind === 'car')?.ev || null
    rows.forEach((r) => (r.vs = r.it.kind === 'car' ? null : compareToCar(r.ev, carRef)))
  }
  const best = rows.length ? rows.reduce((a, b) => (b.ev.totalCost < a.ev.totalCost ? b : a)) : null

  return (
    <div className="route-form">
      <div className="route-row">
        <span className="dot start" />
        <SearchBox value={from} onSelect={onFromChange} placeholder="Départ" />
        <button className="btn icon" title="Utiliser ma position" onClick={onUseMyPosition}>📍</button>
      </div>
      <div className="route-row">
        <span className="dot end" />
        <SearchBox value={to} onSelect={onToChange} placeholder="Arrivée" />
        <button className="btn icon" title="Inverser" onClick={onSwap}>⇅</button>
      </div>

      <div className="route-row">
        <button className="btn" style={{ flex: 1 }} onClick={onCompute} disabled={!from || !to || loading}>
          {loading ? 'Calcul…' : 'Comparer'}
        </button>
        <button className="btn secondary" onClick={onClear}>Effacer</button>
      </div>

      {!results && !error && (
        <p className="muted">Astuce : clique sur la carte pour fixer le départ, puis l'arrivée.</p>
      )}
      {error && <p className="error">{error}</p>}

      {results && rows.length === 0 && <p className="muted">Aucun itinéraire trouvé.</p>}
      {results && DEMO && (
        <p className="muted">Mode démo : gares réelles, mais durées et tracés simulés (courbes schématiques). Les vrais itinéraires rue par rue viennent du serveur MOTIS.</p>
      )}

      {rows.map((r, i) => {
        const k = KIND[r.it.kind]
        const isSel = selected === r.it
        return (
          <div key={i} className={`option ${isSel ? 'selected' : ''} ${r === best ? 'best' : ''}`} onClick={() => onSelect(r.it)}>
            <div className="option-head">
              <span className="option-kind">{k.icon} {k.label}</span>
              {r === best && rows.length > 1 && <span className="badge">Le moins cher</span>}
            </div>

            <div className="option-stats">
              <div><strong>{fmtMin(r.ev.minutes)}</strong><small>durée</small></div>
              <div><strong>{fmtEur(r.ev.totalCost)}</strong><small>coût</small></div>
              <div><strong>{fmtKg(r.ev.co2)}</strong><small>CO₂</small></div>
              <div><strong>{r.ev.fuelLiters.toFixed(1).replace('.', ',')} L</strong><small>carburant</small></div>
            </div>

            {r.vs && (
              <div className={`vs ${r.vs.savedEuros > 0 ? 'good' : 'bad'}`}>
                {r.vs.extraMinutes >= 0 ? `+${r.vs.extraMinutes} min` : `${r.vs.extraMinutes} min`}
                {' · '}
                {r.vs.savedEuros >= 0 ? `économise ${fmtEur(r.vs.savedEuros)}` : `coûte ${fmtEur(-r.vs.savedEuros)} de plus`}
                {' · '}
                {r.vs.savedCo2 >= 0 ? `−${fmtKg(r.vs.savedCo2)} CO₂` : `+${fmtKg(-r.vs.savedCo2)} CO₂`}
              </div>
            )}

            <div className="legs">
              {r.it.legs.filter((l) => l.mode !== 'WALK' || l.distance > 150).map((l, j) => {
                const m = modeInfo(l.mode)
                return (
                  <span key={j} className="leg-chip" style={{ borderColor: l.color }} title={`${m.label} · ${fmtKm(l.distance)} · ${fmtMin(Math.round(l.duration / 60))}`}>
                    {m.icon} {l.line || m.label}
                    {l.mode === 'CAR_PARKING' && l.to?.name ? ` → ${l.to.name}` : ''}
                  </span>
                )
              })}
            </div>

            {isSel && (
              <>
                <ol className="steps">
                  {r.it.legs.map((l, j) => {
                    const m = modeInfo(l.mode)
                    return (
                      <li key={j}>
                        {m.icon} {m.label}{l.line ? ` ${l.line}` : ''}{l.headsign ? ` dir. ${l.headsign}` : ''}
                        {l.to?.name ? ` → ${l.to.name}` : ''}
                        <span className="muted"> — {fmtMin(Math.round(l.duration / 60))}, {fmtKm(l.distance)}</span>
                      </li>
                    )
                  })}
                </ol>
                <div className="muted" style={{ marginTop: 6 }}>
                  Voiture {fmtKm(r.it.carDistance)} · transports {fmtKm(r.it.transitDistance)} · marche {fmtKm(r.it.walkDistance)}
                  {r.ev.transitCost > 0 && ` · billet ${fmtEur(r.ev.transitCost)}`}
                  {r.ev.parkingCost > 0 && ` · parking ${fmtEur(r.ev.parkingCost)}`}
                </div>
                <button className="btn small secondary" style={{ marginTop: 8 }} onClick={(e) => { e.stopPropagation(); onSaveRoute() }}>
                  ⭐ Enregistrer ce trajet
                </button>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
