import { useCallback, useEffect, useState } from 'react'

// Favoris persistés dans localStorage.
// Structure : { places: [{ id, name, label, lat, lon }], routes: [{ id, from, to, mode }] }
// À remplacer plus tard par un appel API vers ton backend pour synchroniser
// entre la web app et l'appli mobile.

const KEY = 'mynav.favorites.v1'
const EMPTY = { places: [], routes: [] }

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY
  } catch {
    return EMPTY
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(favorites))
    } catch {
      /* quota ou mode privé : on ignore */
    }
  }, [favorites])

  const addPlace = useCallback((place) => {
    setFavorites((f) => {
      if (f.places.some((p) => p.id === place.id)) return f
      return { ...f, places: [...f.places, place] }
    })
  }, [])

  const removePlace = useCallback((id) => {
    setFavorites((f) => ({ ...f, places: f.places.filter((p) => p.id !== id) }))
  }, [])

  const addRoute = useCallback((from, to, mode) => {
    setFavorites((f) => ({
      ...f,
      routes: [...f.routes, { id: Date.now(), from, to, mode }],
    }))
  }, [])

  const removeRoute = useCallback((id) => {
    setFavorites((f) => ({ ...f, routes: f.routes.filter((r) => r.id !== id) }))
  }, [])

  const isPlaceSaved = useCallback(
    (id) => favorites.places.some((p) => p.id === id),
    [favorites.places]
  )

  return { favorites, addPlace, removePlace, addRoute, removeRoute, isPlaceSaved }
}
