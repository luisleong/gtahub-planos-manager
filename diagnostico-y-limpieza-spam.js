const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'planos.db');

console.log('🔍 DIAGNÓSTICO COMPLETO DEL SPAM DE NOTIFICACIONES');
console.log('================================================');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error conectando a la base de datos:', err);
        process.exit(1);
    }
    console.log('✅ Conectado a la base de datos SQLite\n');
});

// 1. Verificar estructura de la tabla
console.log('1️⃣ VERIFICANDO ESTRUCTURA DE LA TABLA FABRICACIONES:');
db.all("PRAGMA table_info(fabricaciones)", (err, columns) => {
    if (err) {
        console.error('❌ Error:', err);
        return;
    }
    
    console.log('Columnas encontradas:');
    columns.forEach(col => {
        console.log(`   - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
    });
    
    const tieneNotificado = columns.some(col => col.name === 'notificado');
    console.log(`\n🔍 Campo 'notificado' existe: ${tieneNotificado ? '✅ SÍ' : '❌ NO'}\n`);
    
    // 2. Buscar TODAS las fabricaciones problemáticas
    console.log('2️⃣ ANALIZANDO TODAS LAS FABRICACIONES:');
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
            datetime(f.timestamp_colocacion, '+' || p.duracion_minutos || ' minutes') as deberia_completarse,
            datetime('now') as ahora,
            CASE 
                WHEN datetime(f.timestamp_colocacion, '+' || p.duracion_minutos || ' minutes') <= datetime('now') 
                THEN 'COMPLETADO' 
                ELSE 'EN_PROCESO' 
            END as estado_real
        FROM fabricaciones f
        JOIN localizaciones l ON f.id_localizacion = l.id
        JOIN planos p ON f.id_plano = p.id
        ORDER BY f.id DESC
    `, (err, rows) => {
        if (err) {
            console.error('❌ Error:', err);
            return;
        }

        console.log(`📊 Total de fabricaciones encontradas: ${rows.length}\n`);
        
        if (rows.length === 0) {
            console.log('✅ No hay fabricaciones en la base de datos');
            db.close();
            return;
        }

        // Categorizar fabricaciones
        const enProceso = rows.filter(r => r.estado_real === 'EN_PROCESO' && !r.recogido);
        const completadasNoNotificadas = rows.filter(r => r.estado_real === 'COMPLETADO' && !r.listo_para_recoger && !r.notificado && !r.recogido);
        const listasNoNotificadas = rows.filter(r => r.listo_para_recoger && !r.recogido && !r.notificado);
        const listasYaNotificadas = rows.filter(r => r.listo_para_recoger && !r.recogido && r.notificado);
        const recogidas = rows.filter(r => r.recogido);

        console.log('📋 CATEGORIZACIÓN:');
        console.log(`   🟡 En proceso: ${enProceso.length}`);
        console.log(`   🔴 Completadas pero no marcadas como listas ni notificadas: ${completadasNoNotificadas.length}`);
        console.log(`   ⚠️  Listas pero no notificadas (CAUSA DEL SPAM): ${listasNoNotificadas.length}`);
        console.log(`   ✅ Listas y ya notificadas: ${listasYaNotificadas.length}`);
        console.log(`   🏁 Recogidas: ${recogidas.length}\n`);

        // Mostrar detalles de las problemáticas
        if (completadasNoNotificadas.length > 0) {
            console.log('🔴 COMPLETADAS PERO NO MARCADAS COMO LISTAS:');
            completadasNoNotificadas.forEach(fab => {
                console.log(`   ID: ${fab.id} | ${fab.plano} en ${fab.localizacion} | ${fab.propietario}`);
                console.log(`      Completado en: ${fab.deberia_completarse}`);
                console.log(`      Estados: listo=${fab.listo_para_recoger}, recogido=${fab.recogido}, notificado=${fab.notificado}`);
            });
            console.log('');
        }

        if (listasNoNotificadas.length > 0) {
            console.log('⚠️ LISTAS PERO NO NOTIFICADAS (ESTAS CAUSAN EL SPAM):');
            listasNoNotificadas.forEach(fab => {
                console.log(`   ID: ${fab.id} | ${fab.plano} en ${fab.localizacion} | ${fab.propietario}`);
                console.log(`      Estados: listo=${fab.listo_para_recoger}, recogido=${fab.recogido}, notificado=${fab.notificado}`);
            });
            console.log('');
        }

        // 3. EJECUTAR LIMPIEZA AUTOMÁTICA
        console.log('3️⃣ EJECUTANDO LIMPIEZA AUTOMÁTICA...');
        
        // Marcar completadas como listas Y notificadas
        if (completadasNoNotificadas.length > 0) {
            db.run(`
                UPDATE fabricaciones 
                SET listo_para_recoger = 1, notificado = 1, updated_at = CURRENT_TIMESTAMP
                WHERE id IN (${completadasNoNotificadas.map(f => f.id).join(',')})
            `, function(err) {
                if (err) {
                    console.error('❌ Error actualizando completadas:', err);
                } else {
                    console.log(`✅ ${this.changes} fabricaciones completadas marcadas como listas Y notificadas`);
                }
            });
        }

        // Marcar las listas como notificadas (ESTO DETIENE EL SPAM)
        if (listasNoNotificadas.length > 0) {
            db.run(`
                UPDATE fabricaciones 
                SET notificado = 1, updated_at = CURRENT_TIMESTAMP
                WHERE id IN (${listasNoNotificadas.map(f => f.id).join(',')})
            `, function(err) {
                if (err) {
                    console.error('❌ Error actualizando listas:', err);
                } else {
                    console.log(`✅ ${this.changes} fabricaciones listas marcadas como notificadas - SPAM DETENIDO`);
                }
                
                // Cerrar base de datos después de todas las operaciones
                setTimeout(() => {
                    console.log('\n🎉 LIMPIEZA COMPLETADA - EL SPAM DEBERÍA DETENERSE');
                    console.log('🔄 El bot detectará los cambios en el próximo ciclo (1 minuto)');
                    db.close();
                }, 1000);
            });
        } else {
            setTimeout(() => {
                console.log('\n✅ No se encontraron fabricaciones causando spam');
                db.close();
            }, 1000);
        }
    });
});
