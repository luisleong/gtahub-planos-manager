const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'planos.db');

console.log('🔧 LIMPIEZA ESPECÍFICA PARA DETENER SPAM');
console.log('=====================================');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error conectando a la base de datos:', err);
        process.exit(1);
    }
    console.log('✅ Conectado a la base de datos SQLite\n');
});

// Buscar ESPECÍFICAMENTE las fabricaciones que están causando spam
console.log('🔍 Buscando fabricaciones que están listas pero no notificadas...');

db.all(`
    SELECT 
        f.id,
        l.nombre as localizacion,
        p.nombre as plano,
        f.propietario,
        f.listo_para_recoger,
        f.recogido,
        f.notificado,
        f.timestamp_colocacion
    FROM fabricaciones f
    JOIN localizaciones l ON f.id_localizacion = l.id
    JOIN planos p ON f.id_plano = p.id
    WHERE f.listo_para_recoger = 1 
    AND f.recogido = 0 
    AND f.notificado = 0
    ORDER BY f.id
`, (err, rows) => {
    if (err) {
        console.error('❌ Error consultando:', err);
        db.close();
        return;
    }

    console.log(`📊 Fabricaciones encontradas que causan spam: ${rows.length}\n`);
    
    if (rows.length === 0) {
        console.log('✅ No hay fabricaciones causando spam.');
        console.log('🔍 El problema puede ser otro. Verificando si hay duplicaciones...\n');
        
        // Verificar si hay fabricaciones duplicadas en Bunker
        db.all(`
            SELECT 
                f.id,
                l.nombre as localizacion,
                p.nombre as plano,
                f.propietario,
                f.listo_para_recoger,
                f.recogido,
                f.notificado
            FROM fabricaciones f
            JOIN localizaciones l ON f.id_localizacion = l.id
            JOIN planos p ON f.id_plano = p.id
            WHERE l.nombre = 'Bunker'
            ORDER BY f.id DESC
        `, (err2, bunkerRows) => {
            if (err2) {
                console.error('❌ Error:', err2);
                db.close();
                return;
            }
            
            console.log(`🏢 Fabricaciones en Bunker encontradas: ${bunkerRows.length}`);
            bunkerRows.forEach(row => {
                console.log(`   ID: ${row.id} | ${row.plano} | ${row.propietario} | listo: ${row.listo_para_recoger} | recogido: ${row.recogido} | notificado: ${row.notificado}`);
            });
            
            db.close();
        });
        return;
    }

    // Mostrar las que causan spam
    console.log('⚠️ ESTAS FABRICACIONES ESTÁN CAUSANDO EL SPAM:');
    rows.forEach((row, index) => {
        console.log(`${index + 1}. ID: ${row.id} | ${row.plano} en ${row.localizacion} | ${row.propietario}`);
        console.log(`   Estados: listo=${row.listo_para_recoger}, recogido=${row.recogido}, notificado=${row.notificado}`);
    });

    // Marcar como notificadas para detener el spam
    console.log('\n🔧 Marcando todas como notificadas para detener el spam...');
    
    const ids = rows.map(r => r.id).join(',');
    db.run(`
        UPDATE fabricaciones 
        SET notificado = 1, updated_at = CURRENT_TIMESTAMP
        WHERE id IN (${ids})
    `, function(err) {
        if (err) {
            console.error('❌ Error:', err);
        } else {
            console.log(`✅ ${this.changes} fabricaciones marcadas como notificadas`);
            console.log('🎉 ¡SPAM DETENIDO! El bot ya no enviará más notificaciones repetidas');
        }
        
        db.close((err) => {
            if (err) {
                console.error('❌ Error cerrando BD:', err);
            } else {
                console.log('✅ Limpieza completada');
            }
        });
    });
});
