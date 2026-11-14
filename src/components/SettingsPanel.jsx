// Hypothèses de calcul : voiture, carburant, billets, CO2
export default function SettingsPanel({ settings, onChange, onReset }) {
  const num = (key, label, step = 0.01, unit = '') => (
    <label className="field" key={key}>
      <span>{label}</span>
      <span className="field-input">
        <input
          type="number"
          step={step}
          min="0"
          value={settings[key]}
          onChange={(e) => onChange({ [key]: parseFloat(e.target.value) || 0 })}
        />
        {unit && <small>{unit}</small>}
      </span>
    </label>
  )
  const bool = (key, label) => (
    <label className="field check" key={key}>
      <input type="checkbox" checked={settings[key]} onChange={(e) => onChange({ [key]: e.target.checked })} />
      <span>{label}</span>
    </label>
  )

  return (
    <div className="settings">
      <h4>Ma voiture</h4>
      {num('consumption', 'Consommation', 0.1, 'L/100 km')}
      {num('fuelPrice', 'Prix du carburant', 0.01, '€/L')}
      {bool('countWear', "Compter l'usure (pneus, entretien…)")}
      {settings.countWear && num('wearPerKm', 'Usure', 0.01, '€/km')}
      {num('parkingDest', 'Parking à destination', 0.5, '€')}

      <h4>Transports</h4>
      {bool('hasPass', 'J\'ai un abonnement (Navigo…)')}
      {!settings.hasPass && num('ticketPrice', 'Prix du trajet', 0.1, '€')}
      {num('parkingPR', 'Parking relais', 0.5, '€')}

      <h4>Émissions</h4>
      {num('co2Car', 'Voiture', 0.01, 'kg CO₂/km')}
      {num('co2Rail', 'Train / métro / tram', 0.001, 'kg CO₂/km')}
      {num('co2Bus', 'Bus', 0.01, 'kg CO₂/km')}

      <button className="btn secondary small" onClick={onReset}>Valeurs par défaut</button>
      <p className="muted">
        Ordres de grandeur : voiture thermique ≈ 0,19 kg CO₂e/km, train électrique ≈ 0,006 (Base Empreinte ADEME).
      </p>
    </div>
  )
}
