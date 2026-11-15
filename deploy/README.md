# Héberger MOTIS gratuitement sur Oracle Cloud (Always Free)

Oracle Cloud offre à vie une machine ARM **Ampere A1** jusqu'à 4 OCPU / 24 Go de RAM / 200 Go de
disque. C'est largement suffisant pour MOTIS sur l'Île-de-France, et ça ne coûte rien.
(Une carte bancaire est demandée à l'inscription pour vérification, mais le palier *Always Free*
n'est jamais facturé tant que tu restes dans ses limites.)

## 1. Créer le compte et la machine (≈ 15 min)

1. Inscris-toi sur https://www.oracle.com/cloud/free/ — choisis une *home region* en Europe
   (Paris `eu-paris-1`, Marseille `eu-marseille-1` ou Francfort `eu-frankfurt-1`).
2. Menu ☰ → **Compute → Instances → Create instance**.
3. **Image and shape** → *Change shape* → **Ampere** → `VM.Standard.A1.Flex`
   → **4 OCPU, 24 Go** (c'est le maximum gratuit).
   Image : **Ubuntu 24.04** (variante *aarch64*).
4. **Networking** : laisse le VCN par défaut, coche *Assign a public IPv4 address*.
5. **SSH keys** : télécharge la clé privée proposée (ou colle ta clé publique).
6. **Boot volume** : 100 Go (gratuit jusqu'à 200 Go cumulés).
7. *Create*. Note l'**adresse IP publique** affichée une fois l'instance *Running*.

> Si tu obtiens « Out of capacity » pour la forme A1, c'est fréquent : réessaie à un autre moment
> de la journée ou avec 2 OCPU / 12 Go (suffisant aussi), puis agrandis plus tard.

## 2. Ouvrir les ports 80 et 443

Menu ☰ → **Networking → Virtual cloud networks** → ton VCN → *Subnet* → *Default Security List*
→ **Add Ingress Rules** :

| Source CIDR | Protocol | Dest. port |
|---|---|---|
| 0.0.0.0/0 | TCP | 80 |
| 0.0.0.0/0 | TCP | 443 |

## 3. Installer MOTIS (≈ 30-45 min, tout est automatique)

```bash
ssh -i ta-cle.key ubuntu@IP_PUBLIQUE
curl -fsSL https://raw.githubusercontent.com/Anonyme4321/mynav/main/deploy/setup-server.sh | bash
```

Le script :
- installe le binaire MOTIS (ARM ou x86 détecté automatiquement),
- télécharge OSM Île-de-France + GTFS Île-de-France Mobilités + SNCF,
- génère la configuration, lance l'import (la partie longue),
- crée un service `systemd` (redémarrage automatique),
- installe **Caddy** qui fournit le **HTTPS automatique** sur `https://<ip-avec-tirets>.sslip.io`
  (indispensable : la démo GitHub Pages est en HTTPS et ne peut appeler qu'une API HTTPS).

À la fin il affiche l'URL de l'API, par exemple `https://141-145-1-2.sslip.io`.

Avec un vrai nom de domaine : `DOMAIN=motis.mondomaine.fr bash setup-server.sh`
(après avoir créé l'enregistrement DNS A vers l'IP).

## 4. Brancher la démo en ligne

GitHub → ton dépôt → **Settings → Secrets and variables → Actions → Variables →
New repository variable** :

- Name : `MOTIS_URL`
- Value : `https://141-145-1-2.sslip.io` (ton URL)

Puis **Actions → Deploy to GitHub Pages → Run workflow**. L'app passe en mode réel :
vraies rues, vrais rails, vrais horaires, vrais parkings relais.

## Exploitation

```bash
sudo systemctl status motis        # état
sudo journalctl -u motis -f        # logs
sudo systemctl restart motis
```

**Mettre à jour les horaires** (les GTFS changent toutes les quelques semaines) :

```bash
cd /opt/motis && rm -f idfm-gtfs.zip sncf-voyages-gtfs.zip data/.import-done && rm -rf data
bash ~/setup-server.sh            # re-télécharge, ré-importe, redémarre
```

À automatiser plus tard avec un `cron` hebdomadaire.

## Coût et limites

- Oracle Always Free : 0 €. Si la machine reste inactive plusieurs jours, Oracle peut la
  récupérer sur les comptes gratuits non vérifiés ; un appel régulier (le workflow Pages, ou un
  `cron` qui interroge l'API) suffit à la garder active.
- Pour la France entière : OSM `france-latest.osm.pbf` (~4 Go) + GTFS de chaque région ; compte
  16-24 Go de RAM à l'import, c'est encore dans la limite A1.
