const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'planos.db');

console.log('🔍 VERIFICACIÓN DEL ESTADO ACTUAL DE BUNKER');
console.log('==========================================');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error conectando a la base de datos:', err);
        process.exit(1);
    }
    console.log('✅ Conectado a la base de datos SQLite\n');
});

// Verificar específicamente la fabricación en Bunker
console.log('🏢 ESTADO ACTUAL DE FABRICACIONES EN BUNKER:');

db.all(`
    SELECT 
        f.id,
        l.nombre as localizacion,
        p.nombre as plano,
        f.propietario,
        f.listo_para_recoger,
        f.recogido,
        f.notificado,
        f.timestamp_colocacion,
        p.duracion_minutos,
        datetime(f.timestamp_colocacion, '+' || p.duracion_minutos || ' minutes') as deberia_estar_listo,
        datetime('now') as ahora,
        CASE 
            WHEN datetime(f.timestamp_colocacion, '+' || p.duracion_minutos || ' minutes') <= datetime('now') 
            THEN 'DEBERÍA_ESTAR_COMPLETADO' 
            ELSE 'AÚN_EN_PROCESO' 
        END as estado_esperado
    FROM fabricaciones f
    JOIN localizaciones l ON f.id_localizacion = l.id
    JOIN planos p ON f.id_plano = p.id
    WHERE l.nombre = 'Bunker'
    ORDER BY f.id DESC
`, (err, rows) => {
    if (err) {
        console.error('❌ Error:', err);
        db.close();
        return;
    }

    console.log(`📊 Fabricaciones en Bunker encontradas: ${rows.length}\n`);
    
    if (rows.length === 0) {
        console.log('ℹ️ No hay fabricaciones en Bunker');
        db.close();
        return;
    }

    rows.forEach((row, index) => {
        console.log(`${index + 1}. FABRICACIÓN ID: ${row.id}`);
        console.log(`   📍 Localización: ${row.localizacion}`);
        console.log(`   📋 Plano: ${row.plano} (${row.duracion_minutos} minutos)`);
        console.log(`   👤 Propietario: ${row.propietario}`);
        console.log(`   📅 Colocado en: ${row.timestamp_colocacion}`);
        console.log(`   ⏰ Debería estar listo: ${row.deberia_estar_listo}`);
        console.log(`   🔄 Estado esperado: ${row.estado_esperado}`);
        console.log(`   📊 ESTADOS ACTUALES:`);
        console.log(`      - listo_para_recoger: ${row.listo_para_recoger} ${row.listo_para_recoger ? '✅' : '❌'}`);
        console.log(`      - recogido: ${row.recogido} ${row.recogido ? '✅' : '❌'}`);
        console.log(`      - notificado: ${row.notificado} ${row.notificado ? '✅' : '❌'}`);
        
        // Análisis del estado
        if (row.estado_esperado === 'DEBERÍA_ESTAR_COMPLETADO') {
            if (!row.listo_para_recoger) {
                console.log(`   ⚠️  PROBLEMA: Debería estar marcado como listo_para_recoger=1`);
            }
            if (row.recogido) {
                console.log(`   ⚠️  PROBLEMA: Está marcado como recogido pero debería estar listo para recoger`);
            }
        }
        
        console.log('   ─────────────────────────────────────');
    });

    // Verificar si hay algún problema que necesite corrección
    const fabricacionesConProblemas = rows.filter(r => {
        // Casos problemáticos:
        // 1. Debería estar completado pero no está marcado como listo
        // 2. Está marcado como recogido cuando no debería
        return (r.estado_esperado === 'DEBERÍA_ESTAR_COMPLETADO' && !r.listo_para_recoger) ||
               (r.recogido && r.estado_esperado === 'DEBERÍA_ESTAR_COMPLETADO' && !r.listo_para_recoger);
    });

    if (fabricacionesConProblemas.length > 0) {
        console.log(`\n⚠️  ENCONTRADOS ${fabricacionesConProblemas.length} PROBLEMAS:`);
        
        fabricacionesConProblemas.forEach(fab => {
            console.log(`   - ID ${fab.id}: Necesita corrección de estados`);
        });

        console.log('\n🔧 ¿APLICAR CORRECCIONES AUTOMÁTICAS?');
        console.log('   - Marcará fabricaciones completadas como listo_para_recoger=1');
        console.log('   - Desmarcará como recogido si no corresponde');
        console.log('   - NO ejecutará automáticamente - solo mostrará SQL sugerido');
        
        // Generar SQL para correcciones
        console.log('\n📝 SQL SUGERIDO PARA CORRECCIONES:');
        fabricacionesConProblemas.forEach(fab => {
            if (fab.estado_esperado === 'DEBERÍA_ESTAR_COMPLETADO' && !fab.listo_para_recoger) {
                console.log(`UPDATE fabricaciones SET listo_para_recoger = 1, notificado = 1 WHERE id = ${fab.id}; -- Marcar como listo`);
            }
            if (fab.recogido && !fab.listo_para_recoger) {
                console.log(`UPDATE fabricaciones SET recogido = 0, timestamp_recogida = NULL WHERE id = ${fab.id}; -- Desmarcar como recogido`);
            }
        });
    } else {
        console.log('\n✅ No se encontraron problemas en las fabricaciones de Bunker');
    }

    db.close((err) => {
        if (err) {
            console.error('❌ Error cerrando BD:', err);
        } else {
            console.log('\n✅ Verificación completada');
        }
    });
});
