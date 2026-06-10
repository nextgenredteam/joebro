param (
    [string]$Ssid = "YOUR_WIFI_SSID",
    [string]$Key = "YOUR_WIFI_PASSWORD"
)

Write-Host "[+] Waiting for Sobro AP (192.168.0.1) to become reachable for connection..."

# Loop until we can ping the gateway
while ($true) {
    if (Test-Connection -ComputerName 192.168.0.1 -Count 1 -Quiet -ErrorAction SilentlyContinue) {
        Write-Host "[!] Connected to Sobro AP! Sending Wi-Fi credentials..." -ForegroundColor Green
        break
    }
    Start-Sleep -Milliseconds 250
}

# Give the AP's HTTP server 1 second to fully initialize before sending the request
Start-Sleep -Seconds 1

$uri = "http://192.168.0.1/wifi_connect.json?ssid=$([uri]::EscapeDataString($Ssid))&key=$([uri]::EscapeDataString($Key))"
Write-Host "[*] Sending POST to $uri"

try {
    # We use a short timeout because the AP will drop off the network immediately when it accepts the command
    Invoke-WebRequest -Uri $uri -Method Post -Body "none" -TimeoutSec 3 -ErrorAction Stop
    Write-Host "[?] Request finished without dropping the connection (This is unexpected, it might not have worked)." -ForegroundColor Yellow
} catch {
    Write-Host "[+] The connection was dropped! This means the table accepted the credentials and is rebooting its Wi-Fi chip to connect to your Wi-Fi network." -ForegroundColor Green
}

Write-Host "[!] Connector script finished." -ForegroundColor Cyan
