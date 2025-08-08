# Script PowerShell para iniciar el bot GTAHUB en segundo plano
# Uso: .\start-bot.ps1

Write-Host "🚀 Iniciando GTAHUB Planos Manager Bot..." -ForegroundColor Green

# Verificar si Node.js está instalado
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js encontrado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Node.js no está instalado o no está en el PATH" -ForegroundColor Red
    exit 1
}

# Verificar si npm está instalado
try {
    $npmVersion = npm --version
    Write-Host "✅ npm encontrado: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: npm no está instalado" -ForegroundColor Red
    exit 1
}

# Cambiar al directorio del proyecto
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Verificar si existe package.json
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: package.json no encontrado. ¿Estás en el directorio correcto?" -ForegroundColor Red
    exit 1
}

# Instalar dependencias si no existen
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Instalando dependencias..." -ForegroundColor Yellow
    npm install
}

# Verificar si ya hay un proceso del bot ejecutándose
$existingProcess = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like "*ts-node*" -or $_.CommandLine -like "*gtahub-planos-manager*" }

if ($existingProcess) {
    Write-Host "⚠️  El bot ya parece estar ejecutándose (PID: $($existingProcess.Id))" -ForegroundColor Yellow
    $response = Read-Host "¿Deseas detenerlo y reiniciarlo? (s/n)"
    if ($response -eq "s" -or $response -eq "S") {
        Write-Host "🛑 Deteniendo proceso existente..." -ForegroundColor Yellow
        Stop-Process -Id $existingProcess.Id -Force
        Start-Sleep -Seconds 3
    } else {
        Write-Host "❌ Operación cancelada" -ForegroundColor Red
        exit 1
    }
}

Write-Host "🔄 Iniciando bot en segundo plano..." -ForegroundColor Cyan

# Crear archivo de log
$logFile = "logs\bot-$(Get-Date -Format 'yyyy-MM-dd').log"
$logDir = Split-Path -Parent $logFile
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

# Iniciar el bot en segundo plano y redirigir output a log
$job = Start-Job -ScriptBlock {
    param($projectPath, $logFile)
    Set-Location $projectPath
    npm run dev 2>&1 | Tee-Object -FilePath $logFile
} -ArgumentList $scriptPath, $logFile

Write-Host "✅ Bot iniciado en segundo plano!" -ForegroundColor Green
Write-Host "📊 Job ID: $($job.Id)" -ForegroundColor Cyan
Write-Host "📝 Logs: $logFile" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Para gestionar el bot:" -ForegroundColor White
Write-Host "   • Ver estado: Get-Job -Id $($job.Id)" -ForegroundColor Gray
Write-Host "   • Ver output: Receive-Job -Id $($job.Id)" -ForegroundColor Gray
Write-Host "   • Detener: Stop-Job -Id $($job.Id); Remove-Job -Id $($job.Id)" -ForegroundColor Gray
Write-Host "   • Ver logs en tiempo real: Get-Content '$logFile' -Wait" -ForegroundColor Gray
Write-Host ""
Write-Host "🔍 El bot se está ejecutando en segundo plano. Revisa los logs para confirmar que inició correctamente." -ForegroundColor Yellow

# Esperar unos segundos y mostrar el estado inicial
Start-Sleep -Seconds 5
$jobStatus = Get-Job -Id $job.Id
Write-Host "📈 Estado actual: $($jobStatus.State)" -ForegroundColor $(if($jobStatus.State -eq "Running") {"Green"} else {"Red"})

if ($jobStatus.State -eq "Running") {
    Write-Host "🎉 ¡Bot ejecutándose correctamente!" -ForegroundColor Green
} else {
    Write-Host "❌ Problema al iniciar el bot. Revisa los logs:" -ForegroundColor Red
    Write-Host "   Get-Content '$logFile'" -ForegroundColor Gray
}
