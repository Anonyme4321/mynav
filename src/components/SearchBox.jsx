import { useEffect, useRef, useState } from 'react'
import { searchPlaces } from '../api/motis'

// Champ de recherche avec suggestions (debounce 250 ms)
export default function SearchBox({ value, onSelect, placeholder = 'Rechercher un lieu…' }) {
  const [text, setText] = useState(value?.label || '')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const timer = useRef(null)
  const wrapper = useRef(null)

  useEffect(() => { setText(value?.label || '') }, [value])

  useEffect(() => {
    const close = (e) => { if (wrapper.current && !wrapper.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  function handleChange(e) {
    const q = e.target.value
    setText(q)
    clearTimeout(timer.current)
    if (q.trim().length < 2) { setResults([]); return }
    timer.current = setTimeout(async () => {
      setLoading(true)
      try {
        const r = await searchPlaces(q)
        setResults(r)
        setOpen(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 250)
  }

  function choose(place) {
    setText(place.label)
    setOpen(false)
    onSelect(place)
  }

  function handleKey(e) {
    if (e.key === 'Enter' && results.length) choose(results[0])
    if (e.key === 'Escape') setOpen(false)
  }

  const icon = (t) => ({ STOP: '🚏', ADDRESS: '📍', PLACE: '🏷️' }[t] || '📍')

  return (
    <div className="search" ref={wrapper}>
      <input
        type="text"
        value={text}
        placeholder={loading ? 'Recherche…' : placeholder}
        onChange={handleChange}
        onKeyDown={handleKey}
        onFocus={() => results.length && setOpen(true)}
      />
      {open && results.length > 0 && (
        <ul className="suggestions">
          {results.map((p) => (
            <li key={p.id} onClick={() => choose(p)}>
              {icon(p.type)} {p.name}
              <small>{p.label}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
