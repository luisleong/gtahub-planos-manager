// Script JS para inicializar la base de datos de N.C.S. y actualizar URLs de fotos
const { DatabaseManager } = require('../src/database/DatabaseManager');

(async function main() {
  try {
    const dbManager = new DatabaseManager();
    await dbManager.initialize();
    console.log('✅ Estructura de tablas creada');
    // Actualizar URLs de fotos de localizaciones
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
    const localizaciones = await dbManager.obtenerTodasLasLocalizaciones();
    for (const loc of localizaciones) {
      const match = /([a-z0-9_-]+\.png)$/i.exec(loc.foto_url || '');
      if (!match) continue;
      const file = match[1];
      if (!mapping[file]) continue;
      const nuevaUrl = baseUrl + mapping[file];
      await dbManager.actualizarLocalizacion(loc.id, loc.nombre, nuevaUrl, loc.disponible_para_fabricacion);
      console.log(`✔️ Localización ${loc.nombre}: ${nuevaUrl}`);
    }
    await dbManager.close();
    console.log('✅ Inicialización y actualización de URLs completada.');
  } catch (err) {
    console.error('❌ Error inicializando:', err);
    process.exit(1);
  }
})();
