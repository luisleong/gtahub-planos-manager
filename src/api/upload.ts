import express, { Request, Response } from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const router = express.Router();

// Configuración de multer para guardar en la carpeta de imágenes del cliente
const cliente = process.env.CLIENTE || 'n-c-s';
const imagesDir = path.join(process.cwd(), 'clientes', cliente, 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, imagesDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage });

// Endpoint para subir imagen y hacer git push
router.post('/', upload.single('imagen'), async (req: Request, res: Response) => {
  try {
    const file = (req as any).file as Express.Multer.File;
    console.log('[UPLOAD] Archivo recibido:', file ? file.originalname : null, 'size:', file ? file.size : null);
    if (!file) {
      console.error('[UPLOAD] No se recibió archivo');
      return res.status(400).json({ error: 'No se recibió archivo' });
    }

    // Verificar que el archivo realmente existe y tiene contenido
    const stats = fs.statSync(file.path);
    console.log('[UPLOAD] fs.statSync:', stats);
    if (stats.size === 0) {
      console.error('[UPLOAD] El archivo subido está vacío:', file.path);
      return res.status(500).json({ error: 'El archivo subido está vacío. Intenta de nuevo.' });
    }

    // git add, commit y push
    try {
      execSync(`git add "${file.path}"`, { cwd: process.cwd() });
      execSync(`git commit -m "Nueva imagen subida: ${file.filename}"`, { cwd: process.cwd() });
      execSync(`git push`, { cwd: process.cwd() });
      console.log('[UPLOAD] git add/commit/push OK:', file.path);
    } catch (gitErr) {
      console.error('[UPLOAD] Error en git add/commit/push:', gitErr);
      return res.status(500).json({ error: 'Error en git', details: String(gitErr) });
    }

    // Generar la URL cruda de GitHub correctamente
    const url = `https://raw.githubusercontent.com/luisleong/gtahub-planos-manager/main/clientes/${cliente}/images/${file.filename}`;
    console.log('[UPLOAD] URL generada:', url);
    res.json({ url });
  } catch (err) {
    console.error('[UPLOAD] Error general en subida:', err);
    res.status(500).json({ error: 'Error al subir imagen', details: String(err) });
  }
});

export default router;
