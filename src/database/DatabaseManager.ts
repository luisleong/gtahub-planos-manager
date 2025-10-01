    
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

export interface Servicio {
    id: number;
    usuario_id: string;
    canal_id: string;
    inicio: string;
    fin?: string;
    notas?: string;
    created_at: string;
    updated_at: string;
}

export interface Localizacion {
    id: number;
    nombre: string;
    foto_url?: string;
    disponible_para_fabricacion: boolean;
    mensaje_persistente_id?: string;
    canal_persistente_id?: string;
    propietario_id?: string;
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
    private db: sqlite3.Database;
    private dbPath: string;

    constructor() {
        // Usar ruta de la base de datos desde .env, config, o por defecto data/<cliente>.db
        const dbPathEnv = process.env.DATABASE_PATH;
        let dbPathFinal: string;
        if (dbPathEnv) {
            dbPathFinal = path.isAbsolute(dbPathEnv) ? dbPathEnv : path.join(process.cwd(), dbPathEnv);
        } else {
            // Intentar obtener DATABASE_PATH desde config del cliente
            let clienteConfigPath = path.join(process.cwd(), 'clientes', (process.env.CLIENTE || 'n-c-s').toLowerCase(), 'config.json');
            let dbPathConfig: string | undefined = undefined;
            if (fs.existsSync(clienteConfigPath)) {
                try {
                    const configRaw = fs.readFileSync(clienteConfigPath, 'utf8');
                    const configObj = JSON.parse(configRaw);
                    if (configObj.DATABASE_PATH) {
                        dbPathConfig = configObj.DATABASE_PATH;
                    }
                } catch (err) {
                    console.warn('[DB] Error leyendo config.json del cliente:', err);
                }
            }
            const dataDir = path.join(process.cwd(), 'data');
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            if (dbPathConfig) {
                dbPathFinal = path.isAbsolute(dbPathConfig) ? dbPathConfig : path.join(process.cwd(), dbPathConfig);
            } else {
                const cliente = (process.env.CLIENTE || 'n-c-s').toLowerCase();
                dbPathFinal = path.join(dataDir, `${cliente}.db`);
            }
        }
        this.dbPath = dbPathFinal;
        this.db = new sqlite3.Database(this.dbPath);
        console.log(`[DB] Usando base de datos: ${this.dbPath}`);
    }

    /** Obtener todos los servicios recientes (ordenados por inicio DESC) */
    public async obtenerServiciosRecientes(): Promise<Servicio[]> {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM servicios ORDER BY inicio DESC`;
            this.db.all(sql, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows as Servicio[]);
            });
        });
    }
    /** Guardar notas en un servicio */
    public async registrarNotasServicio(servicioId: number, notas: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const sql = `UPDATE servicios SET notas = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
            this.db.run(sql, [notas, servicioId], function(err) {
                if (err) reject(err);
                else resolve(this.changes > 0);
            });
        });
    }
    /** Inicializar tabla de servicios */
    public async inicializarTablaServicios(): Promise<void> {
        return new Promise((resolve, reject) => {
            const sql = `CREATE TABLE IF NOT EXISTS servicios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                usuario_id TEXT NOT NULL,
                canal_id TEXT NOT NULL,
                inicio TEXT NOT NULL,
                fin TEXT,
                notas TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )`;
            this.db.run(sql, [], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    /** Registrar inicio de servicio */
    public async registrarInicioServicio(usuarioId: string, canalId: string, notas?: string): Promise<number> {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO servicios (usuario_id, canal_id, inicio, notas) VALUES (?, ?, ?, ?)`;
            const params = [usuarioId, canalId, new Date().toISOString(), notas || null];
            this.db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    /** Registrar fin de servicio */
    public async registrarFinServicio(servicioId: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const sql = `UPDATE servicios SET fin = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
            this.db.run(sql, [new Date().toISOString(), servicioId], function(err) {
                if (err) reject(err);
                else resolve(this.changes > 0);
            });
        });
    }

    /** Obtener servicios por usuario */
    public async obtenerServiciosPorUsuario(usuarioId: string): Promise<Servicio[]> {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM servicios WHERE usuario_id = ? ORDER BY inicio DESC`;
            this.db.all(sql, [usuarioId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows as Servicio[]);
            });
        });
    }
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
    /** Guardar el ID del mensaje persistente de RRHH */
    public async guardarMensajeRRHH(mensajeId: string, canalId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(`CREATE TABLE IF NOT EXISTS mensajes_rrhh (id INTEGER PRIMARY KEY, mensaje_id TEXT, canal_id TEXT);`, [], (err) => {
                if (err) return reject(err);
                this.db.run(`DELETE FROM mensajes_rrhh;`, [], (err2) => {
                    if (err2) return reject(err2);
                    this.db.run(`INSERT INTO mensajes_rrhh (id, mensaje_id, canal_id) VALUES (1, ?, ?);`, [mensajeId, canalId], (err3) => {
                        if (err3) reject(err3);
                        else resolve();
                    });
                });
            });
        });
    }

    /** Obtener el mensaje persistente de RRHH */
    public async obtenerMensajeRRHH(): Promise<{ mensaje_id: string, canal_id: string } | null> {
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT mensaje_id, canal_id FROM mensajes_rrhh WHERE id = 1;`, [], (err, row) => {
                if (err) {
                    reject(err);
                } else if (row !== null && typeof row === 'object' && 'mensaje_id' in row && 'canal_id' in row && typeof (row as any).mensaje_id === 'string' && typeof (row as any).canal_id === 'string') {
                    resolve({
                        mensaje_id: (row as any).mensaje_id,
                        canal_id: (row as any).canal_id
                    });
                } else {
                    resolve(null);
                }
            });
        });
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

        // Datos iniciales de planos (usando iconos SVG del repositorio)
        const planosIniciales = [
            { nombre: 'Amarillo', icono_url: 'https://raw.githubusercontent.com/luisleong/gtahub-planos-manager/main/src/images/planos/amarillo.svg', duracion_minutos: 600 },
            { nombre: 'Morado', icono_url: 'https://raw.githubusercontent.com/luisleong/gtahub-planos-manager/main/src/images/planos/morado.svg', duracion_minutos: 360 },
            { nombre: 'Joyería', icono_url: 'https://raw.githubusercontent.com/luisleong/gtahub-planos-manager/main/src/images/planos/joyeria.svg', duracion_minutos: 1440 },
            { nombre: 'Arquitectonico', icono_url: 'https://raw.githubusercontent.com/luisleong/gtahub-planos-manager/main/src/images/planos/arquitectonico.svg', duracion_minutos: 1040 }
        ];

        let localizacionesIniciales: Array<{ nombre: string; foto_url?: string }> = [];
        try {
            const localizacionesPath = path.join(process.cwd(), 'clientes', cliente.toLowerCase(), 'localizaciones.json');
            if (fs.existsSync(localizacionesPath)) {
                const raw = fs.readFileSync(localizacionesPath, 'utf8');
                localizacionesIniciales = JSON.parse(raw);
            } else {
                console.warn(`[DB] No existe el archivo de localizaciones iniciales: ${localizacionesPath}`);
            }
        } catch (err) {
            console.error('[DB] Error leyendo localizaciones iniciales:', err);
        }

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
            console.log('[DB] Ejecutando SQL obtenerLocalizaciones:', sql);
            this.db.all(sql, [], (err, rows) => {
                if (err) {
                    console.error('[DB] Error en obtenerLocalizaciones:', err);
                    reject(err);
                } else {
                    console.log('[DB] Resultado obtenerLocalizaciones:', rows);
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

    public async actualizarMensajePersistente(id: number, mensajeId: string, canalId: string, propietarioId?: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            let sql: string;
            let params: any[];
            if (typeof propietarioId === 'string') {
                sql = `UPDATE localizaciones SET mensaje_persistente_id = ?, canal_persistente_id = ?, propietario_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
                params = [mensajeId, canalId, propietarioId, id];
            } else {
                sql = `UPDATE localizaciones SET mensaje_persistente_id = ?, canal_persistente_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
                params = [mensajeId, canalId, id];
            }
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes > 0);
                }
            });
        });
    }

    /** Obtener propietario del canal por canalId */
    public async obtenerPropietarioPorCanal(canalId: string): Promise<string | null> {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT propietario_id FROM localizaciones WHERE canal_persistente_id = ? LIMIT 1';
            this.db.get(sql, [canalId], (err, row) => {
                if (err) reject(err);
                else if (row && typeof row === 'object' && 'propietario_id' in row) resolve((row as any).propietario_id);
                else resolve(null);
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
            // Check for duplicate active fabrication
            const checkSql = `
                SELECT id FROM fabricaciones
                WHERE id_localizacion = ? AND id_plano = ? AND propietario_id = ?
                AND listo_para_recoger = 0 AND recogido = 0
                ORDER BY id DESC LIMIT 1
            `;
            this.db.get(checkSql, [idLocalizacion, idPlano, propietarioId], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                const fabricationId = row ? (row as { id: number }).id : undefined;
                if (fabricationId) {
                    // Duplicate found, return existing fabrication ID
                    resolve(fabricationId);
                } else {
                    // No duplicate, insert new fabrication
                    const sql = `
                        INSERT INTO fabricaciones (
                            id_localizacion, id_plano, propietario, propietario_id,
                            timestamp_colocacion, notas, canal_notificacion,
                            listo_para_recoger, recogido, notificado
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0)
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
