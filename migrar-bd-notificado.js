const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'planos.db');

console.log('🔄 Iniciando migración para agregar campo "notificado"...');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error conectando a la base de datos:', err);
        process.exit(1);
    }
    console.log('✅ Conectado a la base de datos SQLite');
});

// Verificar si la columna ya existe
db.get("PRAGMA table_info(fabricaciones)", (err, row) => {
    if (err) {
        console.error('❌ Error verificando tabla:', err);
        db.close();
        return;
    }
});

// Agregar la columna notificado si no existe
db.run(`ALTER TABLE fabricaciones ADD COLUMN notificado BOOLEAN NOT NULL DEFAULT 0`, (err) => {
    if (err) {
        if (err.message.includes('duplicate column name')) {
            console.log('ℹ️ La columna "notificado" ya existe, no es necesario migrar');
        } else {
            console.error('❌ Error agregando columna:', err);
        }
    } else {
        console.log('✅ Columna "notificado" agregada exitosamente');
    }
    db.close((err) => {
        if (err) {
            console.error('❌ Error cerrando base de datos:', err);
        } else {
            console.log('✅ Migración completada');
        }
    });
});
