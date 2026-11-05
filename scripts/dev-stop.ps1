# SynapseBrain — dung moi truong dev
$ErrorActionPreference = "SilentlyContinue"
Get-NetTCPConnection -LocalPort 3000,4000 -State Listen |
    Select-Object -Property OwningProcess -Unique |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
docker stop synapsebrain-mysql synapsebrain-redis
Write-Host "Da dung API, Web, MySQL, Redis."
