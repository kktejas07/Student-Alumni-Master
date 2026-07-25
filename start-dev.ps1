# ============================================================
# start-dev.ps1  --  Auto-start Student Alumni / NexusOS stack
# Run from the project root:  powershell -ExecutionPolicy Bypass -File .\start-dev.ps1
# ============================================================

$Root     = Split-Path -Parent $MyInvocation.MyCommand.Definition
$Backend  = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"
$VenvPy   = Join-Path $Backend "venv\Scripts\python.exe"
$Digit    = "^[0-9]+$"

function Write-Info    { param($msg) Write-Host "  $msg" -ForegroundColor Cyan }
function Write-OK      { param($msg) Write-Host "  $msg" -ForegroundColor Green }
function Write-Warn    { param($msg) Write-Host "  $msg" -ForegroundColor Yellow }

function Kill-Port {
    param([int]$Port)
    $lines = netstat -ano | Select-String (":$Port ")
    foreach ($line in $lines) {
        $parts = ($line.ToString() -split "\s+")
        $pid_ = $parts[-1]
        if ($pid_ -match $Digit -and [int]$pid_ -gt 0) {
            Stop-Process -Id ([int]$pid_) -Force -ErrorAction SilentlyContinue
        }
    }
}

function Wait-Port {
    param([int]$Port, [string]$Name, [int]$TimeoutSec = 90)
    $elapsed = 0
    while ($elapsed -lt $TimeoutSec) {
        try {
            $tcp = New-Object System.Net.Sockets.TcpClient
            $tcp.Connect("127.0.0.1", $Port)
            $tcp.Close()
            Write-OK "${Name} is ready on :${Port}!"
            return $true
        } catch {
            Start-Sleep -Seconds 2
            $elapsed += 2
            Write-Host "    Waiting for ${Name}... (${elapsed}s / ${TimeoutSec}s)" -ForegroundColor DarkGray
        }
    }
    Write-Warn "${Name} did not respond in time."
    return $false
}

# ── Banner ────────────────────────────────────────────────────
Clear-Host
Write-Host ""
Write-Host "  ========================================" -ForegroundColor Magenta
Write-Host "   Student Alumni / NexusOS  --  Dev Stack" -ForegroundColor Magenta
Write-Host "  ========================================" -ForegroundColor Magenta
Write-Host ""

# ── Ensure venv ───────────────────────────────────────────────
if (-not (Test-Path $VenvPy)) {
    Write-Warn "venv not found. Creating and installing dependencies..."
    python -m venv "$Backend\venv"
    & "$Backend\venv\Scripts\python.exe" -m pip install -q --upgrade pip
    & "$Backend\venv\Scripts\python.exe" -m pip install -q -r "$Backend\requirements.txt"
    & "$Backend\venv\Scripts\python.exe" -m pip install -q "uvicorn[standard]"
    Write-OK "Backend dependencies installed."
}

# ── Clear ports ───────────────────────────────────────────────
Write-Info "Clearing ports 8002 and 8081..."
Kill-Port 8002
Kill-Port 8081
Write-OK "Ports cleared."

# ── Start Backend in new window ───────────────────────────────
Write-Info "Starting Backend  -->  http://localhost:8002"
$bArgs = "-NoExit -Command `"Set-Location '$Backend'; & '$VenvPy' -m uvicorn server:app --host 0.0.0.0 --port 8002 --reload --log-level info`""
$bProc = Start-Process powershell -ArgumentList $bArgs -PassThru

# ── Start Frontend in new window ──────────────────────────────
Write-Info "Starting Frontend -->  http://localhost:8081"
$fArgs = "-NoExit -Command `"Set-Location '$Frontend'; `$env:EXPO_PUBLIC_BACKEND_URL='http://localhost:8002'; npx expo start --web --port 8081`""
$fProc = Start-Process powershell -ArgumentList $fArgs -PassThru

Write-Host ""
Write-Info "Waiting for services to come online..."

$backendReady  = Wait-Port -Port 8002 -Name "Backend"  -TimeoutSec 90
$frontendReady = Wait-Port -Port 8081 -Name "Frontend" -TimeoutSec 120

Write-Host ""
Write-Host "  ─────────────────────────────────────────" -ForegroundColor DarkGray
if ($backendReady)  {
    Write-OK "Backend  --> http://localhost:8002"
    Write-OK "API Docs --> http://localhost:8002/docs"
}
if ($frontendReady) {
    Write-OK "Frontend --> http://localhost:8081"
}
Write-Host "  ─────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host ""

# ── Open browser ──────────────────────────────────────────────
if ($frontendReady) {
    Write-Info "Opening browser at http://localhost:8081 ..."
    Start-Process "http://localhost:8081"
} elseif ($backendReady) {
    Write-Info "Opening API docs at http://localhost:8002/docs ..."
    Start-Process "http://localhost:8002/docs"
}

Write-Host ""
Write-Host "  Both server windows are open. Close them or press Ctrl+C there to stop." -ForegroundColor Yellow
Write-Host ""
