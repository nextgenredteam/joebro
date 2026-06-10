$Endpoints = @(
    "status.json",
    "regtoken.json",
    "wifi_status.json",
    "local_reg.json",
    "wifi_scan_results.json"
)

$BaseUrl = "http://192.168.0.1/"
$OutputFolder = Join-Path -Path $PSScriptRoot -ChildPath "dumps"
$TimeoutMS = 1000

if (!(Test-Path -Path $OutputFolder)) {
    New-Item -ItemType Directory -Path $OutputFolder | Out-Null
}

Write-Host "[+] Waiting for Sobro AP (192.168.0.1) to become reachable..."

# Loop until we can ping the gateway
while ($true) {
    if (Test-Connection -ComputerName 192.168.0.1 -Count 1 -Quiet -ErrorAction SilentlyContinue) {
        Write-Host "[!] Connected to Sobro AP! Starting extraction..." -ForegroundColor Green
        break
    }
    Start-Sleep -Milliseconds 250
}

# Fast extraction loop
foreach ($Endpoint in $Endpoints) {
    $Url = "$BaseUrl$Endpoint"
    $OutFile = Join-Path -Path $OutputFolder -ChildPath "sobro_$Endpoint"
    
    Write-Host "[*] Fetching $Url ..."
    try {
        $Response = Invoke-RestMethod -Uri $Url -TimeoutSec 5 -ErrorAction Stop
        $Response | ConvertTo-Json -Depth 10 | Out-File -FilePath $OutFile
        Write-Host "    [+] Success! Saved to $OutFile" -ForegroundColor Green
    } catch {
        Write-Host "    [-] Failed: $_" -ForegroundColor Red
    }
}

Write-Host "[!] Extraction complete. You can now analyze the dumps." -ForegroundColor Cyan
