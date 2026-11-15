# MyNav — comparateur voiture / voiture + transports

Web app de navigation qui compare, pour un trajet A → B :

- **Tout voiture**
- **Voiture + transports** : rouler jusqu'à un parking relais près d'une gare, finir en train / RER / métro
- **Transports uniquement**

…avec pour chaque option la **durée**, le **coût** (carburant, billet, parking), les **litres économisés** et le **CO₂**.

Stack 100 % open source, données ouvertes, aucune dépendance à un service tiers : le projet peut être
commercialisé (voir *Licences*).

## Architecture

```
 React + Leaflet (front)  ──►  MOTIS (Docker, auto-hébergé)
                                 ├─ itinéraires voiture / transports / park & ride
                                 ├─ recherche d'adresse (géocodage)
                                 └─ géocodage inverse
                                      ▲
                     OpenStreetMap (routes, gares, parkings)
                     GTFS transport.data.gouv.fr (horaires IDFM, SNCF)
```

| Brique | Projet | Licence |
|---|---|---|
| Moteur d'itinéraires + géocodage | [MOTIS](https://github.com/motis-project/motis) | MIT |
| Front | React, Vite, Leaflet, react-leaflet | MIT / BSD |
| Données routières | [OpenStreetMap](https://www.openstreetmap.org/copyright) | ODbL |
| Horaires | [transport.data.gouv.fr](https://transport.data.gouv.fr) (IDFM, SNCF) | Licence Ouverte / ODbL |

## Démo en ligne

Le front est publié automatiquement sur GitHub Pages à chaque push sur `main` :
**https://anonyme4321.github.io/mynav/** (mode démo : itinéraires fictifs, pas de serveur MOTIS).

## Démarrage rapide (mode démo, sans serveur)

```bash
npm install
npm run dev          # http://localhost:5173
```

Le fichier `.env` est livré avec `VITE_DEMO=1` : l'interface tourne avec des itinéraires fictifs
(Palaiseau → Paris 15e) pour découvrir le comparateur. Rien n'est calculé.

## Mode réel : lancer MOTIS

Prérequis : Docker, ~6 Go de RAM libres, ~2 Go de disque (Île-de-France).

```bash
./scripts/download-data.sh    # OSM Île-de-France + GTFS IDFM + GTFS SNCF
./scripts/import.sh           # pré-calcul des index (10-30 min, une seule fois)
docker compose up -d          # API sur http://localhost:8080
```

Puis dans `.env` : `VITE_DEMO=0`, et relance `npm run dev`.

Vérifier que MOTIS répond :

```bash
curl 'http://localhost:8080/api/v1/geocode?text=massy%20palaiseau'
```

La documentation OpenAPI de MOTIS est servie sur http://localhost:8080/api.

### Changer de région

Dans `scripts/download-data.sh`, remplace l'extrait Geofabrik et les GTFS par ceux de ta région
(cherche-les sur transport.data.gouv.fr), puis adapte `motis/data/config.yml` (`osm:` et `datasets:`).
Pour la France entière : l'extrait `france-latest.osm.pbf` (~4 Go) et les GTFS de chaque réseau.

## Comment marche la comparaison

`src/api/motis.js` fait deux requêtes `/api/v1/plan` :

1. `directModes=CAR` + `preTransitModes=CAR_PARKING` → le tout-voiture (`direct`) et les options
   park & ride (`itineraries`). MOTIS choisit lui-même les parkings OSM proches des gares.
   `maxPreTransitTime` limite la partie voiture (45 min par défaut).
2. `preTransitModes=WALK` → les options transports uniquement.

`src/lib/compare.js` évalue chaque itinéraire :

- carburant = km voiture × consommation × prix du litre
- + usure (optionnel), + billet (0 si abonnement), + parking
- CO₂ = km voiture × facteur voiture + km transports × facteur du mode

Toutes les hypothèses sont réglables dans l'onglet ⚙️ et mémorisées (localStorage).

## Structure

```
docker-compose.yml           serveur MOTIS
motis/data/config.yml        configuration MOTIS (région, datasets)
scripts/download-data.sh     téléchargement OSM + GTFS
scripts/import.sh            pré-calcul MOTIS
src/
  api/motis.js               client MOTIS : géocodage, plan, normalisation
  api/demo.js                données fictives (VITE_DEMO=1)
  lib/compare.js             coût, carburant, CO₂, comparaison
  lib/polyline.js            décodage des tracés
  hooks/useFavorites.js      favoris (localStorage)
  hooks/useSettings.js       hypothèses de calcul (localStorage)
  components/
    MapView.jsx              carte, tracés colorés par mode, marqueur parking
    SearchBox.jsx            recherche avec suggestions
    ComparePanel.jsx         formulaire + cartes de comparaison
    SettingsPanel.jsx        réglages
    FavoritesPanel.jsx       favoris
  App.jsx                    état global
```

## Licences et commercialisation

- Code des moteurs : MIT / BSD, utilisables commercialement sans restriction autre que la mention de
  licence.
- **OSM (ODbL)** : usage commercial autorisé. Obligation d'**attribuer** « © OpenStreetMap contributors »
  (déjà dans la carte). Si tu redistribues une base dérivée d'OSM, elle doit rester sous ODbL ; une app
  qui *utilise* les données n'est pas concernée.
- **GTFS transport.data.gouv.fr** : Licence Ouverte (Etalab) ou ODbL selon le réseau. Usage
  commercial autorisé avec attribution. Vérifie la licence de chaque jeu de données au téléchargement.
- Fond de carte : les tuiles `tile.openstreetmap.org` sont réservées au développement et aux petits
  usages. Pour la production, héberge tes tuiles : [Protomaps](https://protomaps.com) (un fichier
  `.pmtiles`, licence BSD) + [MapLibre GL](https://maplibre.org) (BSD), puis règle `VITE_TILE_URL`.

## Héberger MOTIS gratuitement (Oracle Cloud Always Free)

Voir [deploy/README.md](deploy/README.md) : création de la machine ARM gratuite, installation
automatique par `deploy/setup-server.sh` (MOTIS + HTTPS), puis variable `MOTIS_URL` dans GitHub
pour que la démo en ligne calcule de vrais itinéraires.

## Étapes suivantes

1. **Backend** (Node + PostgreSQL) : comptes, favoris synchronisés, historique des trajets et économies
   cumulées.
2. **Temps réel** : flux GTFS-RT de transport.data.gouv.fr, supportés par MOTIS (`rt:` dans config.yml).
3. **Tuiles auto-hébergées** (Protomaps) pour la production.
4. **PWA puis appli mobile** (React Native / Expo) en réutilisant `src/api/` et `src/lib/`.
5. **Retour du soir** : proposer l'horaire de retour et vérifier que le parking relais est ouvert.
