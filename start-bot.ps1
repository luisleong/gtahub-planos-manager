# Script para iniciar solo el Discord Bot
# Ejecuta este script en PowerShell

$botPath = "$PSScriptRoot"
$nodeModulesPath = Join-Path $botPath "node_modules"

Write-Host "Verificando dependencias del backend..."
if (!(Test-Path $nodeModulesPath)) {
    Write-Host "No existe node_modules en el backend. Ejecutando npm install..." -ForegroundColor Yellow
    Push-Location $botPath
    npm install
    Pop-Location
    Write-Host "Dependencias instaladas."
} else {
    Write-Host "node_modules ya existe en el backend."
}

Write-Host "Iniciando Discord Bot..."
Start-Process powershell -ArgumentList '-NoExit', '-Command', 'npm run dev' -WorkingDirectory $botPath

Write-Host "Bot iniciado en ventana separada."
