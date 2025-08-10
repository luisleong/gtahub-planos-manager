// Script para actualizar las URLs de las fotos de localizaciones para el cliente N.C.S.
// Ejecuta: node scripts/actualizar_fotos_ncs.js

// Script para actualizar todas las URLs de fotos de localizaciones a la ruta dinámica del cliente
import { DatabaseManager } from '../src/database/DatabaseManager';

(async () => {
    const db = new DatabaseManager();
    await db.initialize();
    const actualizados = await db.actualizarTodasLasFotoURLs();
    console.log(`✅ URLs de fotos actualizadas: ${actualizados}`);
    await db.close();
})();

const path = require('path');
const Database = require('better-sqlite3');

// Configuración
const dbPath = path.resolve(__dirname, '../data/planos.db');
const repo = 'luisleong/gtahub-planos-manager';
const commit = 'aeb19db2992a3fbdeb37e9f24ec21c81ac5644aa'; // Actualiza si cambias imágenes
const baseUrl = `https://raw.githubusercontent.com/${repo}/${commit}/clientes/n-c-s/images/`;

const mapping = {
  'bunker.png': 'bunker.png',
  'cypress.png': 'cypress.png',
  'mansion.png': 'mansion.png',
  'mesa.png': 'mesa.png',
  'mirror.png': 'mirror.png',
  'ratonera.png': 'ratonera.png',
};

const db = new Database(dbPath);

try {
  const localizaciones = db.prepare('SELECT id, nombre, foto_url FROM localizaciones').all();
  for (const loc of localizaciones) {
    // Detectar nombre de archivo en la URL actual
    const match = /([a-z0-9_-]+\.png)$/i.exec(loc.foto_url || '');
    if (!match) continue;
    const file = match[1];
    if (!mapping[file]) continue;
    const nuevaUrl = baseUrl + mapping[file];
    db.prepare('UPDATE localizaciones SET foto_url = ? WHERE id = ?').run(nuevaUrl, loc.id);
    console.log(`✔️ Localización ${loc.nombre}: ${nuevaUrl}`);
  }
  console.log('✅ Actualización de URLs completada.');
} catch (err) {
  console.error('❌ Error actualizando URLs:', err);
  process.exit(1);
}
