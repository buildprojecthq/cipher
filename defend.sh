#!/bin/bash

# CIPHER: RPi Gateway Startup Script (The Defender)
# Run this on your Raspberry Pi

echo "===================================================="
echo "      🔥 CIPHER: Edge Gateway (Defender) 🔥         "
echo "===================================================="

echo "[+] Starting RPi Edge Gateway..."

# Load root .env file if present
if [ -f ".env" ]; then
    echo "[*] Loading environment variables from .env..."
    set -a
    source .env
    set +a
fi

HOTSPOT_SSID="${HOTSPOT_SSID:-Cipher_IoT_Net}"
HOTSPOT_PASSWORD="${HOTSPOT_PASSWORD:-cipher2024}"
HOTSPOT_IFACE="${IFACE:-wlan1}"

# 1. Ensure Hotspot is active on $HOTSPOT_IFACE
echo "[*] Verifying $HOTSPOT_SSID hotspot on $HOTSPOT_IFACE..."
if ! nmcli con show --active | grep -q "$HOTSPOT_IFACE"; then
    echo "[!] Hotspot not active on $HOTSPOT_IFACE. Attempting to start..."
    
    # Check if the connection profile already exists
    if ! nmcli con show "CipherHotspot" > /dev/null 2>&1; then
        echo "[*] Creating new hotspot profile: $HOTSPOT_SSID"
        sudo nmcli con add type wifi ifname "$HOTSPOT_IFACE" con-name CipherHotspot autoconnect yes ssid "$HOTSPOT_SSID"
        sudo nmcli con modify CipherHotspot 802-11-wireless.mode ap 802-11-wireless.band bg ipv4.method shared
        sudo nmcli con modify CipherHotspot wifi-sec.key-mgmt wpa-psk wifi-sec.psk "$HOTSPOT_PASSWORD"
    fi
    
    sudo nmcli con up CipherHotspot
    if [ $? -ne 0 ]; then
        echo "[!] ERROR: Failed to start hotspot on $HOTSPOT_IFACE."
        echo "[!] Please ensure the USB WiFi adapter is plugged in and supports AP mode."
        exit 1
    fi
    echo "[+] Hotspot active at 10.42.0.1"
else
    echo "[+] Hotspot already active on $HOTSPOT_IFACE."
fi

# 1b. Configure IP Forwarding & NAT Routing for IoT Subnet
echo "[*] Setting up IPv4 forwarding and NAT for 10.42.0.0/24..."
sudo sysctl -w net.ipv4.ip_forward=1 > /dev/null

# Detect upstream internet interface (wlan0, eth0, etc.)
UPSTREAM_IFACE=$(ip route get 8.8.8.8 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="dev") print $(i+1)}')
if [ -z "$UPSTREAM_IFACE" ] || [ "$UPSTREAM_IFACE" = "wlan1" ]; then
    UPSTREAM_IFACE="wlan0"
fi
echo "[+] Routing IoT traffic: wlan1 -> $UPSTREAM_IFACE (Internet)"

# Clear any stale DROP rules stuck from previous runs and set forwarding rules
sudo iptables -F FORWARD
sudo iptables -P FORWARD ACCEPT
sudo iptables -A FORWARD -i wlan1 -o "$UPSTREAM_IFACE" -j ACCEPT
sudo iptables -A FORWARD -i "$UPSTREAM_IFACE" -o wlan1 -m state --state RELATED,ESTABLISHED -j ACCEPT

# Enable NAT masquerade on upstream interface if not already present
if ! sudo iptables -t nat -C POSTROUTING -o "$UPSTREAM_IFACE" -j MASQUERADE 2>/dev/null; then
    sudo iptables -t nat -A POSTROUTING -o "$UPSTREAM_IFACE" -j MASQUERADE
fi

# 2. Build Dashboard if dist is missing
# Running as current user to preserve Node/NVM environment
if [ ! -d "rpi_dashboard/dist" ]; then
    echo "[*] RPi Dashboard build not found. Building now..."
    echo "[*] Increasing Node memory limit for Raspberry Pi..."
    cd rpi_dashboard && npm install && NODE_OPTIONS="--max-old-space-size=1024" npm run build
    
    if [ $? -ne 0 ]; then
        echo "[!] ERROR: Dashboard build failed (likely out of memory)."
        echo "[!] Try closing other apps or building on your laptop and copying the 'dist' folder."
        exit 1
    fi
    cd ..
fi

# Double check dist exists
if [ ! -d "rpi_dashboard/dist" ]; then
    echo "[!] ERROR: 'rpi_dashboard/dist' folder is missing. Build failed."
    exit 1
fi

# 2. Start ngrok in background
echo "[*] Exposing Gateway via ngrok tunnel..."
ngrok http 5000 > /dev/null 2>&1 &
NGROK_PID=$!

# Cleanup ngrok on exit
trap "echo '[!] Stopping ngrok...'; kill $NGROK_PID; exit" SIGINT SIGTERM

# Wait for ngrok to generate URL
echo "[*] Initializing tunnel..."
sleep 4

# Fetch Public URL from ngrok API
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*"' | head -n 1 | cut -d'"' -f4)

if [ -z "$NGROK_URL" ]; then
    echo "[!] Error: Could not fetch ngrok URL. Is ngrok installed and configured?"
else
    echo ""
    echo "----------------------------------------------------"
    echo "🚀 DASHBOARD IS LIVE AT: $NGROK_URL"
    echo "----------------------------------------------------"
    echo ""
fi

# 3. Start Python Gateway
cd rpi_gateway
if [ ! -d "venv" ]; then
    echo "[*] Setting up Python virtual environment..."
    python3 -m venv venv
    venv/bin/pip install -r requirements.txt
fi

echo "[*] Starting Scapy server (requires sudo)..."
export IFACE="$HOTSPOT_IFACE"
export NGROK_URL="$NGROK_URL"
sudo -E IFACE="$HOTSPOT_IFACE" NGROK_URL="$NGROK_URL" CLOUD_C2_URL="${CLOUD_C2_URL:-http://localhost:5000}" venv/bin/python server.py
