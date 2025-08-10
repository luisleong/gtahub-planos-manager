# Script para iniciar Discord bot, backend API y frontend web juntos
# Ejecuta este script en PowerShell

Write-Host "Iniciando Discord Bot + Backend API..."
Start-Process powershell -ArgumentList '-NoExit', '-Command', 'npm run dev' -WorkingDirectory "c:\Users\luisl\Documents\GitHub\gtahub-planos-manager"

Start-Sleep -Seconds 2
Write-Host "Iniciando Frontend Web..."
Start-Process powershell -ArgumentList '-NoExit', '-Command', 'yarn start' -WorkingDirectory "c:\Users\luisl\Documents\GitHub\gtahub-planos-manager\web"

Write-Host "Bot, backend y frontend han sido iniciados en ventanas separadas."
