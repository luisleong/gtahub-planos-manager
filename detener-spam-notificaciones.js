const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'planos.db');

console.log('🔄 Conectando a la base de datos para limpiar notificaciones...');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error conectando a la base de datos:', err);
        process.exit(1);
    }
    console.log('✅ Conectado a la base de datos SQLite');
});

// Primero, ver qué fabricaciones están causando el problema
console.log('\n📊 Analizando fabricaciones que están causando spam...');

db.all(`
    SELECT 
        f.id,
        l.nombre as localizacion,
        p.nombre as plano,
        f.propietario,
        f.listo_para_recoger,
        f.recogido,
        f.notificado,
        datetime(f.timestamp_colocacion, '+' || p.duracion_minutos || ' minutes') as completado_en,
        datetime('now') as ahora
    FROM fabricaciones f
    JOIN localizaciones l ON f.id_localizacion = l.id
    JOIN planos p ON f.id_plano = p.id
    WHERE f.listo_para_recoger = 1 
    AND f.recogido = 0 
    AND f.notificado = 0
`, (err, rows) => {
    if (err) {
        console.error('❌ Error consultando fabricaciones:', err);
        db.close();
        return;
    }

    console.log(`\n🔍 Encontradas ${rows.length} fabricaciones que están causando spam:`);
    
    if (rows.length === 0) {
        console.log('✅ No hay fabricaciones causando spam. ¡Problema solucionado!');
        db.close();
        return;
    }

    rows.forEach((row, index) => {
        console.log(`${index + 1}. ID: ${row.id} | ${row.plano} en ${row.localizacion} | Propietario: ${row.propietario}`);
        console.log(`   - listo_para_recoger: ${row.listo_para_recoger} | recogido: ${row.recogido} | notificado: ${row.notificado}`);
        console.log(`   - Completado en: ${row.completado_en}`);
    });

    // Marcar todas estas fabricaciones como notificadas para detener el spam
    console.log('\n🔧 Marcando todas estas fabricaciones como notificadas para detener el spam...');
    
    db.run(`
        UPDATE fabricaciones 
        SET notificado = 1, updated_at = CURRENT_TIMESTAMP
        WHERE listo_para_recoger = 1 
        AND recogido = 0 
        AND notificado = 0
    `, function(err) {
        if (err) {
            console.error('❌ Error actualizando fabricaciones:', err);
        } else {
            console.log(`✅ ${this.changes} fabricaciones marcadas como notificadas`);
            console.log('🎉 ¡Spam de notificaciones detenido!');
            console.log('\n📋 Las fabricaciones siguen estando listas para recoger,');
            console.log('   solo que ya no se enviarán más notificaciones de spam.');
        }
        
        db.close((err) => {
            if (err) {
                console.error('❌ Error cerrando base de datos:', err);
            } else {
                console.log('✅ Operación completada exitosamente');
            }
        });
    });
});
