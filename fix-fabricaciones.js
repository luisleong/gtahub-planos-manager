// Script temporal para limpiar fabricaciones problemáticas
// Ejecutar con: node fix-fabricaciones.js

const sqlite3 = require('sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'planos.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Revisando fabricaciones en la base de datos...');

// Obtener todas las fabricaciones
db.all(`
    SELECT 
        f.*,
        l.nombre as localizacion_nombre,
        p.nombre as plano_nombre,
        p.duracion_minutos as plano_duracion
    FROM fabricaciones f
    JOIN localizaciones l ON f.id_localizacion = l.id
    JOIN planos p ON f.id_plano = p.id
    ORDER BY f.id DESC
`, [], (err, rows) => {
    if (err) {
        console.error('❌ Error:', err);
        return;
    }
    
    console.log(`📊 Total de fabricaciones: ${rows.length}`);
    console.log('');
    
    rows.forEach(fab => {
        const ahora = new Date();
        const colocacion = new Date(fab.timestamp_colocacion);
        const minutosTranscurridos = Math.floor((ahora - colocacion) / (1000 * 60));
        const isCompleted = minutosTranscurridos >= fab.plano_duracion;
        
        console.log(`ID: ${fab.id} | ${fab.plano_nombre} en ${fab.localizacion_nombre}`);
        console.log(`  Propietario: ${fab.propietario}`);
        console.log(`  Colocado: ${fab.timestamp_colocacion}`);
        console.log(`  Duración: ${fab.plano_duracion} min | Transcurrido: ${minutosTranscurridos} min`);
        console.log(`  Estado: listo=${fab.listo_para_recoger} | recogido=${fab.recogido} | completado=${isCompleted}`);
        console.log(`  ---`);
    });
    
    // Mostrar fabricaciones problemáticas
    const problemáticas = rows.filter(fab => {
        const ahora = new Date();
        const colocacion = new Date(fab.timestamp_colocacion);
        const minutosTranscurridos = Math.floor((ahora - colocacion) / (1000 * 60));
        const isCompleted = minutosTranscurridos >= fab.plano_duracion;
        
        // Fabricaciones que están completadas pero no marcadas como listas O
        // Fabricaciones que están marcadas como listas pero no recogidas
        return (isCompleted && !fab.listo_para_recoger && !fab.recogido) || 
               (fab.listo_para_recoger && !fab.recogido);
    });
    
    console.log('');
    console.log(`⚠️  Fabricaciones problemáticas encontradas: ${problemáticas.length}`);
    
    if (problemáticas.length > 0) {
        console.log('');
        console.log('🔧 Para arreglar estas fabricaciones, puedes:');
        console.log('');
        console.log('1. Marcar como recogidas todas las problemáticas:');
        console.log(`   UPDATE fabricaciones SET recogido = 1, timestamp_recogida = '${new Date().toISOString()}' WHERE id IN (${problemáticas.map(f => f.id).join(', ')});`);
        console.log('');
        console.log('2. O eliminarlas completamente:');
        console.log(`   DELETE FROM fabricaciones WHERE id IN (${problemáticas.map(f => f.id).join(', ')});`);
        console.log('');
        
        // Opción de auto-fix
        console.log('¿Quieres que las marque automáticamente como recogidas? (y/n)');
        process.stdin.setEncoding('utf8');
        process.stdin.on('readable', () => {
            const chunk = process.stdin.read();
            if (chunk !== null && chunk.trim().toLowerCase() === 'y') {
                console.log('🔧 Marcando fabricaciones como recogidas...');
                
                const ids = problemáticas.map(f => f.id);
                const placeholders = ids.map(() => '?').join(', ');
                const sql = `UPDATE fabricaciones SET recogido = 1, timestamp_recogida = ? WHERE id IN (${placeholders})`;
                const params = [new Date().toISOString(), ...ids];
                
                db.run(sql, params, function(err) {
                    if (err) {
                        console.error('❌ Error actualizando:', err);
                    } else {
                        console.log(`✅ ${this.changes} fabricaciones marcadas como recogidas`);
                        console.log('🎉 ¡Problema resuelto! Las notificaciones deberían detenerse.');
                    }
                    
                    db.close();
                    process.exit(0);
                });
            } else {
                console.log('❌ Operación cancelada');
                db.close();
                process.exit(0);
            }
        });
    } else {
        console.log('✅ No se encontraron fabricaciones problemáticas');
        db.close();
    }
});
