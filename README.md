# JoeBro & Sobro IoT Rescue Stack
```
      _            ____             
     | | ___   ___| __ ) _ __ ___   
  _  | |/ _ \ / _ \  _ \| '__/ _ \  
 | |_| | (_) |  __/ |_) | | | (_) | 
  \___/ \___/ \___|____/|_|  \___/  
```
**A Unified Framework to Reclaim and Control the Sobro Smart Coffee Table**

This repository contains the source code, reverse-engineered research, provisioning scripts, and offline mock infrastructure to rescue the **Sobro Smart Coffee Table** (formerly manufactured by StoreBound, now abandoned) and migrate it to the open-source **JoeBro Stack**.

The official Sobro mobile app is abandoned and crashes on modern Android and iOS devices. Because the table's local network communication protocol uses proprietary device-specific AES encryption, direct local network communication is locked out. This project bypasses the broken official app by communicating directly with the Ayla Networks Cloud API using a standalone, client-side **Progressive Web App (PWA)**, and provides a local mock server to future-proof the table against cloud shutdowns.

---

## 📂 Repository Structure

- `tools/joebro/` - The core **JoeBro Web Controller** (standalone PWA: HTML5, CSS, vanilla JS)
  - [index.html](file:///f:/OneDrive/SoBroExploit/tools/joebro/index.html) - Dashboard interface
  - [app.js](file:///f:/OneDrive/SoBroExploit/tools/joebro/app.js) - Client API handling and register packing
  - [style.css](file:///f:/OneDrive/SoBroExploit/tools/joebro/style.css) - Responsive styling
  - [provision.ps1](file:///f:/OneDrive/SoBroExploit/tools/joebro/provision.ps1) - Automated 2-step setup script (Windows)
  - [provision.sh](file:///f:/OneDrive/SoBroExploit/tools/joebro/provision.sh) - Step 1 provisioning script (Mac/Linux)
- `mock-api/` - Docker-based local server infrastructure to replace Ayla Cloud for offline control
  - [server.js](file:///f:/OneDrive/SoBroExploit/mock-api/server.js) - Mock Express.js API matching real Ayla endpoints
  - [docker-compose.yml](file:///f:/OneDrive/SoBroExploit/mock-api/docker-compose.yml) - Local Pi-hole and Node API stack
- `AylaConnector.ps1` - Helper script to push Wi-Fi credentials to the table
- `AylaDumper.ps1` - Diagnostic script to dump device status from the table's AP mode
- `REGISTER_TABLE.md` - Technical walkthrough of table registration and API sniffing
- `deploy_guide.md` - Deployment instructions for Cloudflare Pages or GitHub Pages

---

## ⚡ System Architecture

```mermaid
flowchart TD
    subgraph Mode 1: Cloud Control (Ayla Networks)
        A[JoeBro PWA client] -- HTTP REST --> B[Ayla Networks Cloud API]
        B -- Cloud MQTT/REST Connection --> C[Sobro Smart Table]
    end

    subgraph Mode 2: Offline Control (Mock Local Server)
        D[JoeBro PWA client] -- Spoofed DNS --> E[Mock API Server - Node.js Docker]
        C -- Spoofed DNS --> E
        E -- Local Broadcast --> C
    end

    subgraph Provisioning (AP Mode)
        F[Local PC] -- Local 192.168.0.1 Connection --> G[Sobro AP: Sobro_XXXX]
        F -- Injects Wi-Fi & Setup Token --> G
    end
```

---

## ⚠️ Wi-Fi Chip Network Constraints (CRITICAL)

The internal Wi-Fi microcontroller on the Sobro table is legacy hardware and has strict network constraints. **Failing to meet these constraints will cause the Wi-Fi chip to crash, fail to connect, or continuously reset back into AP mode:**

1. **2.4 GHz Band Only:** The table does not support 5 GHz networks. Ensure your Wi-Fi router broadcasts a dedicated 2.4 GHz SSID.
2. **WPA2-Personal (AES) Security Only:** You **MUST** use WPA2-Personal (AES) security. **Do not use WPA3 or WPA2/WPA3 Mixed mode.** If the table detects a WPA3 transition element in the beacon, the chip will fail, crash, and revert to AP hotspot mode.

---

## 🚀 Step-by-Step Provisioning Guide

If you change your Wi-Fi credentials or get a new table, you must provision it to your network. Because the official app is broken, use the following procedure:

### 1. Enter AP Mode
- Press and hold the physical power button on the back/underside of the Sobro table until the table beeps and the front sensor lights flash.
- The table will now broadcast an unsecured Wi-Fi hotspot named **`Sobro_XXXX`** (where `XXXX` represents part of the MAC address).

### 2. Connect Your Computer
- Open your computer's Wi-Fi menu and connect directly to the **`Sobro_XXXX`** network. (It is unsecured, so no password is required).

### 3. Run the Provisioning Script
Navigate to the repository folder and run the provisioning script:

#### Windows PowerShell:
```powershell
.\tools\joebro\provision.ps1
```
*(The script will guide you through entering your home Wi-Fi SSID, Password, and your Ayla Cloud account email/password. It will automatically handle Step 1 Wi-Fi connection and Step 2 Cloud binding).*

#### Mac / Linux Bash:
```bash
chmod +x ./tools/joebro/provision.sh
./tools/joebro/provision.sh
```
*(The bash script handles Step 1 Wi-Fi credentials injection. Once the table connects, you must perform Step 2 Cloud binding manually or via the JoeBro dashboard).*

#### Fallback Manual Injection (Web Browser):
If scripts are blocked, you can send the parameters manually:
1. While connected to `Sobro_XXXX`, get the registration token:
   ```
   http://192.168.0.1/regtoken.json
   ```
   Save the 8-digit `"regtoken"` returned in the JSON. If it fails, generate a random 8-digit number (e.g. `87654321`) to use as your fallback `setup_token`.
2. Push your Wi-Fi credentials to the table:
   ```
   http://192.168.0.1/wifi_connect.json?ssid=YOUR_HOME_SSID&key=YOUR_HOME_PASSWORD&setup_token=YOUR_TOKEN
   ```
3. The table will beep and reboot to join your network.

---

## 🔒 Ayla Cloud Account Binding (Step 2)

Once the table has rebooted and joined your home Wi-Fi network, reconnect your computer to your home Wi-Fi network to gain internet access.

### Method A: JoeBro Controller UI (Easiest)
1. Open `tools/joebro/index.html` in your web browser.
2. Sign in with your Ayla Cloud credentials (or bypass token).
3. On the top right of the dashboard, click **➕ Bind Table**.
4. Paste the `regtoken` or fallback `setup_token` you captured during provisioning and click **Register Device**.

### Method B: Manual API Curl Request
If you want to bind the table directly using command-line tools:
```bash
curl -X POST \
  -H "Authorization: auth_token YOUR_AYLA_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"device": {"regtoken": "YOUR_CAPTURED_REGTOKEN"}}' \
  "https://ads-field.aylanetworks.com/apiv1/devices.json"
```

---

## 🕵️ Bypassing Login via Cloud Auth Token Sniffing

If you do not want to enter your Ayla username and password into the JoeBro login page, you can intercept the active session token from your smartphone while using the official app:

### HTTP Toolkit (Desktop Proxy)
1. Run [HTTP Toolkit](https://httptoolkit.com/) on your computer.
2. Configure your mobile phone's Wi-Fi network proxy to route through your computer's IP address and port `8000`. Install the HTTP Toolkit CA SSL Certificate on your phone.
3. Open the official **Sobro** app on your phone.
4. Filter HTTP Toolkit traffic for requests containing `aylanetworks.com`.
5. Open any request to `https://ads-field.aylanetworks.com/apiv1/devices.json` and inspect the headers.
6. Copy the token string following `Authorization: auth_token ` (e.g., `MC1_8f0e0d0c...`).
7. In the JoeBro login interface, click **Use Existing Auth Token**, paste the token, and authenticate.

---

## 📊 Reverse-Engineered Property Map (Ayla Registers)

The JoeBro app controls the table's hardware features by sending values to specific registers (properties) on Ayla's servers:

| Property Name | Data Type | Range / Format | Description |
| :--- | :--- | :--- | :--- |
| `Cooling_switch` | Boolean | `0` (Off) / `1` (On) | Mini-fridge compressor toggle. |
| `Drawer_lock` | Boolean | `0` (Unlocked) / `1` (Locked) | Electronic locking mechanism for drawers. |
| `F_key` | Boolean | `0` (Off) / `1` (On) | Front motion-sensor light strip toggle. |
| `B_key` | Boolean | `0` (Off) / `1` (On) | Back RGB LED accent lighting toggle. |
| `ble_switch` | Boolean | `0` (Off) / `1` (On) | Forces the Bluetooth speakers into pairing mode. |
| `brightness` | Integer | `0` to `100` | Accent backlight brightness percentage. |
| `flight_status` | String | `Mode:Brightness:Duration:Temperature` | Front motion light parameters (e.g., `5:100:30:4000` = Mode 5, 100% Brightness, 30s duration, 4000K warm white). |
| `mode_status` | Integer | 31-bit Packed Integer | Packs back RGB colors and modes using bitwise packing. |

### 🎨 RGB Color Packing Details (`mode_status`)
The Sobro hardware packs the RGB color values into a single 31-bit integer. The structure expects Green, Blue, and Red (in that order) left-aligned, followed by 7 trailing bits reserved for light mode scenes (set to zero for static colors).

#### Javascript packing code:
```javascript
// Function to pack RGB hex to Sobro mode_status integer
function packRgb(hexColor) {
    // hexColor format: "RRGGBB" (e.g., "00FFFF" for Cyan)
    const rBin = parseInt(hexColor.substring(0, 2), 16).toString(2).padStart(8, '0');
    const gBin = parseInt(hexColor.substring(2, 4), 16).toString(2).padStart(8, '0');
    const bBin = parseInt(hexColor.substring(4, 6), 16).toString(2).padStart(8, '0');
    
    // Sobro expects: Green(8 bits) + Blue(8 bits) + Red(8 bits) + Zeros(7 bits)
    const binaryStr = gBin + bBin + rBin + "0000000";
    return parseInt(binaryStr, 2);
}

// Function to unpack Sobro mode_status integer back to Hex
function unpackRgb(modeStatusInt) {
    const binStr = Number(modeStatusInt).toString(2).padStart(31, '0');
    
    const gHex = parseInt(binStr.substring(0, 8), 2).toString(16).padStart(2, '0');
    const bHex = parseInt(binStr.substring(8, 16), 2).toString(16).padStart(2, '0');
    const rHex = parseInt(binStr.substring(16, 24), 2).toString(16).padStart(2, '0');
    
    return `#${rHex}${gHex}${bHex}`;
}
```

---

## 🌐 Offline Future-Proofing: Local Mock API

If Ayla Networks ever shuts down their servers, the Sobro table will lose all cloud connectivity. To future-proof the table, the `mock-api` directory contains a Node.js server that replicates Ayla's APIs locally.

### How to Run:
1. Navigate to the `mock-api/` directory:
   ```bash
   cd mock-api
   ```
2. Start the DNS sinkhole (Pi-hole) and mock API server:
   ```bash
   docker-compose up -d
   ```
3. Configure your local network router or DNS server to redirect requests for Ayla's domains to your local Docker host IP:
   - `user-field.aylanetworks.com` -> `YOUR_DOCKER_HOST_IP`
   - `ads-field.aylanetworks.com` -> `YOUR_DOCKER_HOST_IP`
4. The local Express server will listen on HTTPS port `443` and return the exact JSON payloads the table expects, redirecting all commands offline.

*Note: In production or exposed environments, you should change the default Pi-hole web dashboard password (`WEBPASSWORD: "joebro_admin"`) inside `docker-compose.yml` to a secure value.*

---

## 🛠️ Deployment and Local Run

The NextGenRedTeam website and JoeBro PWA are built as standard static files with a Node.js-based static compiler for blog articles.

### Build and Run Locally
1. Install dependencies:
   ```bash
   npm install
   ```
2. Compile the static site and blog posts:
   ```bash
   npm run build
   ```
3. Run the development web server:
   ```bash
   npm run dev
   ```

### Deploy to Cloudflare Pages (Recommended)
1. Push your repository to GitHub.
2. Log into the Cloudflare Dashboard and navigate to **Workers & Pages**.
3. Create a project, connect your GitHub repository, and select:
   - **Framework preset:** None (Static site)
   - **Build command:** `npm run build`
   - **Build output directory:** `./`
4. Deploy! Cloudflare will compile and host the controller securely for free.

---

## 📄 License
This project is licensed under the MIT License. Contributions to expand offline firmware capability are welcome.
