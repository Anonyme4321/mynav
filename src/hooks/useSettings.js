import { useEffect, useState } from 'react'
import { DEFAULT_SETTINGS } from '../lib/compare'

const KEY = 'mynav.settings.v1'

export function useSettings() {
  const [settings, setSettings] = useState(() => {
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS
    } catch {
      return DEFAULT_SETTINGS
    }
  })

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(settings)) } catch { /* ignore */ }
  }, [settings])

  const update = (patch) => setSettings((s) => ({ ...s, ...patch }))
  const reset = () => setSettings(DEFAULT_SETTINGS)
  return { settings, update, reset }
}
