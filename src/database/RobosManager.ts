import sqlite3 from 'sqlite3';

export interface Malandro {
    id: number;
    nombre: string;
}

export interface Robo {
    id: number;
    fecha_robo: string;
    malandro_id: number;
}

export class RobosManager {
    /** Guardar el ID del mensaje persistente de malandros */
    public async guardarMensajeMalandros(mensajeId: string, canalId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(`CREATE TABLE IF NOT EXISTS mensajes_malandros (id INTEGER PRIMARY KEY, mensaje_id TEXT, canal_id TEXT);`, [], (err) => {
                if (err) return reject(err);
                this.db.run(`DELETE FROM mensajes_malandros;`, [], (err2) => {
                    if (err2) return reject(err2);
                    this.db.run(`INSERT INTO mensajes_malandros (id, mensaje_id, canal_id) VALUES (1, ?, ?);`, [mensajeId, canalId], (err3) => {
                        if (err3) reject(err3);
                        else resolve();
                    });
                });
            });
        });
    }

    /** Obtener el ID del mensaje persistente de malandros */
    public async obtenerMensajeMalandros(): Promise<{ mensaje_id: string, canal_id: string } | null> {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT mensaje_id, canal_id FROM mensajes_malandros WHERE id = 1';
            this.db.get(sql, [], (err, row) => {
                if (err) reject(err);
                else if (row && typeof row === 'object' && 'mensaje_id' in row && 'canal_id' in row) resolve(row as { mensaje_id: string, canal_id: string });
                else resolve(null);
            });
        });
    }

    /** Guardar el ID del mensaje persistente de robos */
    public async guardarMensajeRobos(mensajeId: string, canalId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(`CREATE TABLE IF NOT EXISTS mensajes_robos (id INTEGER PRIMARY KEY, mensaje_id TEXT, canal_id TEXT);`, [], (err) => {
                if (err) return reject(err);
                this.db.run(`DELETE FROM mensajes_robos;`, [], (err2) => {
                    if (err2) return reject(err2);
                    this.db.run(`INSERT INTO mensajes_robos (id, mensaje_id, canal_id) VALUES (1, ?, ?);`, [mensajeId, canalId], (err3) => {
                        if (err3) reject(err3);
                        else resolve();
                    });
                });
            });
        });
    }

    /** Obtener el ID del mensaje persistente de robos */
    public async obtenerMensajeRobos(): Promise<{ mensaje_id: string, canal_id: string } | null> {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT mensaje_id, canal_id FROM mensajes_robos WHERE id = 1';
            this.db.get(sql, [], (err, row) => {
                if (err) reject(err);
                else if (row && typeof row === 'object' && 'mensaje_id' in row && 'canal_id' in row) resolve(row as { mensaje_id: string, canal_id: string });
                else resolve(null);
            });
        });
    }
    private db: sqlite3.Database;
    private dbPath: string;

    constructor(dbPath: string) {
        this.dbPath = dbPath;
        this.db = new sqlite3.Database(dbPath);
    }

    /** Inicializa las tablas de robos y malandros */
    public async initialize(): Promise<void> {
        return new Promise((resolve, reject) => {
            const createMensajesMalandrosTable = `CREATE TABLE IF NOT EXISTS mensajes_malandros (id INTEGER PRIMARY KEY, mensaje_id TEXT, canal_id TEXT);`;
            const createMensajesRobosTable = `CREATE TABLE IF NOT EXISTS mensajes_robos (id INTEGER PRIMARY KEY, mensaje_id TEXT, canal_id TEXT);`;
            const createMalandrosTable = `
                CREATE TABLE IF NOT EXISTS malandros (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nombre TEXT NOT NULL UNIQUE
                )
            `;
            const createRobosTable = `
                CREATE TABLE IF NOT EXISTS robos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    fecha_robo TEXT NOT NULL,
                    malandro_id INTEGER NOT NULL,
                    FOREIGN KEY (malandro_id) REFERENCES malandros(id)
                )
            `;
            this.db.serialize(() => {
                this.db.run(createMensajesMalandrosTable);
                this.db.run(createMensajesRobosTable);
                this.db.run(createMalandrosTable);
                this.db.run(createRobosTable, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });
    }

    /** Agrega un malandro */
    public async agregarMalandro(nombre: string): Promise<number> {
        return new Promise((resolve, reject) => {
            const sql = 'INSERT INTO malandros (nombre) VALUES (?)';
            this.db.run(sql, [nombre], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    /** Elimina un malandro por ID */
    public async eliminarMalandro(id: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const sql = 'DELETE FROM malandros WHERE id = ?';
            this.db.run(sql, [id], function(err) {
                if (err) reject(err);
                else resolve(this.changes > 0);
            });
        });
    }

    /** Obtiene todos los malandros */
    public async obtenerMalandros(): Promise<Malandro[]> {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM malandros ORDER BY nombre';
            this.db.all(sql, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows as Malandro[]);
            });
        });
    }

    /** Marca un robo con fecha y malandro */
    public async marcarRobo(malandro_id: number): Promise<number> {
        return new Promise((resolve, reject) => {
            const sql = 'INSERT INTO robos (fecha_robo, malandro_id) VALUES (?, ?)';
            this.db.run(sql, [new Date().toISOString(), malandro_id], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    /** Obtiene el último robo de un malandro */
    public async obtenerUltimoRobo(malandro_id: number): Promise<Robo | null> {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM robos WHERE malandro_id = ? ORDER BY fecha_robo DESC LIMIT 1';
            this.db.get(sql, [malandro_id], (err, row) => {
                if (err) reject(err);
                else resolve(row as Robo || null);
            });
        });
    }

    /** Obtiene todos los robos de un malandro */
    public async obtenerRobosPorMalandro(malandro_id: number): Promise<Robo[]> {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM robos WHERE malandro_id = ? ORDER BY fecha_robo DESC';
            this.db.all(sql, [malandro_id], (err, rows) => {
                if (err) reject(err);
                else resolve(rows as Robo[]);
            });
        });
    }
}
