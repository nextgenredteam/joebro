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

## "Tricks" to Extract/Capture Active Cloud Auth Tokens & Codes

To secure your login details, or if your Ayla account uses external login providers (like Facebook), you can bypass the standard email/password login form on the JoeBro PWA. The PWA includes a built-in interactive **Help & Instructions Guide** right on the login screen, supporting several authentication tricks:

### Method 1: The Facebook Redirect URL Trick
Because our custom client runs locally or on a different domain, it cannot automatically read the redirected URL from Facebook's authentication popup due to Cross-Origin Resource Sharing (CORS) rules.
1. In the JoeBro login page, click **Login with Facebook**.
2. This opens the Ayla Facebook OAuth page in a new browser tab (so the address bar is fully visible).
3. Complete the login details on Facebook's page.
4. Facebook will redirect you to a blank/expired page whose URL starts with:
   `https://mobile.aylanetworks.com/?code=AUTHORIZATION_CODE`
5. **Copy the entire URL** from the browser's address bar.
6. Return to JoeBro, paste the URL into the **Facebook Code / Redirect URL** box, and click **Complete Login**. The PWA will automatically extract the code and complete the authentication.

### Method 2: Generate Token via API Command Line (CLI Trick)
If you do not want to submit your password directly through the web UI, you can query Ayla's authentication server directly from your machine's terminal to receive the token.

#### Windows (PowerShell):
```powershell
$body = @{
    user = @{
        email = 'YOUR_EMAIL'
        password = 'YOUR_PASSWORD'
        application = @{
            app_id = 'sobro-ag-id'
            app_secret = 'sobro-mDM8M4JEe7IJFwiKvbs956XqX_s'
        }
    }
}
$res = Invoke-RestMethod -Uri "https://user-field.aylanetworks.com/users/sign_in.json" -Method Post -Body ($body | ConvertTo-Json) -ContentType "application/json"
$res.access_token
```

#### macOS / Linux / WSL (curl):
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"user":{"email":"YOUR_EMAIL","password":"YOUR_PASSWORD","application":{"app_id":"sobro-ag-id","app_secret":"sobro-mDM8M4JEe7IJFwiKvbs956XqX_s"}}}' \
  https://user-field.aylanetworks.com/users/sign_in.json | grep -o '"access_token":"[^"]*' | grep -o '[^"]*$'
```
*Replace `YOUR_EMAIL` and `YOUR_PASSWORD` in the commands above. Run the command, copy the output token, click **Use Existing Auth Token** in the JoeBro PWA, paste it, and log in.*

### Method 3: Browser DevTools Token Sniffing (No Tools Required)
If you are already logged in to Ayla's official platform (like the developer dashboard or account management panel) on your browser:
1. Press `F12` or right-click anywhere and select **Inspect** to open Browser Developer Tools.
2. Navigate to the **Network** tab.
3. Keep the DevTools open and refresh the page or perform an action (like loading your devices list).
4. In the filter box, type `aylanetworks` or `devices.json`.
5. Select any matching network request and look at the **Request Headers**.
6. Find the `Authorization` header. It will look like:
   `Authorization: auth_token MC1_8f0e0d0c...`
7. Copy the entire token string following `auth_token ` (starting with `MC1_`).
8. Paste this token into the **Ayla Auth Token** field in JoeBro's token login screen.

### Method 4: Intercepting App Traffic (HTTP Toolkit / Mitmproxy)
If you want to capture the token being used by the official Sobro mobile app on your phone:
1. Run **HTTP Toolkit** on your computer.
2. Set your smartphone's Wi-Fi proxy settings to route traffic through your computer's IP address and port `8000`.
3. Install the HTTP Toolkit SSL CA Certificate on your phone.
4. Launch the official **Sobro** app on your mobile device.
5. In HTTP Toolkit, inspect requests containing `aylanetworks.com`.
6. Inspect the headers of requests to `https://ads-field.aylanetworks.com/apiv1/devices.json`.
7. Locate and copy the token following `Authorization: auth_token ` and input it into JoeBro's token login.

