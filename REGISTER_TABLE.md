# Sobro Smart Table Registration & Token Extraction Guide

This guide explains how to provision, register, and bind your Sobro Smart Table to your Ayla Networks Cloud account, as well as how to capture authentication tokens using "tricks" (traffic sniffing) to bypass standard login forms.

---

## Architecture Overview

```
 +------------------+                +-----------------------+
 |                  |  Local Wi-Fi   |  Sobro Smart Table    |
 |  Local Computer  | -------------> |  (IP: 192.168.0.1)    |
 |  or Smartphone   |                |  Hosts AP: Sobro_XXXX |
 +------------------+                +-----------------------+
          |
     Home | (Once Connected
    Wi-Fi |  to Internet)
          v
 +-----------------------+
 |  Ayla Cloud Servers   |
 |  (aylanetworks.com)   |
 +-----------------------+
```

1. **AP Mode:** When the Sobro table is unregistered or loses connection, it broadcasts a temporary unencrypted Wi-Fi access point (e.g. `Sobro_XXXX`). Its internal HTTP configuration page is hosted at `http://192.168.0.1`.
2. **Provisioning:** You send your home 2.4GHz Wi-Fi credentials to the table over this local hotspot.
3. **Token Fetching:** The table generates a temporary `regtoken` which you extract.
4. **Cloud Binding:** Once the table joins your home Wi-Fi and connects to Ayla Cloud, you associate the extracted token with your Ayla account.

---

## Step 1: Provisioning Wi-Fi to the Table

1. Turn on the Sobro Table and wait for it to beep (indicating the Wi-Fi AP hotspot `Sobro_XXXX` is broadcasting).
2. Connect your computer or smartphone to the **`Sobro_XXXX`** Wi-Fi network.
3. Open a terminal or shell in the workspace and execute one of the provisioning scripts, or send the payload manually:
   * **Using Bash (Recommended for Linux/macOS/WSL):**
     ```bash
     ./provision.sh
     ```
     *(Enter your home Wi-Fi SSID and password when prompted)*
   * **Using PowerShell (Recommended for Windows):**
     ```powershell
     .\provision.ps1
     ```
     *(Enter Wi-Fi SSID, Password, and your Ayla/Sobro Cloud credentials)*
   * **Manual URL Invitation:**
     Open your browser and navigate to:
     ```
     http://192.168.0.1/wifi_connect.json?ssid=YOUR_HOME_SSID&key=YOUR_HOME_PASSWORD
     ```
4. **Result:** The table will beep and shut down its temporary Wi-Fi hotspot as it connects to your home network.

---

## Step 2: Fetching the Registration Token (`regtoken`)

While connected to the table's `Sobro_XXXX` AP hotspot, you must capture the registration token. The provisioning scripts attempt to do this automatically.
* **Manual Retrieval:**
  Before sending Wi-Fi credentials, open your browser and go to:
  ```
  http://192.168.0.1/regtoken.json
  ```
  It will return a JSON object containing the registration token:
  ```json
  {"regtoken": "12345678"}
  ```
* **Fallback setup token:**
  If the `regtoken` fails to load, generate a random 8-digit number (e.g. `87654321`) and pass it as the `setup_token` parameter during provisioning.

---

## Step 3: Account Binding (Registering the Table)

Once the table has rebooted and connected to your home router, reconnect your computer to your home Wi-Fi network.

* **Method A: JoeBro Controller UI (Easiest)**
  1. Open the JoeBro Web Controller (hosted at `http://localhost:8080`).
  2. Log in using your Ayla Cloud username/password, Facebook login, or a bypassed Auth Token.
  3. On the top right of the dashboard, click **➕ Bind Table**.
  4. Paste the `regtoken` (or fallback token) captured in Step 2, and click **Register Device**.
  5. The table will appear in your device list dropdown.

* **Method B: Manual API curl**
  Exchange the token directly with Ayla ADS endpoints using the active session token:
  ```bash
  curl -X POST \
    -H "Authorization: auth_token YOUR_AYLA_SESSION_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"device": {"regtoken": "YOUR_EXTRACTED_REGTOKEN"}}' \
    "https://ads-field.aylanetworks.com/apiv1/devices.json"
  ```

---

## "Tricks" to Extract/Capture Active Cloud Auth Tokens

If you don't want to enter your email and password on the JoeBro login page, you can sniff the Ayla Cloud authentication token directly from your smartphone while using the official Sobro app.

### Method 1: Using HTTP Toolkit (Desktop Proxy)
1. Download [HTTP Toolkit](https://httptoolkit.com/).
2. Run HTTP Toolkit on your computer.
3. Configure your phone's Wi-Fi connection proxy settings to point to your computer's IP address and the HTTP Toolkit port (typically `8000`).
4. Install the HTTP Toolkit SSL CA Certificate on your phone to inspect HTTPS.
5. Open the official **Sobro** app on your phone.
6. Look at the HTTP Toolkit requests logs. Search for traffic containing `aylanetworks.com`.
7. Inspect the headers of any request to `https://ads-field.aylanetworks.com/apiv1/devices.json`.
8. Locate the `Authorization` header. It will look like:
   ```
   Authorization: auth_token MC1_8f0e0d0c0b0a090807060504030201...
   ```
9. Copy the long token string (everything after `auth_token `).
10. In JoeBro, click **Use Existing Auth Token**, paste the token, and click **Authenticate**.

### Method 2: Mitmproxy (CLI Alternative)
If you prefer command-line tools:
1. Run `mitmproxy` or `mitmweb`.
2. Configure your phone proxy to route through the mitmproxy instance.
3. Filter requests with `~u aylanetworks`.
4. Capture the `access_token` parameter from the JSON body of the response to `https://user-field.aylanetworks.com/users/sign_in.json`.
