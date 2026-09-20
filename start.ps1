$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogDir = Join-Path $Root "logs"

if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }

function Write-Info  { param($msg) Write-Host "[INFO]  $msg" -ForegroundColor Cyan }
function Write-Ok    { param($msg) Write-Host "[OK]    $msg" -ForegroundColor Green }
function Write-Warn  { param($msg) Write-Host "[WARN]  $msg" -ForegroundColor Yellow }
function Write-Err   { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red }

Write-Host ""
Write-Host "MultiApp - start" -ForegroundColor Magenta
Write-Host ""

Write-Info "Checking tools..."

$missing = @()

if (-not (Get-Command go -ErrorAction SilentlyContinue))     { $missing += "Go (https://go.dev/dl/)" }
if (-not (Get-Command node -ErrorAction SilentlyContinue))   { $missing += "Node.js (https://nodejs.org)" }
if (-not (Get-Command npm -ErrorAction SilentlyContinue))    { $missing += "npm (comes with Node.js)" }
if (-not (Get-Command psql -ErrorAction SilentlyContinue))   { $missing += "PostgreSQL (https://www.postgresql.org/download/windows/)" }

if ($missing.Count -gt 0) {
    Write-Err "Missing tools:"
    $missing | ForEach-Object { Write-Host "   - $_" -ForegroundColor Yellow }
    Write-Host ""
    Write-Host "Install them and restart VS Code." -ForegroundColor Yellow
    exit 1
}

Write-Ok "Go:      $((go version))"
Write-Ok "Node:    $((node -v))"
Write-Ok "npm:     $((npm -v))"
Write-Ok "psql:    $((psql --version))"
Write-Host ""

$DbHost = "localhost"
$DbPort = "5432"
$DbName = "multiapp"
$DbUser = "multiapp"
$DbPass = "multiapp"
$PgSuperUser = "postgres"

Write-Info "Setting up database '$DbName'..."

$env:PGPASSWORD = $DbPass
$dbExists = $false
try {
    psql -h $DbHost -p $DbPort -U $DbUser -d $DbName -c "SELECT 1;" 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $dbExists = $true }
} catch { }

if (-not $dbExists) {
    Write-Warn "DB not found. Trying to create (postgres password required)..."
    Write-Host ""
    Write-Host "Enter password for PostgreSQL user 'postgres':" -ForegroundColor Yellow
    $superPass = Read-Host -AsSecureString
    $superPassPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($superPass)
    )

    $env:PGPASSWORD = $superPassPlain

    Write-Info "Checking connection to '$PgSuperUser'..."
    $testConn = psql -h $DbHost -p $DbPort -U $PgSuperUser -d postgres -tAc "SELECT 1;" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Cannot connect as '$PgSuperUser'. Wrong password or service not running."
        Write-Host $testConn -ForegroundColor Red
        exit 1
    }

    Write-Info "Checking if role '$DbUser' exists..."
    $roleCheckRaw = psql -h $DbHost -p $DbPort -U $PgSuperUser -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname = '$DbUser';" 2>&1
    $roleCheckStr = ($roleCheckRaw | Out-String).Trim()

    if ($roleCheckStr -ne "1") {
        Write-Info "Creating role '$DbUser'..."
        psql -h $DbHost -p $DbPort -U $PgSuperUser -d postgres -c "CREATE ROLE $DbUser LOGIN PASSWORD '$DbPass';" | Out-Null
    } else {
        Write-Ok "Role '$DbUser' already exists."
    }

    Write-Info "Creating database '$DbName'..."
    $createDbResult = psql -h $DbHost -p $DbPort -U $PgSuperUser -d postgres -c "CREATE DATABASE $DbName OWNER $DbUser;" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Failed to create database:"
        Write-Host $createDbResult -ForegroundColor Red
        exit 1
    }

    psql -h $DbHost -p $DbPort -U $PgSuperUser -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DbName TO $DbUser;" | Out-Null

    $env:PGPASSWORD = $DbPass
    Write-Ok "Database '$DbName' created."
} else {
    Write-Ok "Database '$DbName' already exists."
}

Write-Info "Setting up backend..."

$backendDir = Join-Path $Root "backend"
$envFile = Join-Path $backendDir ".env"

if (-not (Test-Path $envFile)) {
    $envContent = @(
        "PORT=8080",
        "DATABASE_URL=postgres://${DbUser}:${DbPass}@${DbHost}:${DbPort}/${DbName}?sslmode=disable",
        "JWT_SECRET=change_me_super_secret",
        "UPLOAD_DIR=./uploads",
        "PUBLIC_URL=http://localhost:8080"
    ) -join "`r`n"
    Set-Content -Path $envFile -Value $envContent -Encoding UTF8
    Write-Ok ".env created."
} else {
    Write-Ok ".env exists."
}

Push-Location $backendDir
Write-Info "Fetching Go dependencies (go mod tidy)..."
go mod tidy
if ($LASTEXITCODE -ne 0) { Write-Err "go mod tidy failed"; Pop-Location; exit 1 }
Pop-Location
Write-Ok "Backend ready."

Write-Info "Setting up frontend..."

$frontendDir = Join-Path $Root "frontend"

Push-Location $frontendDir
if (-not (Test-Path "node_modules")) {
    Write-Info "Installing npm dependencies (takes a minute)..."
    npm install
    if ($LASTEXITCODE -ne 0) { Write-Err "npm install failed"; Pop-Location; exit 1 }
} else {
    Write-Ok "node_modules exists."
}
Pop-Location
Write-Ok "Frontend ready."

Write-Info "Starting backend and frontend..."

$backendLog  = Join-Path $LogDir "backend.log"
$frontendLog = Join-Path $LogDir "frontend.log"

Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$backendDir'; Write-Host 'Backend - http://localhost:8080' -ForegroundColor Green; go run ./cmd/server 2>&1 | Tee-Object -FilePath '$backendLog'"
) -WindowStyle Normal

Start-Sleep -Seconds 2

Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$frontendDir'; Write-Host 'Frontend - http://localhost:5173' -ForegroundColor Green; npm run dev 2>&1 | Tee-Object -FilePath '$frontendLog'"
) -WindowStyle Normal

Write-Info "Waiting for startup (15 seconds)..."

$backendOk = $false
$frontendOk = $false

for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Seconds 1
    if (-not $backendOk) {
        try {
            Invoke-WebRequest -Uri "http://localhost:8080/api/posts" -UseBasicParsing -TimeoutSec 1 -ErrorAction Stop | Out-Null
            $backendOk = $true
        } catch {
            if ($_.Exception.Response.StatusCode.value__ -in 401, 403) { $backendOk = $true }
        }
    }
    if (-not $frontendOk) {
        try {
            Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 1 -ErrorAction Stop | Out-Null
            $frontendOk = $true
        } catch { }
    }
    if ($backendOk -and $frontendOk) { break }
}

Write-Host ""
if ($backendOk)  { Write-Ok  "Backend  running: http://localhost:8080" } else { Write-Warn "Backend  not responding yet (check backend window)" }
if ($frontendOk) { Write-Ok  "Frontend running: http://localhost:5173" } else { Write-Warn "Frontend not responding yet (check frontend window)" }
Write-Host ""

if ($frontendOk) {
    Start-Process "http://localhost:5173"
    Write-Ok "Browser opened."
} else {
    Write-Warn "Open manually: http://localhost:5173"
}

Write-Host ""
Write-Host "To stop: run stop.ps1" -ForegroundColor Gray
Write-Host ""