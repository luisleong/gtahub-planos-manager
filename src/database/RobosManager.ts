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
    private db: sqlite3.Database;
    private dbPath: string;

    constructor(dbPath: string) {
        this.dbPath = dbPath;
        this.db = new sqlite3.Database(dbPath);
    }

    /** Inicializa las tablas de robos y malandros */
    public async initialize(): Promise<void> {
        return new Promise((resolve, reject) => {
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
