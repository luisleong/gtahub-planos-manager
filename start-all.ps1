# Script para iniciar backend (bot) y frontend
# Ejecuta este script en PowerShell

$basePath = "$PSScriptRoot"
$botPath = $basePath
$webPath = Join-Path $basePath "web"

# Backend
$nodeModulesBot = Join-Path $botPath "node_modules"
Write-Host "Verificando dependencias del backend..."
if (!(Test-Path $nodeModulesBot)) {
    Write-Host "No existe node_modules en el backend. Ejecutando npm install..." -ForegroundColor Yellow
    Push-Location $botPath
    npm install
    Pop-Location
    Write-Host "Dependencias backend instaladas."
} else {
    Write-Host "node_modules ya existe en el backend."
}

# Frontend
$nodeModulesWeb = Join-Path $webPath "node_modules"
Write-Host "Verificando dependencias del frontend..."
if (!(Test-Path $nodeModulesWeb)) {
    Write-Host "No existe node_modules en el frontend. Ejecutando npm install..." -ForegroundColor Yellow
    Push-Location $webPath
    npm install
    Pop-Location
    Write-Host "Dependencias frontend instaladas."
} else {
    Write-Host "node_modules ya existe en el frontend."
}

# Iniciar backend (bot)
Write-Host "Iniciando Discord Bot..."
Start-Process powershell -ArgumentList '-NoExit', '-Command', 'npm run dev' -WorkingDirectory $botPath

# Iniciar frontend
Write-Host "Iniciando Frontend..."
Start-Process powershell -ArgumentList '-NoExit', '-Command', 'npm run dev' -WorkingDirectory $webPath

Write-Host "Bot y Frontend iniciados en ventanas separadas."
