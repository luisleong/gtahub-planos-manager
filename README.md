# 🏗️ GTAHUB Planos Manager

Bot de Discord para gestionar planos de negocios en el servidor de GTA RP **GTAHUB**. Permite trackear tiempos de producción, estados de planos y notificaciones automáticas con cards visuales bonitas.

## ✨ Características

- 📋 **Gestión completa de planos** - Agregar, listar y marcar como recogidos
- 🎨 **Cards visuales profesionales** - Embeds bonitos con información detallada
- ⏰ **Sistema de tiempo real** - Trackeo automático de tiempos de producción
- 🔔 **Notificaciones automáticas** - Te avisa cuando tus planos estén listos
- 🗄️ **Base de datos persistente** - SQLite para guardar toda la información
- 🎯 **Comandos slash modernos** - Interfaz intuitiva con autocompletado
- 📊 **Filtros y estadísticas** - Ver planos por usuario, estado, etc.

## 🚀 Instalación

### Prerrequisitos
- Node.js 16+ 
- NPM o Yarn
- Bot de Discord configurado

### Pasos de instalación

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/luisleong/gtahub-planos-manager.git
   cd gtahub-planos-manager
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   
   Edita el archivo `.env` con tus datos:
   ```env
   BOT_TOKEN=tu_bot_token_aqui
   CLIENT_ID=tu_client_id_aqui
   GUILD_ID=id_de_tu_servidor
   NOTIFICATION_CHANNEL_ID=id_canal_notificaciones
   ```

4. **Compilar el proyecto**
   ```bash
   npm run build
   ```

5. **Iniciar el bot**
   ```bash
   npm start
   ```

   Para desarrollo:
   ```bash
   npm run dev
   ```

## 📋 Comandos Disponibles

### `/agregar-plano`
Agregar un nuevo plano a la producción.

**Parámetros:**
- `nombre` - Nombre del plano
- `tipo` - Tipo de negocio (Tienda, Banco, Joyería, etc.)
- `ubicacion` - Donde se está produciendo
- `tiempo` - Tiempo de producción en minutos
- `propietario` - Usuario propietario (opcional)
- `imagen` - URL de imagen (opcional)
- `notas` - Notas adicionales (opcional)

### `/listar-planos`
Ver todos los planos con filtros opcionales.

**Parámetros:**
- `estado` - Filtrar por estado (En proceso, Completado, Recogido)
- `usuario` - Ver planos de usuario específico
- `solo-resumen` - Mostrar solo estadísticas

### `/recoger-plano`
Marcar un plano como recogido.

**Parámetros:**
- `id` - ID del plano (con autocompletado)

### `/info`
Información del bot y estadísticas.

## 🎨 Tipos de Planos Soportados

- 🏪 **Tienda** - Planos de tiendas regulares
- 🏦 **Banco** - Planos de bancos
- 💎 **Joyería** - Planos de joyerías
- 🏧 **Fleeca** - Planos de bancos Fleeca
- 🏛️ **Pacific Standard** - Planos del Pacific Standard
- 🧪 **Humane Labs** - Planos de Humane Labs
- 🎰 **Casino** - Planos del Casino
- 🚛 **Union Depository** - Planos del Union Depository
- 📋 **Otros** - Cualquier otro tipo

## 📊 Estados de Planos

- ⏳ **En Proceso** - Plano en producción
- ✅ **Completado** - Listo para recoger (se notifica automáticamente)
- 📦 **Recogido** - Ya recogido del almacén

## 🔔 Sistema de Notificaciones

El bot revisa automáticamente cada **5 minutos** si hay planos que deberían estar completados:

1. Detecta planos que han alcanzado su tiempo de producción
2. Los marca automáticamente como "Completado"
3. Envía una notificación bonita al canal configurado
4. Menciona al propietario del plano

## 🗄️ Base de Datos

Utiliza SQLite para almacenar:
- Información completa de planos
- Estados y fechas de cambio
- Propietarios y ubicaciones
- Notas y configuraciones

La base de datos se crea automáticamente en `/data/planos.db`.

## 🛠️ Desarrollo

### Estructura del proyecto
```
src/
├── commands/          # Comandos slash
├── database/          # Gestión de base de datos
├── utils/             # Utilidades (embeds, notificaciones)
└── index.ts           # Archivo principal
```

### Scripts disponibles
- `npm run dev` - Modo desarrollo con ts-node
- `npm run dev:watch` - Desarrollo con recarga automática
- `npm run build` - Compilar TypeScript
- `npm run start` - Ejecutar versión compilada
- `npm run clean` - Limpiar archivos compilados

## 🎯 Roadmap

- [ ] Dashboard web para administración
- [ ] Exportar estadísticas a Excel/CSV
- [ ] Sistema de backup automático
- [ ] Integración con calendarios
- [ ] Reportes avanzados
- [ ] API REST para integraciones

## 🤝 Contribuir

1. Fork del proyecto
2. Crear rama para feature (`git checkout -b feature/nueva-caracteristica`)
3. Commit cambios (`git commit -am 'Agregar nueva característica'`)
4. Push a la rama (`git push origin feature/nueva-caracteristica`)
5. Crear Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 👥 Créditos

Desarrollado para la comunidad **GTAHUB RP** 🎮

---

¿Problemas o sugerencias? Abre un issue en GitHub o contacta al equipo de desarrollo.
