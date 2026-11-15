// Distance à vol d'oiseau en mètres entre deux [lat, lon]
export function haversine([lat1, lon1], [lat2, lon2]) {
  const R = 6371000, r = Math.PI / 180
  const dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}
