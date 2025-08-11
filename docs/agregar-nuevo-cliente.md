# Guía para agregar un nuevo cliente a GTAHUB Planos Manager

Este documento describe el proceso completo para agregar un nuevo cliente (negocio/organización) al sistema GTAHUB Planos Manager, incluyendo la configuración de archivos, creación de canales en Discord, obtención de IDs, instalación y puesta en marcha del bot.


## 1. Crear la carpeta y archivos del cliente

1. Ve a la carpeta `clientes/` en el repositorio.
2. Crea una nueva subcarpeta con el nombre del cliente (en minúsculas, sin espacios). Ejemplo: `clientes/mi-negocio`.
3. Dentro de la carpeta del cliente, crea los siguientes archivos:
   - `config.json`: Configuración específica del cliente.
   - `localizaciones.json`: Lista de localizaciones iniciales con sus nombres y URLs de imagen.
   - Carpeta `images/`: Guarda aquí las imágenes de las localizaciones (formato PNG recomendado).

Ejemplo de estructura:
clientes/mi-negocio/ 
├─ config.json 
├─ localizaciones.json 
└─ images/ 
    ├─ bunker.png 
    ├─ mansion.png 
    └─ ...

## 2. Configurar localizaciones iniciales

Edita `localizaciones.json` con el siguiente formato:
```json
[
  { "nombre": "Bunker", "foto_url": "https://raw.githubusercontent.com/<usuario>/<repo>/main/clientes/mi-negocio/images/bunker.png" },
  { "nombre": "Mansion", "foto_url": "https://raw.githubusercontent.com/<usuario>/<repo>/main/clientes/mi-negocio/images/mansion.png" }
]
```
Asegúrate de subir las imágenes a la carpeta images/ y que las URLs apunten correctamente al repositorio de GitHub.

## 3. Crear canales de Discord y obtener IDs
Entra al servidor de Discord donde se instalará el bot.
Crea los canales necesarios para el cliente, por ejemplo:
    Canal de notificaciones de planos
    Canal de administración
    Canal de logs (opcional)
Para obtener el ID de cada canal:
Ve a Ajustes de Discord > Avanzado y activa el modo desarrollador.
Haz clic derecho sobre el canal y selecciona Copiar ID.

Guarda los IDs en el archivo config.json del cliente:

```json
    {
    "canal_notificaciones_id": "123456789012345678",
    "canal_admin_id": "987654321098765432"
    }
```

## 4. Instalar el bot en el servidor de Discord
Ve al Portal de Desarrolladores de Discord.
Selecciona la aplicación del bot o crea una nueva si es necesario.
En la sección OAuth2 > URL Generator:
    Selecciona los permisos necesarios (recomendado: Send Messages, Embed Links, Manage Channels, Read Message History).
Copia la URL generada y ábrela en tu navegador para invitar el bot al servidor.
Verifica que el bot aparece en la lista de miembros del servidor.

## 5. Configurar variables de entorno y base de datos
Edita el archivo .env en la raíz del proyecto:

CLIENTE=mi-negocio
DATABASE_PATH=data/mi-negocio.db
INSERTAR_DATOS_DEMO=true

Si es el primer inicio, el bot creará la base de datos y cargará las localizaciones iniciales desde localizaciones.json.

## 6. Iniciar el bot
Instala las dependencias si es necesario:
    npm install

Inicia el bot:
    npm run dev

Verifica en la consola que no hay errores y que el bot responde a los comandos en Discord.

## 7. Probar comandos y funcionamiento
Usa los comandos /listar-fabricaciones, /agregar-localizacion, /recoger-fabricacion, etc. para verificar que todo funciona correctamente.
Revisa que las cards visuales y notificaciones se envían en los canales configurados.

## 8. Notas adicionales
Si necesitas agregar más localizaciones, edita localizaciones.json y sube las imágenes correspondientes.
Para cambiar los colores o el estilo de los embeds, revisa el archivo src/utils/embeds.ts.
Ante cualquier error, revisa los logs en la consola y asegúrate de que las rutas y IDs estén correctos.
