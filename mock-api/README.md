# JoeBro Mock API (Cloud Rescue Server)

This directory contains the self-contained Docker infrastructure to run a local replacement of the Ayla Networks Cloud API. This allows you to control your Sobro Smart Table offline, bypassing public cloud dependence entirely.

---

## ⚡ The Solution: DNS Sinkhole & Local Emulator

When the Ayla Cloud is bypassed or unavailable, the table must be tricked into talking to your local server instead of the public cloud.

1. **DNS Spoofing (Pi-hole/Router):** Intercept DNS requests for `user-field.aylanetworks.com` and `ads-field.aylanetworks.com` and resolve them to the local IP address of your Docker host machine.
2. **Express.js API Server:** Serves as the mock server, handling authentication and property synchronization endpoints.
3. **PWA static files server:** The Node server automatically hosts the JoeBro Web Controller interface, making it accessible at `http://localhost:8080` or `https://localhost` (or from your local network IP).

---

## ⚠️ Host-Level Provisioning vs. Docker (IMPORTANT)

> [!WARNING]
> **Provisioning scripts MUST be run directly on the host computer, NOT inside Docker.**
> Docker containers are run in isolated bridge networks and do not have access to the physical Wi-Fi card of your computer. Because you must physically connect your computer's Wi-Fi network adapter to the table's `Sobro_XXXX` access point hotspot, you must execute `provision.ps1` (Windows) or `provision.sh` (Mac/Linux) directly on your host operating system.

---

## 📡 Wi-Fi Transition Caveat (Internet Disconnection)

> [!IMPORTANT]
> **Connecting to the table's hotspot will temporarily disconnect you from the internet.**
> When you put the table into Access Point mode (flashing front lights) and join the `Sobro_XXXX` Wi-Fi network:
> 1. **No Internet Access:** Your computer will lose connection to your home Wi-Fi and the internet. All network operations outside the local table gateway (`192.168.0.1`) will fail.
> 2. **One-Shot Handshake:** The provisioning script is designed to handle this transition in a clean, multi-step flow.
>    - **Step 1:** While connected to `Sobro_XXXX`, the script injects your home Wi-Fi SSID and Password directly into the table's server.
>    - **Wait/Transition:** The table will shut down its hotspot.
>    - **Step 2:** The script will pause and prompt you to **reconnect your computer back to your home Wi-Fi network**. Once you reconnect, press any key to allow the script to make internet cloud requests to bind the table DSN serial number to your account.

---

## 📦 How to Build and Run the Docker Stack

### Prerequisites
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) installed on your machine.

### Setup Instructions

1. **Configure credentials:**
   Rename `tools/joebro/config.example.json` to `tools/joebro/config.json` and enter your Ayla username/password if you want auto-login, or use token bypass.

2. **Build and start the services:**
   Open a terminal in the `mock-api/` directory and run:
   ```bash
   docker-compose up --build -d
   ```
   *Note: The `--build` flag compiles the Dockerfile, bundling both the static JoeBro controller frontend and the backend mock server into the image.*

3. **Verify the services:**
   - **Pi-hole admin panel:** Accessible at `http://localhost/admin` (password: `joebro_admin`).
   - **JoeBro PWA dashboard:** Accessible at `http://localhost:8080`.

4. **Change Default Passwords:**
   If you expose your Docker container or run it on a shared local network, change the `WEBPASSWORD: "joebro_admin"` parameter inside [docker-compose.yml](docker-compose.yml) to a secure string.
