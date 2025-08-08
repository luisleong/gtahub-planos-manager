#!/bin/bash
# Script Bash para detener el bot GTAHUB
# Uso: ./stop-bot.sh

echo "🛑 Deteniendo GTAHUB Planos Manager Bot..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PID_FILE="logs/bot.pid"

# Intentar usar el PID guardado
if [ -f "$PID_FILE" ]; then
    BOT_PID=$(cat "$PID_FILE")
    echo "📋 PID encontrado en archivo: $BOT_PID"
    
    if ps -p $BOT_PID > /dev/null; then
        echo "🎯 Deteniendo proceso con PID: $BOT_PID"
        kill $BOT_PID
        
        # Esperar un poco y verificar
        sleep 3
        if ps -p $BOT_PID > /dev/null; then
            echo "⚠️  Proceso aún ejecutándose, forzando detención..."
            kill -9 $BOT_PID
        fi
        
        echo "✅ Proceso $BOT_PID detenido"
        rm -f "$PID_FILE"
    else
        echo "ℹ️  El proceso $BOT_PID ya no está ejecutándose"
        rm -f "$PID_FILE"
    fi
else
    echo "📁 Archivo PID no encontrado, buscando procesos manualmente..."
fi

# Buscar y detener cualquier proceso relacionado
PROCESSES=$(pgrep -f "gtahub-planos-manager")

if [ ! -z "$PROCESSES" ]; then
    echo "🔍 Procesos relacionados encontrados:"
    echo "$PROCESSES" | while read pid; do
        echo "   • PID: $pid"
        ps -p $pid -o pid,ppid,cmd --no-headers
    done
    
    echo "🛑 Deteniendo todos los procesos relacionados..."
    pkill -f "gtahub-planos-manager"
    
    # Esperar y verificar
    sleep 3
    REMAINING=$(pgrep -f "gtahub-planos-manager")
    if [ ! -z "$REMAINING" ]; then
        echo "⚠️  Algunos procesos aún ejecutándose, forzando detención..."
        pkill -9 -f "gtahub-planos-manager"
    fi
    
    echo "✅ Todos los procesos detenidos"
else
    echo "ℹ️  No se encontraron procesos del bot ejecutándose"
fi

# Limpiar archivos temporales
rm -f "$PID_FILE"

echo ""
echo "✅ Limpieza completada"
echo "💡 Para iniciar el bot nuevamente, ejecuta: ./start-bot.sh"
