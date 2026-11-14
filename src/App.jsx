import { useEffect, useState } from 'react'
import MapView from './components/MapView'
import SearchBox from './components/SearchBox'
import ComparePanel from './components/ComparePanel'
import FavoritesPanel from './components/FavoritesPanel'
import SettingsPanel from './components/SettingsPanel'
import { useFavorites } from './hooks/useFavorites'
import { useSettings } from './hooks/useSettings'
import { planAll, reverseGeocode, DEMO } from './api/motis'

export default function App() {
  const [tab, setTab] = useState('compare') // search | compare | favorites | settings

  const [userPos, setUserPos] = useState(null)
  const [center, setCenter] = useState(null)
  const [selectedPlace, setSelectedPlace] = useState(null)

  const [from, setFrom] = useState(null)
  const [to, setTo] = useState(null)
  const [results, setResults] = useState(null)
  const [selectedIt, setSelectedIt] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fav = useFavorites()
  const { settings, update: updateSettings, reset: resetSettings } = useSettings()

  useEffect(() => { locate() }, [])

  function locate() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lon: pos.coords.longitude }
        setUserPos(p)
        setCenter(p)
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  function handleSearchSelect(place) {
    setSelectedPlace(place)
    setCenter(place)
  }

  async function compute(f = from, t = to) {
    if (!f || !t) return
    setLoading(true)
    setError(null)
    setSelectedIt(null)
    try {
      const r = await planAll(f, t)
      setResults(r)
      // Sélection par défaut : le meilleur park & ride s'il existe, sinon la voiture
      setSelectedIt(r.parkride[0] || r.car[0] || r.transit[0] || null)
    } catch (e) {
      setResults(null)
      setError(
        e.message?.includes('fetch')
          ? 'Serveur MOTIS injoignable. Lance `docker compose up -d` ou active le mode démo (VITE_DEMO=1).'
          : e.message || 'Erreur lors du calcul.'
      )
    } finally {
      setLoading(false)
    }
  }

  function clear() {
    setFrom(null); setTo(null); setResults(null); setSelectedIt(null); setError(null)
  }

  function swap() {
    setFrom(to); setTo(from); setResults(null); setSelectedIt(null)
  }

  async function useMyPosition() {
    if (!userPos) return locate()
    const place = { ...(await reverseGeocode(userPos.lat, userPos.lon)), id: 'me' }
    setFrom(place)
  }

  async function handleMapClick(lat, lon) {
    if (tab !== 'compare') return
    let place
    try { place = await reverseGeocode(lat, lon) }
    catch { place = { id: `${lat},${lon}`, name: 'Point', label: `${lat.toFixed(5)}, ${lon.toFixed(5)}`, lat, lon } }
    if (!from) setFrom(place)
    else if (!to) setTo(place)
    else { setFrom(place); setTo(null); setResults(null); setSelectedIt(null) }
  }

  function openFavPlace(p) { setTab('search'); handleSearchSelect(p) }
  function openFavRoute(r) { setTab('compare'); setFrom(r.from); setTo(r.to); compute(r.from, r.to) }

  const favCount = fav.favorites.places.length + fav.favorites.routes.length

  return (
    <div className="app">
      <MapView
        userPos={userPos}
        center={center}
        selected={selectedPlace}
        from={tab === 'compare' ? from : null}
        to={tab === 'compare' ? to : null}
        itinerary={tab === 'compare' ? selectedIt : null}
        onMapClick={handleMapClick}
      />

      <aside className="sidebar">
        <div className="brand">
          🧭 MyNav
          {DEMO && <span className="badge demo">démo</span>}
        </div>

        <div className="tabs">
          <button className={tab === 'search' ? 'active' : ''} onClick={() => setTab('search')}>Lieu</button>
          <button className={tab === 'compare' ? 'active' : ''} onClick={() => setTab('compare')}>Comparer</button>
          <button className={tab === 'favorites' ? 'active' : ''} onClick={() => setTab('favorites')}>
            Favoris{favCount > 0 && ` (${favCount})`}
          </button>
          <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')} title="Réglages">⚙️</button>
        </div>

        {tab === 'search' && (
          <>
            <SearchBox value={selectedPlace} onSelect={handleSearchSelect} />
            {selectedPlace && (
              <div className="summary">
                <div><strong style={{ fontSize: 15 }}>{selectedPlace.name}</strong></div>
                <div className="muted">{selectedPlace.label}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  {fav.isPlaceSaved(selectedPlace.id) ? (
                    <button className="btn small secondary" onClick={() => fav.removePlace(selectedPlace.id)}>★ Retirer des favoris</button>
                  ) : (
                    <button className="btn small secondary" onClick={() => fav.addPlace(selectedPlace)}>⭐ Ajouter aux favoris</button>
                  )}
                  <button className="btn small" onClick={() => { setTo(selectedPlace); setTab('compare') }}>Y aller</button>
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'compare' && (
          <ComparePanel
            from={from}
            to={to}
            results={results}
            loading={loading}
            error={error}
            settings={settings}
            selected={selectedIt}
            onFromChange={(p) => { setFrom(p); setResults(null); setSelectedIt(null) }}
            onToChange={(p) => { setTo(p); setResults(null); setSelectedIt(null) }}
            onCompute={() => compute()}
            onSwap={swap}
            onClear={clear}
            onUseMyPosition={useMyPosition}
            onSelect={setSelectedIt}
            onSaveRoute={() => fav.addRoute(from, to, selectedIt?.kind || 'car')}
          />
        )}

        {tab === 'favorites' && (
          <FavoritesPanel
            favorites={fav.favorites}
            onOpenPlace={openFavPlace}
            onOpenRoute={openFavRoute}
            onRemovePlace={fav.removePlace}
            onRemoveRoute={fav.removeRoute}
          />
        )}

        {tab === 'settings' && (
          <SettingsPanel settings={settings} onChange={updateSettings} onReset={resetSettings} />
        )}
      </aside>

      <button className="locate" title="Ma position" onClick={() => { locate(); if (userPos) setCenter({ ...userPos }) }}>
        🎯
      </button>
    </div>
  )
}
