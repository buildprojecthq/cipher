#!/bin/bash

# CIPHER: Cloud C2 Startup Script (The Attacker)
# Run this on your Cloud VM or Laptop

echo "===================================================="
echo "       🔥 CIPHER: Cloud C2 (Attacker) 🔥            "
echo "===================================================="

echo "[+] Starting Cloud C2 Server..."

# Load root .env file if present
if [ -f ".env" ]; then
    echo "[*] Loading environment variables from .env..."
    set -a
    source .env
    set +a
fi

# 1. Build Dashboard if dist is missing
if [ ! -d "cloud_c2/dashboard/dist" ]; then
    echo "[*] C2 Dashboard build not found. Building now..."
    cd cloud_c2/dashboard && npm install && npm run build
    if [ $? -ne 0 ]; then
        echo "[!] ERROR: Cloud C2 Dashboard build failed."
        exit 1
    fi
    cd ../..
fi

# Double check dist exists
if [ ! -d "cloud_c2/dashboard/dist" ]; then
    echo "[!] ERROR: 'cloud_c2/dashboard/dist' folder is missing. Build failed."
    exit 1
fi

# 2. Start Node Server
cd cloud_c2

# Clear uploads folder for a fresh session
if [ -d "uploads" ]; then
    echo "[*] Clearing previous exfiltrated images..."
    rm -rf uploads/*
else
    mkdir -p uploads
fi

echo "[*] Running npm install..."
npm install --silent
echo ""
echo "----------------------------------------------------"
echo "🚀 CLOUD C2 IS LIVE AT: http://$(curl -s ifconfig.me):5000"
echo "----------------------------------------------------"
echo ""
node server.js
