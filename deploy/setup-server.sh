#!/usr/bin/env bash
# =============================================================================
#  MyNav — installation de MOTIS sur un serveur Linux (Ubuntu 22.04 / 24.04)
#  Testé pour une machine Oracle Cloud "Always Free" Ampere A1 (ARM, 4 OCPU, 24 Go)
#  mais fonctionne sur n'importe quel VPS x86_64 ou ARM64 avec ≥ 8 Go de RAM.
#
#  Usage (sur le serveur, en tant qu'utilisateur sudo) :
#     curl -fsSL https://raw.githubusercontent.com/Anonyme4321/mynav/main/deploy/setup-server.sh | bash
#  ou
#     bash setup-server.sh
#
#  Variables optionnelles :
#     DOMAIN=motis.mondomaine.fr   nom de domaine pointant sur le serveur
#                                  (défaut : <ip>.sslip.io, HTTPS automatique sans DNS)
#     REGION=ile-de-france         extrait Geofabrik (défaut : ile-de-france)
#
#  Résultat : une API MOTIS en HTTPS sur https://$DOMAIN, par ex.
#     https://1-2-3-4.sslip.io/api/v1/geocode?text=massy
# =============================================================================
set -euo pipefail

MOTIS_DIR=/opt/motis
REGION="${REGION:-ile-de-france}"
PUBLIC_IP="$(curl -fsS https://api.ipify.org || curl -fsS https://ifconfig.me)"
DOMAIN="${DOMAIN:-${PUBLIC_IP//./-}.sslip.io}"

case "$(uname -m)" in
  aarch64|arm64) TARGET=linux-arm64 ;;
  x86_64)        TARGET=linux-amd64 ;;
  *) echo "Architecture non supportée : $(uname -m)"; exit 1 ;;
esac

log() { echo -e "\n\033[1;34m▶ $*\033[0m"; }

# -----------------------------------------------------------------------------
log "1/7 Paquets système"
sudo apt-get update -qq
sudo apt-get install -y -qq curl wget bzip2 python3 python3-yaml debian-keyring debian-archive-keyring apt-transport-https ca-certificates >/dev/null

# -----------------------------------------------------------------------------
log "2/7 Binaire MOTIS ($TARGET)"
sudo mkdir -p "$MOTIS_DIR" && sudo chown "$USER" "$MOTIS_DIR"
cd "$MOTIS_DIR"
if [ ! -x ./motis ]; then
  wget -q --show-progress "https://github.com/motis-project/motis/releases/latest/download/motis-${TARGET}.tar.bz2"
  tar xf "motis-${TARGET}.tar.bz2" && rm "motis-${TARGET}.tar.bz2"
  # l'archive contient motis/ ou directement le binaire selon les versions
  [ -x ./motis ] || { mv motis motis-dist && mv motis-dist/* . && rmdir motis-dist; }
fi
./motis --version || true

# -----------------------------------------------------------------------------
log "3/7 Données ouvertes (OSM $REGION + GTFS Île-de-France Mobilités + SNCF)"
dl() { [ -f "$2" ] && echo "✔ $2" || wget -q --show-progress -O "$2" "$1"; }
dl "https://download.geofabrik.de/europe/france/${REGION}-latest.osm.pbf" "${REGION}.osm.pbf"
dl "https://eu.ftp.opendatasoft.com/stif/GTFS/IDFM-gtfs.zip"             "idfm-gtfs.zip"
dl "https://eu.ftp.opendatasoft.com/sncf/gtfs/export_gtfs_voyages.zip"    "sncf-voyages-gtfs.zip"

# -----------------------------------------------------------------------------
log "4/7 Configuration"
./motis config "${REGION}.osm.pbf" idfm-gtfs.zip sncf-voyages-gtfs.zip
python3 - <<'EOF'
# Complète la config générée : routage routier, géocodage, park & ride
import yaml
p = 'config.yml'
c = yaml.safe_load(open(p)) or {}
c.setdefault('server', {})
c['server']['host'] = '127.0.0.1'      # exposé seulement via Caddy (HTTPS)
c['server']['port'] = 8080
c['street_routing'] = True
c['osr_footpath'] = True
c['geocoding'] = True
c['reverse_geocoding'] = True
c.setdefault('timetable', {})
c['timetable']['first_day'] = 'TODAY'
c['timetable']['num_days'] = 60
yaml.safe_dump(c, open(p, 'w'), sort_keys=False, allow_unicode=True)
print(open(p).read())
EOF

# -----------------------------------------------------------------------------
log "5/7 Import (10-40 min selon la machine — pas d'inquiétude si ça semble long)"
if [ ! -d data ] || [ ! -f data/.import-done ]; then
  ./motis import
  touch data/.import-done
else
  echo "✔ import déjà fait (supprime $MOTIS_DIR/data pour refaire)"
fi

# -----------------------------------------------------------------------------
log "6/7 Service systemd"
sudo tee /etc/systemd/system/motis.service >/dev/null <<EOF
[Unit]
Description=MOTIS routing server (MyNav)
After=network.target

[Service]
User=$USER
WorkingDirectory=$MOTIS_DIR
ExecStart=$MOTIS_DIR/motis server
Restart=always
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now motis
sleep 5
curl -fsS "http://127.0.0.1:8080/api/v1/geocode?text=paris" >/dev/null && echo "✔ MOTIS répond en local"

# -----------------------------------------------------------------------------
log "7/7 Reverse proxy HTTPS (Caddy) sur https://$DOMAIN"
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  sudo apt-get update -qq && sudo apt-get install -y -qq caddy >/dev/null
fi
sudo tee /etc/caddy/Caddyfile >/dev/null <<EOF
$DOMAIN {
    encode gzip
    header {
        Access-Control-Allow-Origin *
        Access-Control-Allow-Methods "GET, OPTIONS"
        Access-Control-Allow-Headers *
    }
    @options method OPTIONS
    respond @options 204
    reverse_proxy 127.0.0.1:8080
}
EOF
sudo systemctl reload caddy || sudo systemctl restart caddy

# Oracle Linux/Ubuntu images d'Oracle ont un pare-feu iptables local en plus du VCN
if command -v iptables >/dev/null; then
  sudo iptables -C INPUT -p tcp --dport 80  -j ACCEPT 2>/dev/null || sudo iptables -I INPUT 6 -p tcp --dport 80  -j ACCEPT
  sudo iptables -C INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null || sudo iptables -I INPUT 6 -p tcp --dport 443 -j ACCEPT
  command -v netfilter-persistent >/dev/null && sudo netfilter-persistent save >/dev/null || true
fi

echo
echo "============================================================"
echo "  MOTIS est en ligne : https://$DOMAIN"
echo "  Test : curl 'https://$DOMAIN/api/v1/geocode?text=massy'"
echo
echo "  Dans GitHub → Settings → Secrets and variables → Actions →"
echo "  Variables → New repository variable :"
echo "     MOTIS_URL = https://$DOMAIN"
echo "  puis relance le workflow Pages : la démo passera en mode réel."
echo "============================================================"
