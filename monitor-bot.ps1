# Script PowerShell para monitorear el bot GTAHUB
# Uso: .\monitor-bot.ps1

param(
    [switch]$Logs,      # Mostrar logs en tiempo real
    [switch]$Status,    # Mostrar solo el estado
    [switch]$Stats      # Mostrar estadísticas detalladas
)

Write-Host "🔍 Monitor GTAHUB Planos Manager Bot" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Función para mostrar estado
function Show-Status {
    # Buscar jobs de PowerShell
    $jobs = Get-Job | Where-Object { $_.Command -like "*npm run dev*" -or $_.Name -like "*gtahub*" }
    
    if ($jobs) {
        Write-Host "📊 PowerShell Jobs:" -ForegroundColor Green
        $jobs | ForEach-Object {
            $status = if ($_.State -eq "Running") { "🟢" } else { "🔴" }
            Write-Host "   $status Job ID: $($_.Id) - Estado: $($_.State)" -ForegroundColor White
        }
    }
    
    # Buscar procesos de Node.js
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    
    if ($nodeProcesses) {
        Write-Host "🖥️  Procesos Node.js:" -ForegroundColor Green
        $nodeProcesses | ForEach-Object {
            $memoryMB = [math]::Round($_.WorkingSet64/1MB, 2)
            $cpuPercent = [math]::Round($_.CPU, 2)
            Write-Host "   🔹 PID: $($_.Id) | Memoria: $memoryMB MB | CPU: $cpuPercent s" -ForegroundColor White
        }
    } else {
        Write-Host "❌ No se encontraron procesos de Node.js" -ForegroundColor Red
    }
    
    # Verificar archivos de log recientes
    $logFiles = Get-ChildItem -Path "logs" -Filter "*.log" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 3
    
    if ($logFiles) {
        Write-Host "📝 Archivos de log recientes:" -ForegroundColor Green
        $logFiles | ForEach-Object {
            $size = [math]::Round($_.Length/1KB, 2)
            Write-Host "   📄 $($_.Name) | Tamaño: $size KB | Modificado: $($_.LastWriteTime)" -ForegroundColor White
        }
    }
}

# Función para mostrar estadísticas detalladas
function Show-Stats {
    Show-Status
    
    Write-Host ""
    Write-Host "📈 Estadísticas del Sistema:" -ForegroundColor Yellow
    
    # Información del sistema
    $os = Get-WmiObject -Class Win32_OperatingSystem
    $cpu = Get-WmiObject -Class Win32_Processor
    
    Write-Host "   💻 OS: $($os.Caption)" -ForegroundColor White
    Write-Host "   🧠 CPU: $($cpu.Name)" -ForegroundColor White
    Write-Host "   💾 Memoria Total: $([math]::Round($os.TotalVisibleMemorySize/1MB, 2)) GB" -ForegroundColor White
    Write-Host "   💾 Memoria Libre: $([math]::Round($os.FreePhysicalMemory/1MB, 2)) GB" -ForegroundColor White
    
    # Información de Node.js instalado
    try {
        $nodeVersion = node --version
        $npmVersion = npm --version
        Write-Host "   📦 Node.js: $nodeVersion" -ForegroundColor White
        Write-Host "   📦 npm: $npmVersion" -ForegroundColor White
    } catch {
        Write-Host "   ❌ Node.js no encontrado en PATH" -ForegroundColor Red
    }
}

# Función para mostrar logs en tiempo real
function Show-Logs {
    $latestLog = Get-ChildItem -Path "logs" -Filter "*.log" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    
    if ($latestLog) {
        Write-Host "📱 Mostrando logs en tiempo real: $($latestLog.Name)" -ForegroundColor Green
        Write-Host "Presiona Ctrl+C para salir..." -ForegroundColor Yellow
        Write-Host ""
        
        Get-Content -Path $latestLog.FullName -Wait
    } else {
        Write-Host "❌ No se encontraron archivos de log" -ForegroundColor Red
    }
}

# Ejecutar según los parámetros
if ($Logs) {
    Show-Logs
} elseif ($Stats) {
    Show-Stats
} else {
    Show-Status
    
    Write-Host ""
    Write-Host "💡 Opciones disponibles:" -ForegroundColor Cyan
    Write-Host "   .\monitor-bot.ps1 -Status   # Solo estado" -ForegroundColor Gray
    Write-Host "   .\monitor-bot.ps1 -Stats    # Estadísticas detalladas" -ForegroundColor Gray
    Write-Host "   .\monitor-bot.ps1 -Logs     # Ver logs en tiempo real" -ForegroundColor Gray
}
