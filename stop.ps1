Write-Host ""
Write-Host "Stopping MultiApp..." -ForegroundColor Yellow
Write-Host ""

$killed = $false

$p8080 = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue
if ($p8080) {
    $p8080 | ForEach-Object {
        $procId = $_.OwningProcess
        try {
            Stop-Process -Id $procId -Force -ErrorAction Stop
            Write-Host "  Stopped process on port 8080 (PID $procId)" -ForegroundColor Green
            $killed = $true
        } catch { }
    }
}

$p5173 = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue
if ($p5173) {
    $p5173 | ForEach-Object {
        $procId = $_.OwningProcess
        try {
            Stop-Process -Id $procId -Force -ErrorAction Stop
            Write-Host "  Stopped process on port 5173 (PID $procId)" -ForegroundColor Green
            $killed = $true
        } catch { }
    }
}

Get-Process -Name "go", "node" -ErrorAction SilentlyContinue | ForEach-Object {
    $path = $_.Path
    if ($path -and ($path -like "*\multiapp\*" -or $path -like "*Desktop\*")) {
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
        Write-Host "  Stopped $($_.ProcessName) (PID $($_.Id))" -ForegroundColor Green
        $killed = $true
    }
}

if ($killed) {
    Write-Host ""
    Write-Host "Done. Project stopped." -ForegroundColor Green
} else {
    Write-Host "Nothing to stop." -ForegroundColor Gray
}
Write-Host ""