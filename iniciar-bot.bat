@echo off
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0start-bot.ps1"
pause