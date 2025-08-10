import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

export interface Localizacion {
    id: number;
    nombre: string;
    foto_url?: string;
    disponible_para_fabricacion: boolean;
    mensaje_persistente_id?: string;
    canal_persistente_id?: string;
    created_at: string;
    updated_at: string;
}

export interface Plano {
    id: number;
    nombre: string;
    icono_url?: string;
    duracion_minutos: number;
    created_at: string;
    updated_at: string;
}

export interface Fabricacion {
    id: number;
    id_localizacion: number;
    id_plano: number;
    propietario: string;
    propietario_id: string;
    timestamp_colocacion: string;
    timestamp_recogida?: string;
    listo_para_recoger: boolean;
    recogido: boolean;
    notificado: boolean;
    notas?: string;
    canal_notificacion?: string;
    created_at: string;
    updated_at: string;
}

// Vista combinada para facilitar queries
export interface FabricacionCompleta extends Fabricacion {
    localizacion_nombre: string;
    localizacion_foto?: string;
    plano_nombre: string;
    plano_icono?: string;
    plano_duracion: number;
}

export class DatabaseManager {
    /**
     * Editar una localización existente
     */
    public async editarLocalizacion(id: number, nombre: string, fotoUrl?: string, disponible: boolean = true): Promise<Localizacion | null> {
        return new Promise((resolve, reject) => {
            const sql = 'UPDATE localizaciones SET nombre = ?, foto_url = ?, disponible_para_fabricacion = ? WHERE id = ?';
            this.db.run(sql, [nombre, fotoUrl, disponible, id], (err) => {
                if (err) {
                    reject(err);
                } else {
                    // Obtener la localización actualizada
                    const selectSql = 'SELECT * FROM localizaciones WHERE id = ?';
                    this.db.get(selectSql, [id], (err2, row) => {
                        if (err2) {
                            reject(err2);
                        } else {
                            resolve(row as Localizacion || null);
                        }
                    });
                }
            });
        });
    }
    private db: sqlite3.Database;
    private dbPath: string;

    constructor() {
        // Usar ruta de la base de datos desde .env, o por defecto data/planos.db
        const dbPathEnv = process.env.DATABASE_PATH;
        let dbPathFinal: string;
        if (dbPathEnv) {
            dbPathFinal = path.isAbsolute(dbPathEnv) ? dbPathEnv : path.join(process.cwd(), dbPathEnv);
        } else {
            const dataDir = path.join(process.cwd(), 'data');
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            dbPathFinal = path.join(dataDir, 'planos.db');
        }
        this.dbPath = dbPathFinal;
        this.db = new sqlite3.Database(this.dbPath);
    }

    /**
     * Actualiza todas las URLs de fotos de localizaciones a la ruta dinámica del cliente actual
     */
    public async actualizarTodasLasFotoURLs(): Promise<number> {
        const cliente = process.env.CLIENTE || 'n-c-s';
        // Nombres de localizaciones soportadas
        const nombres = [
            'Cypress', 'Mesa', 'Mirror', 'Bunker', 'Mansion', 'Ratonera', 'Retruco'
        ];
        let actualizados = 0;
        for (const nombre of nombres) {
            const nuevaURL = `https://raw.githubusercontent.com/luisleong/gtahub-planos-manager/main/clientes/${cliente.toLowerCase()}/images/${nombre.toLowerCase()}.png`;
            await new Promise<void>((resolve, reject) => {
                this.db.run(
                    'UPDATE localizaciones SET foto_url = ? WHERE nombre = ?',
                    [nuevaURL, nombre],
                    function (err) {
                        if (err) reject(err);
                        else {
                            if (this.changes > 0) actualizados += this.changes;
                            resolve();
                        }
                    }
                );
            });
        }
        return actualizados;
    }

    /**
     * Inicializar la base de datos y crear tablas
     */
    public async initialize(): Promise<void> {
        return new Promise((resolve, reject) => {
            // Crear tabla de localizaciones
            const createLocalizacionesTable = `
                CREATE TABLE IF NOT EXISTS localizaciones (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nombre TEXT NOT NULL UNIQUE,
                    foto_url TEXT,
                    disponible_para_fabricacion BOOLEAN NOT NULL DEFAULT 1,
                    mensaje_persistente_id TEXT,
                    canal_persistente_id TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            `;

            // Crear tabla de planos
            const createPlanosTable = `
                CREATE TABLE IF NOT EXISTS planos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nombre TEXT NOT NULL UNIQUE,
                    icono_url TEXT,
                    duracion_minutos INTEGER NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            `;

            // Crear tabla de fabricaciones
            const createFabricacionesTable = `
                CREATE TABLE IF NOT EXISTS fabricaciones (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    id_localizacion INTEGER NOT NULL,
                    id_plano INTEGER NOT NULL,
                    propietario TEXT NOT NULL,
                    propietario_id TEXT NOT NULL,
                    timestamp_colocacion TEXT NOT NULL,
                    timestamp_recogida TEXT,
                    listo_para_recoger BOOLEAN NOT NULL DEFAULT 0,
                    recogido BOOLEAN NOT NULL DEFAULT 0,
                    notificado BOOLEAN NOT NULL DEFAULT 0,
                    notas TEXT,
                    canal_notificacion TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (id_localizacion) REFERENCES localizaciones(id),
                    FOREIGN KEY (id_plano) REFERENCES planos(id)
                )
            `;

            // Ejecutar creación de tablas en serie
            this.db.serialize(() => {
                this.db.run(createLocalizacionesTable);
                this.db.run(createPlanosTable);
                this.db.run(createFabricacionesTable, (err) => {
                    if (err) {
                        console.error('❌ Error creando tablas:', err);
                        reject(err);
                    } else {
                        console.log('✅ Tablas inicializadas correctamente');
                        
                        // Solo insertar datos iniciales si la variable de entorno lo permite
                        const insertarDatosDemo = process.env.INSERTAR_DATOS_DEMO === 'true';
                        
                        if (insertarDatosDemo) {
                            console.log('🔄 Insertando datos de demostración...');
                            this.insertarDatosIniciales().then(() => {
                                resolve();
                            }).catch(reject);
                        } else {
                            console.log('ℹ️ Datos de demostración desactivados (INSERTAR_DATOS_DEMO=false)');
                            resolve();
                        }
                    }
                });
            });
        });
    }

    /**
     * Insertar datos iniciales si no existen
     */
    private async insertarDatosIniciales(): Promise<void> {
        // Obtener nombre del cliente desde .env o config
        const cliente = process.env.CLIENTE || 'n-c-s';
        // Datos iniciales de localizaciones (usando imágenes específicas del cliente)
        const localizacionesIniciales = [
            { nombre: 'Cypress', foto_url: `https://raw.githubusercontent.com/luisleong/gtahub-planos-manager/main/clientes/${cliente.toLowerCase()}/images/cypress.png` },
            { nombre: 'Mesa', foto_url: `https://raw.githubusercontent.com/luisleong/gtahub-planos-manager/main/clientes/${cliente.toLowerCase()}/images/mesa.png` },
            { nombre: 'Mirror', foto_url: `https://raw.githubusercontent.com/luisleong/gtahub-planos-manager/main/clientes/${cliente.toLowerCase()}/images/mirror.png` },
            { nombre: 'Bunker', foto_url: `https://raw.githubusercontent.com/luisleong/gtahub-planos-manager/main/clientes/${cliente.toLowerCase()}/images/bunker.png` },
            { nombre: 'Mansion', foto_url: `https://raw.githubusercontent.com/luisleong/gtahub-planos-manager/main/clientes/${cliente.toLowerCase()}/images/mansion.png` },
            { nombre: 'Ratonera', foto_url: `https://raw.githubusercontent.com/luisleong/gtahub-planos-manager/main/clientes/${cliente.toLowerCase()}/images/ratonera.png` },
            { nombre: 'Retruco', foto_url: `https://raw.githubusercontent.com/luisleong/gtahub-planos-manager/main/clientes/${cliente.toLowerCase()}/images/retruco.png` },
        ];

        // Datos iniciales de planos (usando iconos SVG del repositorio)
        const planosIniciales = [
            { nombre: 'Amarillo', icono_url: 'https://raw.githubusercontent.com/luisleong/gtahub-planos-manager/main/src/images/planos/amarillo.svg', duracion_minutos: 600 },
            { nombre: 'Morado', icono_url: 'https://raw.githubusercontent.com/luisleong/gtahub-planos-manager/main/src/images/planos/morado.svg', duracion_minutos: 360 },
            { nombre: 'Joyería', icono_url: 'https://raw.githubusercontent.com/luisleong/gtahub-planos-manager/main/src/images/planos/joyeria.svg', duracion_minutos: 1440 },
            { nombre: 'Arquitectonico', icono_url: 'https://raw.githubusercontent.com/luisleong/gtahub-planos-manager/main/src/images/planos/arquitectonico.svg', duracion_minutos: 1040 }
        ];

        try {
            // Insertar localizaciones
            for (const loc of localizacionesIniciales) {
                await this.crearLocalizacion(loc.nombre, loc.foto_url);
            }

            // Insertar planos
            for (const plano of planosIniciales) {
                await this.crearPlano(plano.nombre, plano.duracion_minutos, plano.icono_url);
            }

            console.log('✅ Datos iniciales insertados correctamente');
        } catch (error) {
            console.log('ℹ️ Datos iniciales ya existen o error insertando:', error);
        }
    }

    // ======================
    // MÉTODOS LOCALIZACIONES
    // ======================

    public async crearLocalizacion(nombre: string, fotoUrl?: string, disponible: boolean = true): Promise<number> {
        return new Promise((resolve, reject) => {
            const sql = 'INSERT OR IGNORE INTO localizaciones (nombre, foto_url, disponible_para_fabricacion) VALUES (?, ?, ?)';
            
            this.db.run(sql, [nombre, fotoUrl, disponible], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    public async obtenerLocalizaciones(): Promise<Localizacion[]> {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM localizaciones WHERE disponible_para_fabricacion = 1 ORDER BY nombre';
            
            this.db.all(sql, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows as Localizacion[]);
                }
            });
        });
    }

    public async obtenerTodasLasLocalizaciones(): Promise<Localizacion[]> {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM localizaciones ORDER BY nombre';
            
            this.db.all(sql, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows as Localizacion[]);
                }
            });
        });
    }

    public async obtenerLocalizacionPorId(id: number): Promise<Localizacion | null> {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM localizaciones WHERE id = ?';
            
            this.db.get(sql, [id], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row as Localizacion || null);
                }
            });
        });
    }

    public async actualizarLocalizacion(id: number, nombre: string, fotoUrl?: string, disponible?: boolean): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE localizaciones 
                SET nombre = ?, foto_url = ?, disponible_para_fabricacion = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `;
            
            this.db.run(sql, [nombre, fotoUrl, disponible, id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes > 0);
                }
            });
        });
    }

    public async actualizarMensajePersistente(id: number, mensajeId: string, canalId: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE localizaciones 
                SET mensaje_persistente_id = ?, canal_persistente_id = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `;
            
            this.db.run(sql, [mensajeId, canalId, id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes > 0);
                }
            });
        });
    }

    public async limpiarMensajePersistente(id: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE localizaciones 
                SET mensaje_persistente_id = NULL, canal_persistente_id = NULL, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `;
            
            this.db.run(sql, [id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes > 0);
                }
            });
        });
    }

    public async eliminarLocalizacion(id: number): Promise<{ success: boolean; message: string }> {
        return new Promise(async (resolve, reject) => {
            try {
                // Eliminar fabricaciones asociadas primero (en cascada)
                const sqlFab = 'DELETE FROM fabricaciones WHERE id_localizacion = ?';
                await new Promise((res, rej) => {
                    this.db.run(sqlFab, [id], function(err) {
                        if (err) rej(err); else res(true);
                    });
                });

                // Eliminar la localización
                const sql = 'DELETE FROM localizaciones WHERE id = ?';
                this.db.run(sql, [id], function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({
                            success: this.changes > 0,
                            message: this.changes > 0 ? 'Localización eliminada correctamente.' : 'Localización no encontrada.'
                        });
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    private async obtenerFabricacionesPorLocalizacion(localizacionId: number): Promise<FabricacionCompleta[]> {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    f.*,
                    l.nombre as localizacion_nombre,
                    l.foto_url as localizacion_foto,
                    p.nombre as plano_nombre,
                    p.icono_url as plano_icono,
                    p.duracion_minutos as plano_duracion
                FROM fabricaciones f
                JOIN localizaciones l ON f.id_localizacion = l.id
                JOIN planos p ON f.id_plano = p.id
                WHERE f.id_localizacion = ?
            `;
            
            this.db.all(sql, [localizacionId], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows as FabricacionCompleta[]);
                }
            });
        });
    }

    // =================
    // MÉTODOS PLANOS
    // =================

    public async crearPlano(nombre: string, duracionMinutos: number, iconoUrl?: string): Promise<number> {
        return new Promise((resolve, reject) => {
            const sql = 'INSERT OR IGNORE INTO planos (nombre, duracion_minutos, icono_url) VALUES (?, ?, ?)';
            this.db.run(sql, [nombre, duracionMinutos, iconoUrl], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }


    public async obtenerPlanos(): Promise<Plano[]> {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM planos ORDER BY nombre';
            
            this.db.all(sql, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows as Plano[]);
                }
            });
        });
    }

    public async obtenerPlanoPorId(id: number): Promise<Plano | null> {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM planos WHERE id = ?';
            
            this.db.get(sql, [id], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row as Plano || null);
                }
            });
        });
    }

    public async actualizarPlano(id: number, nombre: string, duracionMinutos: number, iconoUrl?: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE planos 
                SET nombre = ?, duracion_minutos = ?, icono_url = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `;
            
            this.db.run(sql, [nombre, duracionMinutos, iconoUrl, id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes > 0);
                }
            });
        });
    }

    public async eliminarPlano(id: number): Promise<{ success: boolean; message: string }> {
        return new Promise(async (resolve, reject) => {
            try {
                // Verificar si hay fabricaciones activas con este plano
                const fabricacionesActivas = await this.obtenerFabricacionesPorPlano(id);
                const tieneActivas = fabricacionesActivas.some(fab => !fab.recogido);

                if (tieneActivas) {
                    resolve({
                        success: false,
                        message: 'No se puede eliminar el plano porque tiene fabricaciones activas.'
                    });
                    return;
                }

                // Eliminar el plano
                const sql = 'DELETE FROM planos WHERE id = ?';
                this.db.run(sql, [id], function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({
                            success: this.changes > 0,
                            message: this.changes > 0 ? 'Plano eliminado correctamente.' : 'Plano no encontrado.'
                        });
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    private async obtenerFabricacionesPorPlano(planoId: number): Promise<FabricacionCompleta[]> {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    f.*,
                    l.nombre as localizacion_nombre,
                    l.foto_url as localizacion_foto,
                    p.nombre as plano_nombre,
                    p.icono_url as plano_icono,
                    p.duracion_minutos as plano_duracion
                FROM fabricaciones f
                JOIN localizaciones l ON f.id_localizacion = l.id
                JOIN planos p ON f.id_plano = p.id
                WHERE f.id_plano = ?
            `;
            
            this.db.all(sql, [planoId], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows as FabricacionCompleta[]);
                }
            });
        });
    }

    // =====================
    // MÉTODOS FABRICACIONES
    // =====================

    public async crearFabricacion(
        idLocalizacion: number,
        idPlano: number,
        propietario: string,
        propietarioId: string,
        notas?: string,
        canalNotificacion?: string
    ): Promise<number> {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO fabricaciones (
                    id_localizacion, id_plano, propietario, propietario_id,
                    timestamp_colocacion, notas, canal_notificacion
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            
            const params = [
                idLocalizacion,
                idPlano,
                propietario,
                propietarioId,
                new Date().toISOString(),
                notas || null,
                canalNotificacion || null
            ];

            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    public async obtenerFabricaciones(): Promise<FabricacionCompleta[]> {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    f.*,
                    l.nombre as localizacion_nombre,
                    l.foto_url as localizacion_foto,
                    p.nombre as plano_nombre,
                    p.icono_url as plano_icono,
                    p.duracion_minutos as plano_duracion
                FROM fabricaciones f
                JOIN localizaciones l ON f.id_localizacion = l.id
                JOIN planos p ON f.id_plano = p.id
                ORDER BY f.created_at DESC
            `;
            
            this.db.all(sql, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows as FabricacionCompleta[]);
                }
            });
        });
    }

    public async obtenerFabricacionesPorUsuario(usuarioId: string): Promise<FabricacionCompleta[]> {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    f.*,
                    l.nombre as localizacion_nombre,
                    l.foto_url as localizacion_foto,
                    p.nombre as plano_nombre,
                    p.icono_url as plano_icono,
                    p.duracion_minutos as plano_duracion
                FROM fabricaciones f
                JOIN localizaciones l ON f.id_localizacion = l.id
                JOIN planos p ON f.id_plano = p.id
                WHERE f.propietario_id = ?
                ORDER BY f.created_at DESC
            `;
            
            this.db.all(sql, [usuarioId], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows as FabricacionCompleta[]);
                }
            });
        });
    }

    public async obtenerFabricacionesPorEstado(estado: 'en_proceso' | 'listo' | 'recogido'): Promise<FabricacionCompleta[]> {
        return new Promise((resolve, reject) => {
            let whereClause = '';
            
            switch (estado) {
                case 'en_proceso':
                    whereClause = 'f.listo_para_recoger = 0 AND f.recogido = 0';
                    break;
                case 'listo':
                    whereClause = 'f.listo_para_recoger = 1 AND f.recogido = 0';
                    break;
                case 'recogido':
                    whereClause = 'f.recogido = 1';
                    break;
            }

            const sql = `
                SELECT 
                    f.*,
                    l.nombre as localizacion_nombre,
                    l.foto_url as localizacion_foto,
                    p.nombre as plano_nombre,
                    p.icono_url as plano_icono,
                    p.duracion_minutos as plano_duracion
                FROM fabricaciones f
                JOIN localizaciones l ON f.id_localizacion = l.id
                JOIN planos p ON f.id_plano = p.id
                WHERE ${whereClause}
                ORDER BY f.created_at DESC
            `;
            
            this.db.all(sql, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows as FabricacionCompleta[]);
                }
            });
        });
    }

    public async obtenerFabricacionPorId(id: number): Promise<FabricacionCompleta | null> {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    f.*,
                    l.nombre as localizacion_nombre,
                    l.foto_url as localizacion_foto,
                    p.nombre as plano_nombre,
                    p.icono_url as plano_icono,
                    p.duracion_minutos as plano_duracion
                FROM fabricaciones f
                JOIN localizaciones l ON f.id_localizacion = l.id
                JOIN planos p ON f.id_plano = p.id
                WHERE f.id = ?
            `;
            
            this.db.get(sql, [id], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row as FabricacionCompleta || null);
                }
            });
        });
    }

    public async marcarComoListo(id: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const sql = 'UPDATE fabricaciones SET listo_para_recoger = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
            
            this.db.run(sql, [id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes > 0);
                }
            });
        });
    }

    public async marcarComoNotificado(id: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const sql = 'UPDATE fabricaciones SET notificado = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
            
            this.db.run(sql, [id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes > 0);
                }
            });
        });
    }

    public async marcarComoRecogido(id: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE fabricaciones 
                SET recogido = 1, timestamp_recogida = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `;
            
            this.db.run(sql, [new Date().toISOString(), id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes > 0);
                }
            });
        });
    }

    public async obtenerFabricacionesParaNotificar(): Promise<FabricacionCompleta[]> {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    f.*,
                    l.nombre as localizacion_nombre,
                    l.foto_url as localizacion_foto,
                    p.nombre as plano_nombre,
                    p.icono_url as plano_icono,
                    p.duracion_minutos as plano_duracion
                FROM fabricaciones f
                JOIN localizaciones l ON f.id_localizacion = l.id
                JOIN planos p ON f.id_plano = p.id
                WHERE f.listo_para_recoger = 0 
                AND f.recogido = 0
                AND f.notificado = 0
                AND datetime(f.timestamp_colocacion, '+' || p.duracion_minutos || ' minutes') <= datetime('now')
            `;
            
            this.db.all(sql, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows as FabricacionCompleta[]);
                }
            });
        });
    }

    /**
     * Métodos de limpieza masiva para administración
     */
    public async limpiarTodasLasLocalizaciones(): Promise<number> {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM localizaciones', function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    }

    public async limpiarTodosLosPlanos(): Promise<number> {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM planos', function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    }

    public async limpiarTodasLasFabricaciones(): Promise<number> {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM fabricaciones', function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    }

    /**
     * Cerrar conexión a la base de datos
     */
    public close(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
}
