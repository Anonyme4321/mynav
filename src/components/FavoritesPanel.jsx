export default function FavoritesPanel({ favorites, onOpenPlace, onOpenRoute, onRemovePlace, onRemoveRoute }) {
  const { places, routes } = favorites

  return (
    <div>
      <h4 style={{ margin: '4px 0 8px' }}>Lieux</h4>
      {places.length === 0 && <p className="muted">Aucun lieu enregistré. Recherche un lieu puis clique sur ⭐.</p>}
      <ul className="fav-list">
        {places.map((p) => (
          <li key={p.id} className="fav-item">
            <span>📌</span>
            <span className="fav-label" onClick={() => onOpenPlace(p)}>
              {p.name}
              <small>{p.label}</small>
            </span>
            <button className="btn icon" title="Supprimer" onClick={() => onRemovePlace(p.id)}>✕</button>
          </li>
        ))}
      </ul>

      <h4 style={{ margin: '16px 0 8px' }}>Trajets</h4>
      {routes.length === 0 && <p className="muted">Aucun trajet enregistré. Compare un trajet puis enregistre-le.</p>}
      <ul className="fav-list">
        {routes.map((r) => (
          <li key={r.id} className="fav-item">
            <span>{r.mode === 'parkride' ? '🅿️' : r.mode === 'transit' ? '🚆' : '🚗'}</span>
            <span className="fav-label" onClick={() => onOpenRoute(r)}>
              {r.from.name} → {r.to.name}
              <small>{r.from.label}</small>
            </span>
            <button className="btn icon" title="Supprimer" onClick={() => onRemoveRoute(r.id)}>✕</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
