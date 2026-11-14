#!/usr/bin/env bash
# Pré-calcule les index MOTIS (réseau routier, horaires, géocodage).
# À relancer uniquement quand les données changent. Compte 10-30 min et
# 4-8 Go de RAM pour l'Île-de-France.

set -euo pipefail
cd "$(dirname "$0")/.."

for f in ile-de-france-latest.osm.pbf idfm-gtfs.zip; do
  [ -f "motis/data/$f" ] || { echo "Fichier manquant : motis/data/$f — lance ./scripts/download-data.sh"; exit 1; }
done

docker compose pull motis
docker compose run --rm motis import

echo
echo "Import terminé. Démarre le serveur avec : docker compose up -d"
echo "Puis teste : curl 'http://localhost:8080/api/v1/geocode?text=gare%20de%20lyon'"
