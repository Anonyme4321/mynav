#!/usr/bin/env bash
# Télécharge les données ouvertes nécessaires à MOTIS pour l'Île-de-France.
# Toutes ces données autorisent un usage commercial avec attribution :
#   - OSM : licence ODbL (https://www.openstreetmap.org/copyright)
#   - GTFS IDFM / SNCF : Licence Ouverte / ODbL via https://transport.data.gouv.fr
#
# Si un lien change, retrouve le jeu de données sur transport.data.gouv.fr
# et mets à jour l'URL ci-dessous.

set -euo pipefail
cd "$(dirname "$0")/../motis/data"

dl() {  # dl <url> <fichier>
  if [ -f "$2" ]; then echo "✔ $2 déjà présent"; return; fi
  echo "⬇ $2"
  curl -L --fail --progress-bar -o "$2.part" "$1" && mv "$2.part" "$2"
}

# OpenStreetMap — extrait Île-de-France (≈ 500 Mo)
dl "https://download.geofabrik.de/europe/france/ile-de-france-latest.osm.pbf" \
   "ile-de-france-latest.osm.pbf"

# GTFS Île-de-France Mobilités — RATP, Transilien, RER, bus, tram (≈ 150 Mo)
dl "https://eu.ftp.opendatasoft.com/stif/GTFS/IDFM-gtfs.zip" \
   "idfm-gtfs.zip"

# GTFS SNCF Voyages — TGV, Intercités (optionnel, ≈ 10 Mo)
dl "https://eu.ftp.opendatasoft.com/sncf/gtfs/export_gtfs_voyages.zip" \
   "sncf-voyages-gtfs.zip"

echo
echo "Données prêtes dans motis/data/. Lance maintenant : ./scripts/import.sh"
