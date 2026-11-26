#!/usr/bin/env bash
# =====================================================================
#  NWLradio — server di trasmissione (Icecast + https automatico)
#  Per Ubuntu 22.04 / 24.04 (es. Oracle Cloud "Always Free").
#
#  Uso:   curl -fsSL https://edicola.grandangoloregionale.it/suite/radio/nwlradio-server.sh | sudo bash
#  Con un tuo dominio (consigliato, es. radio.miosito.it già puntato all'IP del server):
#         curl -fsSL https://edicola.grandangoloregionale.it/suite/radio/nwlradio-server.sh | sudo bash -s radio.miosito.it
#  Punto di montaggio diverso da /live:   ... | sudo MOUNT=/grandangolo bash
# =====================================================================
set -euo pipefail
if [ "$(id -u)" != "0" ]; then echo "Lancialo con sudo."; exit 1; fi
export DEBIAN_FRONTEND=noninteractive
# un server appena creato fa da solo gli aggiornamenti: aspetto che finisca invece di fallire
APTW="-o DPkg::Lock::Timeout=900"
MOUNT="${MOUNT:-/live}"; MOUNT="/${MOUNT#/}"
echo "== NWLradio: preparo il server =="

IP="$(curl -fsS4 https://api.ipify.org || curl -fsS4 https://ifconfig.me || true)"
[ -n "$IP" ] || { echo "Non riesco a scoprire l'indirizzo pubblico del server."; exit 1; }
DOMAIN="${1:-${IP//./-}.sslip.io}"
echo "Indirizzo pubblico: $IP"
echo "Nome per l'https:   $DOMAIN"

# --- programmi ---
apt-get $APTW update -q
apt-get $APTW install -y -q icecast2 curl gnupg debian-keyring debian-archive-keyring apt-transport-https iptables-persistent openssl >/dev/null
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get $APTW update -q && apt-get $APTW install -y -q caddy >/dev/null
fi

# --- password (nuove a ogni installazione, salvate in /root/nwlradio-server.txt) ---
if [ -f /root/nwlradio-server.txt ] && grep -q '^PASSWORD=' /root/nwlradio-server.txt; then
  SRC_PASS="$(grep '^PASSWORD=' /root/nwlradio-server.txt | cut -d= -f2-)"; ADM_PASS="$(grep '^ADMIN=' /root/nwlradio-server.txt | cut -d= -f2-)"
else
  SRC_PASS="$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 20)"; ADM_PASS="$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 20)"
fi

# --- Icecast ---
cat > /etc/icecast2/icecast.xml <<EOF
<icecast>
  <location>Italia</location>
  <admin>radio@${DOMAIN}</admin>
  <limits>
    <clients>500</clients><sources>4</sources>
    <queue-size>524288</queue-size><client-timeout>30</client-timeout><header-timeout>15</header-timeout>
    <source-timeout>15</source-timeout><burst-on-connect>1</burst-on-connect><burst-size>65535</burst-size>
  </limits>
  <authentication>
    <source-password>${SRC_PASS}</source-password>
    <relay-password>${ADM_PASS}</relay-password>
    <admin-user>admin</admin-user><admin-password>${ADM_PASS}</admin-password>
  </authentication>
  <hostname>${DOMAIN}</hostname>
  <listen-socket><port>8000</port></listen-socket>
  <http-headers><header name="Access-Control-Allow-Origin" value="*" /></http-headers>
  <fileserve>1</fileserve>
  <paths>
    <basedir>/usr/share/icecast2</basedir><logdir>/var/log/icecast2</logdir>
    <webroot>/usr/share/icecast2/web</webroot><adminroot>/usr/share/icecast2/admin</adminroot>
    <alias source="/" destination="/status.xsl"/>
  </paths>
  <logging><accesslog>access.log</accesslog><errorlog>error.log</errorlog><loglevel>2</loglevel><logsize>10000</logsize></logging>
  <security><chroot>0</chroot></security>
</icecast>
EOF
chown icecast2:icecast /etc/icecast2/icecast.xml 2>/dev/null || true
[ -f /etc/default/icecast2 ] && sed -i 's/^ENABLE=.*/ENABLE=true/' /etc/default/icecast2 || true
systemctl enable icecast2 >/dev/null 2>&1 || true
systemctl restart icecast2

# --- https per le radio (Caddy: certificato automatico e rinnovato da solo) ---
cat > /etc/caddy/Caddyfile <<EOF
${DOMAIN} {
  reverse_proxy 127.0.0.1:8000 {
    flush_interval -1
  }
}
EOF
systemctl enable caddy >/dev/null 2>&1 || true
systemctl restart caddy

# --- firewall del server (le immagini Ubuntu di Oracle bloccano tutto tranne SSH) ---
for P in 80 443 8000; do
  if ! iptables -C INPUT -p tcp --dport "$P" -j ACCEPT 2>/dev/null; then
    POS="$(iptables -L INPUT --line-numbers -n | awk '/REJECT/{print $1; exit}')"
    if [ -n "$POS" ]; then iptables -I INPUT "$POS" -p tcp --dport "$P" -j ACCEPT; else iptables -A INPUT -p tcp --dport "$P" -j ACCEPT; fi
  fi
done
netfilter-persistent save >/dev/null 2>&1 || true
command -v ufw >/dev/null && ufw status | grep -q active && { ufw allow 80/tcp; ufw allow 443/tcp; ufw allow 8000/tcp; } >/dev/null || true

cat > /root/nwlradio-server.txt <<EOF
INDIRIZZO=${DOMAIN}
IP=${IP}
PORTA=8000
MONTAGGIO=${MOUNT}
UTENTE=source
PASSWORD=${SRC_PASS}
ADMIN=${ADM_PASS}
LINK=https://${DOMAIN}${MOUNT}
EOF
chmod 600 /root/nwlradio-server.txt

sleep 3
CERT="in preparazione"; curl -fsS -m 20 -o /dev/null "https://${DOMAIN}/status-json.xsl" && CERT="pronto"
echo
echo "=================================================================="
echo "  SERVER PRONTO"
echo "=================================================================="
echo "  In NWLradio, pulsante ⚙ Server, scrivi:"
echo "    Indirizzo del server:      ${DOMAIN}"
echo "    Porta:                     8000"
echo "    Punto di montaggio:        ${MOUNT}"
echo "    Utente:                    source"
echo "    Password di trasmissione:  ${SRC_PASS}"
echo "    Connessione cifrata:       NO (lascia la casella vuota)"
echo "    Link per le radio:         https://${DOMAIN}${MOUNT}"
echo
echo "  LINK DA DARE ALLE RADIO FM:  https://${DOMAIN}${MOUNT}"
echo "  (funziona quando sei in onda; certificato https: ${CERT})"
echo
echo "  Pannello del server: https://${DOMAIN}/admin/  utente admin  password ${ADM_PASS}"
echo "  Questi dati sono salvati in /root/nwlradio-server.txt (sudo cat /root/nwlradio-server.txt)"
echo "  Ricorda: nella console di Oracle apri le porte 80, 443 e 8000 (vedi la guida)."
echo "=================================================================="
