#!/bin/bash
# Script Bash para iniciar el bot GTAHUB en segundo plano
# Uso: ./start-bot.sh

echo "🚀 Iniciando GTAHUB Planos Manager Bot..."

# Verificar si Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js no está instalado"
    exit 1
fi

# Verificar si npm está instalado
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm no está instalado"
    exit 1
fi

echo "✅ Node.js: $(node --version)"
echo "✅ npm: $(npm --version)"

# Cambiar al directorio del script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Verificar si existe package.json
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json no encontrado. ¿Estás en el directorio correcto?"
    exit 1
fi

# Instalar dependencias si no existen
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
fi

# Crear directorio de logs
mkdir -p logs

# Verificar si ya hay un proceso del bot ejecutándose
if pgrep -f "gtahub-planos-manager" > /dev/null; then
    echo "⚠️  El bot ya parece estar ejecutándose"
    echo "🔍 Procesos encontrados:"
    pgrep -f "gtahub-planos-manager" -l
    
    read -p "¿Deseas detenerlo y reiniciarlo? (s/n): " response
    if [ "$response" = "s" ] || [ "$response" = "S" ]; then
        echo "🛑 Deteniendo procesos existentes..."
        pkill -f "gtahub-planos-manager"
        sleep 3
    else
        echo "❌ Operación cancelada"
        exit 1
    fi
fi

# Crear archivo de log con timestamp
LOG_FILE="logs/bot-$(date +%Y-%m-%d).log"
PID_FILE="logs/bot.pid"

echo "🔄 Iniciando bot en segundo plano..."

# Iniciar el bot en segundo plano
nohup npm run dev > "$LOG_FILE" 2>&1 &
BOT_PID=$!

# Guardar PID en archivo
echo $BOT_PID > "$PID_FILE"

echo "✅ Bot iniciado en segundo plano!"
echo "📊 PID: $BOT_PID"
echo "📝 Logs: $LOG_FILE"
echo "🔧 PID guardado en: $PID_FILE"
echo ""
echo "📋 Para gestionar el bot:"
echo "   • Ver logs en tiempo real: tail -f $LOG_FILE"
echo "   • Verificar estado: ps -p $BOT_PID"
echo "   • Detener: ./stop-bot.sh"
echo ""

# Esperar unos segundos y verificar que el proceso sigue ejecutándose
sleep 5

if ps -p $BOT_PID > /dev/null; then
    echo "🎉 ¡Bot ejecutándose correctamente! (PID: $BOT_PID)"
else
    echo "❌ Problema al iniciar el bot. Revisa los logs:"
    echo "   tail $LOG_FILE"
    rm -f "$PID_FILE"
    exit 1
fi
