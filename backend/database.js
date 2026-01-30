const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

// Asegurar que existe el directorio de datos
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'asignacion_maternal.db');

let db = null;

async function initDatabase() {
    const SQL = await initSqlJs();

    // Cargar base de datos existente o crear nueva
    if (fs.existsSync(dbPath)) {
        const buffer = fs.readFileSync(dbPath);
        db = new SQL.Database(buffer);
    } else {
        db = new SQL.Database();
    }

    // Crear tablas
    db.run(`
        -- Tabla de usuarios del sistema
        CREATE TABLE IF NOT EXISTS Usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            nombre_completo TEXT NOT NULL,
            email TEXT NOT NULL,
            rol TEXT CHECK(rol IN ('administrador', 'rrhh', 'jefatura', 'lectura')) NOT NULL,
            departamento TEXT,
            activo INTEGER DEFAULT 1,
            fecha_creacion TEXT DEFAULT (datetime('now', 'localtime')),
            ultimo_acceso TEXT
        )
    `);

    db.run(`
        -- Tabla principal de solicitudes
        CREATE TABLE IF NOT EXISTS Solicitudes_Asignacion_Maternal (
            id_solicitud INTEGER PRIMARY KEY AUTOINCREMENT,
            rut_funcionaria TEXT NOT NULL,
            nombre_completo TEXT NOT NULL,
            departamento_unidad TEXT NOT NULL,
            correo_electronico TEXT NOT NULL,
            telefono TEXT,
            fecha_inicio_embarazo TEXT NOT NULL,
            fecha_nacimiento TEXT,
            fecha_ingreso_solicitud TEXT NOT NULL,
            sueldo_bruto_mensual REAL NOT NULL,
            tramo_asignacion INTEGER NOT NULL,
            monto_mensual_asignacion REAL NOT NULL,
            meses_retroactivos INTEGER NOT NULL,
            monto_total_retroactivo REAL NOT NULL,
            meses_futuros INTEGER DEFAULT 0,
            monto_total_futuro REAL DEFAULT 0,
            monto_total_pagable REAL NOT NULL,
            estado_solicitud TEXT CHECK(estado_solicitud IN ('Ingresada', 'En Revisión', 'Aprobada', 'Pagada', 'Rechazada')) DEFAULT 'Ingresada',
            fecha_aprobacion TEXT,
            fecha_primer_pago TEXT,
            observaciones TEXT,
            usuario_registro INTEGER,
            fecha_registro TEXT DEFAULT (datetime('now', 'localtime')),
            usuario_aprobacion INTEGER,
            archivo_certificado_compin TEXT,
            desglose_mensual TEXT
        )
    `);

    db.run(`CREATE INDEX IF NOT EXISTS idx_rut ON Solicitudes_Asignacion_Maternal(rut_funcionaria)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_estado ON Solicitudes_Asignacion_Maternal(estado_solicitud)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_departamento ON Solicitudes_Asignacion_Maternal(departamento_unidad)`);

    db.run(`
        CREATE TABLE IF NOT EXISTS Logs_Auditoria (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER,
            accion TEXT NOT NULL,
            tabla_afectada TEXT,
            registro_id INTEGER,
            datos_anteriores TEXT,
            datos_nuevos TEXT,
            ip_address TEXT,
            fecha TEXT DEFAULT (datetime('now', 'localtime'))
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS Historial_Correos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            solicitud_id INTEGER,
            tipo_correo TEXT CHECK(tipo_correo IN ('ficha_individual', 'reporte_consolidado', 'notificacion')) NOT NULL,
            destinatarios TEXT NOT NULL,
            asunto TEXT NOT NULL,
            estado TEXT CHECK(estado IN ('enviado', 'fallido', 'pendiente')) DEFAULT 'pendiente',
            fecha_envio TEXT DEFAULT (datetime('now', 'localtime')),
            error_mensaje TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS Configuracion (
            clave TEXT PRIMARY KEY,
            valor TEXT NOT NULL,
            descripcion TEXT,
            fecha_actualizacion TEXT DEFAULT (datetime('now', 'localtime'))
        )
    `);

    // Insertar configuración inicial si no existe
    const configInicial = [
        ['tramo1_limite', '631976', 'Límite superior del Tramo 1'],
        ['tramo1_monto', '22007', 'Monto mensual Tramo 1'],
        ['tramo2_limite', '905941', 'Límite superior del Tramo 2'],
        ['tramo2_monto', '13505', 'Monto mensual Tramo 2'],
        ['tramo3_limite', '1439668', 'Límite superior del Tramo 3'],
        ['tramo3_monto', '4267', 'Monto mensual Tramo 3'],
        ['plazo_maximo_años', '5', 'Plazo máximo para cobro retroactivo en años'],
        ['meses_max_embarazo', '9', 'Máximo de meses de embarazo'],
        ['nombre_institucion', 'Ministerio de las Culturas, las Artes y el Patrimonio', 'Nombre oficial'],
        ['correo_notificaciones', '', 'Correo para envío de notificaciones'],
        ['smtp_host', '', 'Servidor SMTP'],
        ['smtp_port', '587', 'Puerto SMTP'],
        ['smtp_user', '', 'Usuario SMTP'],
        ['smtp_pass', '', 'Contraseña SMTP']
    ];

    configInicial.forEach(config => {
        const existing = db.exec(`SELECT clave FROM Configuracion WHERE clave = '${config[0]}'`);
        if (existing.length === 0) {
            db.run(`INSERT INTO Configuracion (clave, valor, descripcion) VALUES (?, ?, ?)`, config);
        }
    });

    // Insertar usuario administrador por defecto si no existe
    const bcrypt = require('bcryptjs');
    const adminExists = db.exec("SELECT id FROM Usuarios WHERE username = 'admin'");
    if (adminExists.length === 0 || adminExists[0].values.length === 0) {
        const passwordHash = bcrypt.hashSync('admin123', 10);
        db.run(`INSERT INTO Usuarios (username, password_hash, nombre_completo, email, rol) VALUES (?, ?, ?, ?, ?)`,
            ['admin', passwordHash, 'Administrador del Sistema', 'admin@cultura.gob.cl', 'administrador']);
    }

    // Guardar base de datos
    saveDatabase();

    console.log('Base de datos inicializada correctamente');
    return db;
}

function saveDatabase() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
    }
}

// Funciones wrapper para compatibilidad con better-sqlite3
function prepare(sql) {
    return {
        run: (...params) => {
            // Si el primer parámetro es un array, lo usamos directamente
            const actualParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
            db.run(sql, actualParams);
            saveDatabase();
            // Para obtener el lastInsertRowid en sql.js
            const res = db.exec("SELECT last_insert_rowid()");
            return { lastInsertRowid: res[0]?.values[0]?.[0] };
        },
        get: (...params) => {
            const actualParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
            const stmt = db.prepare(sql);
            try {
                if (actualParams.length > 0) {
                    stmt.bind(actualParams);
                }
                if (stmt.step()) {
                    const row = stmt.getAsObject();
                    return row;
                }
                return undefined;
            } finally {
                stmt.free();
            }
        },
        all: (...params) => {
            const actualParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
            const results = [];
            const stmt = db.prepare(sql);
            try {
                if (actualParams.length > 0) {
                    stmt.bind(actualParams);
                }
                while (stmt.step()) {
                    results.push(stmt.getAsObject());
                }
                return results;
            } finally {
                stmt.free();
            }
        }
    };
}

function exec(sql) {
    db.run(sql);
    saveDatabase();
}

module.exports = {
    initDatabase,
    prepare: (sql) => prepare(sql),
    exec: (sql) => exec(sql),
    getDb: () => db,
    saveDatabase
};
