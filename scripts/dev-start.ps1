# SynapseBrain — script khởi động môi trường dev local
# Chạy: powershell -ExecutionPolicy Bypass -File scripts\dev-start.ps1
# Hoặc click chuột phải -> Run with PowerShell

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "=== SynapseBrain dev environment ===" -ForegroundColor Cyan

# 1. Docker (MySQL + Redis)
$dockerOk = $false
docker info 2>$null *>$null
if ($LASTEXITCODE -eq 0) { $dockerOk = $true }
else {
    Write-Host "Docker chua chay - khoi dong Docker Desktop..." -ForegroundColor Yellow
    $dd = Get-ChildItem "$env:LOCALAPPDATA\Programs\DockerDesktop\Docker Desktop.exe" -ErrorAction SilentlyContinue
    if ($dd) { Start-Process $dd.FullName }
    foreach ($i in 1..24) {
        Start-Sleep -Seconds 5
        docker info 2>$null *>$null
        if ($LASTEXITCODE -eq 0) { $dockerOk = $true; break }
    }
}
if (-not $dockerOk) { Write-Host "KHONG ket noi duoc Docker - hay mo Docker Desktop thu cong!" -ForegroundColor Red; pause; exit 1 }

# 2. Containers
$mysqlUp = docker ps --filter "name=synapsebrain-mysql" --format "{{.Names}}" 2>$null
if (-not $mysqlUp) {
    Write-Host "Khoi dong containers MySQL + Redis..." -ForegroundColor Yellow
    docker start synapsebrain-mysql synapsebrain-redis 2>$null
    if ($LASTEXITCODE -ne 0) {
        docker run -d --name synapsebrain-mysql -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=scaffold_dev -e MYSQL_USER=dev -e MYSQL_PASSWORD=dev -p 3306:3306 mysql:8
        docker run -d --name synapsebrain-redis -p 6379:6379 redis:7-alpine
    }
    Start-Sleep -Seconds 20
}
Write-Host "[OK] MySQL + Redis dang chay" -ForegroundColor Green

# 3. Don port cu (neu co)
Get-NetTCPConnection -LocalPort 3000,4000 -State Listen -ErrorAction SilentlyContinue |
    Select-Object -Property OwningProcess -Unique |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 2

# 4. Mo 2 cua so terminal: API + Web
Write-Host "Mo API (port 4000) + Web (port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root'; pnpm --filter @learning/api dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root'; pnpm --filter @learning/web dev"

Write-Host ""
Write-Host "=== XONG! ===" -ForegroundColor Green
Write-Host "  Web : http://localhost:3000  (cho ~15s de web san sang)"
Write-Host "  API : http://localhost:4000/api/v1/health"
Write-Host ""
Write-Host "Goi y xem:" -ForegroundColor Cyan
Write-Host "  /subjects              - 2 mon hoc that (Toan, Tieng Anh)"
Write-Host "  /lessons/so-tu-nhien   - bai hoc + quiz cham that + XP"
Write-Host "  /register              - tao tai khoan (luu DB that)"
Write-Host "  /roadmaps              - lo trinh hoc + placement test"
Write-Host "  /progress              - XP, streak, calendar (can dang nhap)"
Write-Host ""
Write-Host "Dung tat ca: chay scripts\dev-stop.ps1"
pause
