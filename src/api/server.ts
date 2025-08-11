import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { DatabaseManager } from '../database/DatabaseManager';
import uploadRouter from './upload';

// ...existing code...
/**
 * @swagger
 * /localizaciones:
 *   get:
 *     summary: Obtener todas las localizaciones
 *     responses:
 *       200:
 *         description: Lista de localizaciones
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *   post:
 *     summary: Crear una localización
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *               tipo:
 *                 type: string
 *               foto:
 *                 type: string
 *     responses:
 *       201:
 *         description: Localización creada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *
 * /localizaciones/{id}:
 *   put:
 *     summary: Editar una localización
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *               tipo:
 *                 type: string
 *               foto:
 *                 type: string
 *     responses:
 *       200:
 *         description: Localización editada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *   delete:
 *     summary: Eliminar una localización
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Eliminado correctamente
 */


const app = express();
const port = 3001;
app.use(cors({ origin: '*' }));
app.use(bodyParser.json());
app.use('/upload', uploadRouter);

// Ruta informativa en la raíz
app.get('/', (req: Request, res: Response) => {
  res.send('API GTAHUB Planos Manager está corriendo. Documentación Swagger en <a href="/api-docs">/api-docs</a>');
});

// Instancia de la base de datos (ajusta el path si usas multi-cliente)
const db = new DatabaseManager();

// Inicializar la base de datos antes de definir rutas
(async () => {
  try {
    await db.initialize();
    console.log('✅ Base de datos inicializada');
  } catch (err) {
    console.error('❌ Error inicializando la base de datos:', err);
    process.exit(1);
  }

  // Configuración Swagger (debe ir después de declarar app)
  const swaggerOptions = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'API Localizaciones GTAHUB',
        version: '1.0.0',
        description: 'CRUD localizaciones para uso local',
      },
    },
    apis: [__filename],
  };
  const swaggerSpec = swaggerJsdoc(swaggerOptions);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Obtener todas las localizaciones
  app.get('/localizaciones', async (req: Request, res: Response) => {
      try {
          const localizaciones = await db.obtenerLocalizaciones();
          res.json(localizaciones);
      } catch (err) {
          res.status(500).json({ error: 'Error al obtener localizaciones' });
      }
  });

  // ...resto de rutas y lógica...

  app.listen(port, () => {
    console.log(`API de localizaciones escuchando en http://localhost:${port}`);
  });
})();

// Crear una localización
app.post('/localizaciones', async (req: Request, res: Response) => {
    try {
        let { nombre, foto, disponible } = req.body as { nombre: string; foto?: string; disponible?: boolean };
        // Si no hay foto, usar la imagen placeholder local
        if (!foto || foto.trim() === '') {
            foto = '/assets/images/placeholder.png';
        }
        const nueva = await db.crearLocalizacion(nombre, foto, disponible ?? true);
        res.status(201).json(nueva);
    } catch (err) {
        res.status(500).json({ error: 'Error al crear localización' });
    }
});

// Actualizar una localización
app.put('/localizaciones/:id', async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const { nombre, foto, disponible } = req.body as { nombre: string; foto: string; disponible?: boolean };
        const actualizada = await db.editarLocalizacion(id, nombre, foto, disponible ?? true);
        res.json(actualizada);
    } catch (err) {
        res.status(500).json({ error: 'Error al actualizar localización' });
    }
});

// Eliminar una localización
app.delete('/localizaciones/:id', async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        console.log('[BACK] Intentando borrar localización id:', id);
        // Obtener la localización antes de eliminar
        const loc = await db.obtenerLocalizacionPorId(id);
        console.log('[BACK] Localización encontrada:', loc);
        const result = await db.eliminarLocalizacion(id);
        console.log('[BACK] Resultado de borrado:', result);
        if (!result.success) {
            console.log('[BACK] No se pudo borrar:', result.message);
            return res.status(400).json({ error: result.message });
        }

        // Eliminar imagen asociada si existe
        if (loc && loc.foto_url && loc.foto_url.includes('/clientes/')) {
            const match = loc.foto_url.match(/clientes\/([^/]+)\/images\/([^?&#]+)/);
            if (match) {
                const cliente = match[1];
                const filename = match[2];
                const imgPath = require('path').join(process.cwd(), 'clientes', cliente, 'images', filename);
                const fs = require('fs');
                console.log('[BACK] Intentando borrar imagen:', imgPath);
                if (fs.existsSync(imgPath)) {
                    fs.unlinkSync(imgPath);
                    console.log('[BACK] Imagen borrada:', imgPath);
                    // git add/commit/push para eliminar de GitHub
                    const { execSync } = require('child_process');
                    execSync(`git add "${imgPath}"`, { cwd: process.cwd() });
                    execSync(`git commit -m "Eliminar imagen: ${filename}"`, { cwd: process.cwd() });
                    execSync(`git push`, { cwd: process.cwd() });
                    console.log('[BACK] Imagen eliminada de git:', filename);
                } else {
                    console.log('[BACK] Imagen no existe en disco:', imgPath);
                }
            } else {
                console.log('[BACK] No se pudo parsear cliente/filename de foto_url:', loc.foto_url);
            }
        } else {
            console.log('[BACK] No hay imagen asociada para borrar.');
        }
        res.status(204).send();
    } catch (err) {
        console.error('[BACK] Error al eliminar localización:', err);
        res.status(500).json({ error: 'Error al eliminar localización', details: String(err) });
    }
});

app.listen(port, () => {
    console.log(`API de localizaciones escuchando en http://localhost:${port}`);
});
