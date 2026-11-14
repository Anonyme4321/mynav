// Décodage du format "encoded polyline" (Google), utilisé par MOTIS pour
// les tracés de chaque étape. `precision` vaut 5 ou 7 selon la réponse.
export function decodePolyline(str, precision = 7) {
  const factor = Math.pow(10, precision)
  const coords = []
  let index = 0, lat = 0, lon = 0

  while (index < str.length) {
    let shift = 0, result = 0, byte
    do {
      byte = str.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)
    lat += result & 1 ? ~(result >> 1) : result >> 1

    shift = 0; result = 0
    do {
      byte = str.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)
    lon += result & 1 ? ~(result >> 1) : result >> 1

    coords.push([lat / factor, lon / factor])
  }
  return coords
}
