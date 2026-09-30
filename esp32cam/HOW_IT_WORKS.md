# How the ESP32-CAM Works (Simply Explained)

Think of the ESP32-CAM as a tiny, cheap computer with a built-in camera and Wi-Fi. In our project, it pretends to be a normal smart home device (like a smart doorbell or security camera), but it's actually a "swiss army knife" of malware that acts maliciously on command.

Here is what it does step-by-step:

### 1. Connecting to Wi-Fi
When you turn it on, it immediately connects to the Raspberry Pi's Wi-Fi hotspot (`Cipher_IoT_Net`).

### 2. The "Good Guy" Routine (Heartbeats)
To avoid looking suspicious, it sends a simple "I am alive" message (called a heartbeat) to the Raspberry Pi every 10 seconds. This is normal behavior for smart devices.

### 3. Waiting for Orders
While sending heartbeats, it secretly runs a tiny web server. It sits and waits for specific trigger signals from your Google Cloud VM. It has three distinct attack modes:

---

### Attack 1: The Spy (Data Exfiltration)
**Triggered by:** Clicking "Start Exfil" on your dashboard.
* **What it does:** It snaps high-quality photos and immediately uploads them over the internet directly to your Google Cloud server, repeating every half second.
* **Why it matters:** Simulates a massive privacy violation and data leak. The Raspberry Pi detects this by seeing a high outbound data rate to an unknown external server.

### Attack 2: The Botnet (DDoS UDP Flood)
**Triggered by:** Clicking "Start DDoS" on your dashboard.
* **What it does:** It stops acting like a camera entirely and starts firing thousands of garbage data packets at a target server (acting like a zombie in the Mirai botnet).
* **Why it matters:** It shows how smart devices are weaponized to take down internet infrastructure. The Raspberry Pi detects this by seeing a sudden, massive spike in the packet frequency graph.

### Attack 3: The Explorer (Local Port Scanning)
**Triggered by:** Clicking "Start Scan" on your dashboard.
* **What it does:** It starts rapidly probing every other IP address inside your house (`192.168.4.2`, `192.168.4.3`, etc.) to see if it can break into other devices.
* **Why it matters:** It demonstrates "lateral movement". The Raspberry Pi catches this by noticing the camera is trying to talk to way too many different devices in a short window of time.

---

### 4. Stopping
When you send the "Stop" signal, it immediately halts whatever attack it was running and goes back to being a "good guy", just sending its harmless 10-second heartbeats.
