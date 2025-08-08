# Script PowerShell para detener el bot GTAHUB
# Uso: .\stop-bot.ps1

Write-Host "🛑 Deteniendo GTAHUB Planos Manager Bot..." -ForegroundColor Red

# Buscar jobs de PowerShell relacionados con el bot
$jobs = Get-Job | Where-Object { $_.Command -like "*npm run dev*" -or $_.Name -like "*gtahub*" }

if ($jobs) {
    Write-Host "📋 Jobs encontrados:" -ForegroundColor Yellow
    $jobs | ForEach-Object {
        Write-Host "   • Job ID: $($_.Id) - Estado: $($_.State)" -ForegroundColor Gray
        Stop-Job -Id $_.Id -ErrorAction SilentlyContinue
        Remove-Job -Id $_.Id -ErrorAction SilentlyContinue
        Write-Host "   ✅ Job $($_.Id) detenido" -ForegroundColor Green
    }
}

# Buscar procesos de Node.js relacionados con el bot
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue

if ($nodeProcesses) {
    Write-Host "🔍 Procesos de Node.js encontrados:" -ForegroundColor Yellow
    $nodeProcesses | ForEach-Object {
        Write-Host "   • PID: $($_.Id) - Memoria: $([math]::Round($_.WorkingSet64/1MB, 2)) MB" -ForegroundColor Gray
        
        # Intentar obtener la línea de comandos (requiere permisos administrativos)
        try {
            $process = Get-WmiObject -Class Win32_Process -Filter "ProcessId = $($_.Id)"
            if ($process.CommandLine -like "*gtahub*" -or $process.CommandLine -like "*ts-node*") {
                Write-Host "   🎯 Bot detectado - Deteniendo PID: $($_.Id)" -ForegroundColor Red
                Stop-Process -Id $_.Id -Force
                Write-Host "   ✅ Proceso $($_.Id) detenido" -ForegroundColor Green
            }
        } catch {
            # Si no se puede acceder a CommandLine, preguntar al usuario
            Write-Host "   ❓ ¿Es este proceso el bot? PID: $($_.Id)" -ForegroundColor Yellow
            $response = Read-Host "   Detener este proceso? (s/n)"
            if ($response -eq "s" -or $response -eq "S") {
                Stop-Process -Id $_.Id -Force
                Write-Host "   ✅ Proceso $($_.Id) detenido" -ForegroundColor Green
            }
        }
    }
} else {
    Write-Host "ℹ️  No se encontraron procesos de Node.js ejecutándose" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "✅ Limpieza completada" -ForegroundColor Green
Write-Host "💡 Para iniciar el bot nuevamente, ejecuta: .\start-bot.ps1" -ForegroundColor Cyan
