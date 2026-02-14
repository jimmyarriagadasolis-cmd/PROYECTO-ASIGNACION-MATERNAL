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

    // Crear tabla de valores históricos de asignación
    db.run(`
        CREATE TABLE IF NOT EXISTS Valores_Asignacion_Historicos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fecha_vigencia_desde TEXT NOT NULL,
            fecha_vigencia_hasta TEXT NOT NULL,
            ley_referencia TEXT,
            tramo1_ingreso_desde REAL NOT NULL,
            tramo1_ingreso_hasta REAL NOT NULL,
            tramo1_valor_unitario REAL NOT NULL,
            tramo1_valor_duplo REAL NOT NULL,
            tramo2_ingreso_desde REAL NOT NULL,
            tramo2_ingreso_hasta REAL NOT NULL,
            tramo2_valor_unitario REAL NOT NULL,
            tramo2_valor_duplo REAL NOT NULL,
            tramo3_ingreso_desde REAL NOT NULL,
            tramo3_ingreso_hasta REAL NOT NULL,
            tramo3_valor_unitario REAL NOT NULL,
            tramo3_valor_duplo REAL NOT NULL,
            observaciones TEXT
        )
    `);

    // Insertar valores históricos si la tabla está vacía
    const historicosExist = db.exec('SELECT COUNT(*) as cnt FROM Valores_Asignacion_Historicos');
    const historicosCount = historicosExist.length > 0 ? historicosExist[0].values[0][0] : 0;
    if (historicosCount === 0) {
        const valoresHistoricos = [
            ['2026-01-01','2026-12-31','Ley 21.751',0,631976,22007,44014,631977,923067,13505,27010,923068,1439668,4267,8534,'Período 2026 - valores proyectados'],
            ['2025-07-01','2025-12-31','Ley 21.751',0,620251,22007,44014,620252,905941,13505,27010,905942,1412957,4267,8534,'Período ingresos: enero a junio 2025'],
            ['2025-05-01','2025-06-30','Ley 21.751',0,620251,22007,44014,620252,905941,13505,27010,905942,1412957,4267,8534,'Período ingresos: enero a junio 2024'],
            ['2025-01-01','2025-04-30','Ley 21.578',0,598698,21243,42486,598699,874460,13036,26072,874461,1363858,4119,8238,'Período ingresos: enero a junio 2024'],
            ['2024-07-01','2024-12-31','Ley 21.685',0,586227,21243,42486,586228,856247,13036,26072,856248,1335450,4119,8238,'Período ingresos: enero a junio 2024'],
            ['2023-09-01','2024-06-30','Ley 21.578',0,539328,20328,40656,539329,787746,12475,24950,787747,1228614,3942,7884,'Período ingresos: enero a junio 2023'],
            ['2023-07-01','2023-08-31','Ley 21.550',0,515879,20328,40656,515880,753496,12475,24950,753497,1175196,3942,7884,'Período ingresos: enero a junio 2023'],
            ['2023-05-01','2023-06-30','Ley 21.550',0,515879,20328,40656,515880,753496,12475,24950,753497,1175196,3942,7884,'Período ingresos: enero a junio 2022'],
            ['2023-01-01','2023-04-30','Ley 21.456',0,429899,16828,33656,429900,627913,10327,20654,627914,979330,3264,6528,'Período ingresos: enero a junio 2022'],
            ['2022-08-01','2022-12-31','Ley 21.456',0,419414,16418,32836,419415,612598,10075,20150,612599,955444,3184,6368,'Período ingresos: enero a junio 2022'],
            ['2022-07-01','2022-07-31','Ley 21.456',0,398443,15597,31194,398444,581968,9571,19142,581969,907672,3025,6050,'Período ingresos: enero a junio 2022'],
            ['2022-05-01','2022-06-30','Ley 21.456',0,398443,15597,31194,398444,581968,9571,19142,581969,907672,3025,6050,'Período ingresos: enero a junio 2021'],
            ['2022-01-01','2022-04-30','Ley 21.360',0,366987,14366,28732,366988,536023,8815,17630,536024,836014,2786,5572,'Período ingresos: enero a junio 2021'],
            ['2021-07-01','2021-12-31','Ley 21.360',0,353356,13832,27664,353357,516114,8488,16976,516115,804962,2683,5366,'Período ingresos: enero a junio 2021'],
            ['2021-05-01','2021-06-30','Ley 21.360',0,353356,13832,27664,353357,516114,8488,16976,516115,804962,2683,5366,'Período ingresos: enero a junio 2020'],
            ['2020-09-01','2021-04-30','Ley 21.283',0,342346,13401,26802,342347,500033,8224,16448,500034,779882,2599,5198,'Período ingresos: enero a junio 2020'],
            ['2020-07-01','2020-08-31','Ley 21.112',0,336055,13155,26310,336056,490844,8073,16146,490845,765550,2551,5102,'Período ingresos: enero a junio 2020'],
            ['2020-03-01','2020-06-30','Ley 21.112',0,336055,13155,26310,336056,490844,8073,16146,490845,765550,2551,5102,'Período ingresos: enero a junio 2019'],
            ['2019-07-01','2020-02-29','Ley 21.112',0,315841,12364,24728,315842,461320,7587,15174,461321,719502,2398,4796,'Período ingresos: enero a junio 2019'],
            ['2019-03-01','2019-06-30','Ley 21.112',0,315841,12364,24728,315842,461320,7587,15174,461321,719502,2398,4796,'Período ingresos: enero a junio 2018'],
            ['2018-08-01','2019-02-28','Ley 21.112',0,302200,11887,23774,302201,441395,7259,14518,441396,688427,2295,4590,'Período ingresos: enero a junio 2018'],
            ['2018-07-01','2018-07-31','Ley 20.935',0,289608,11337,22674,289609,423004,6957,13914,423005,659743,2199,4398,'Período ingresos: enero a junio 2018'],
            ['2018-01-01','2018-06-30','Ley 20.935',0,289608,11337,22674,289609,423004,6957,13914,423005,659743,2199,4398,'Período ingresos: enero a junio 2017']
        ];

        valoresHistoricos.forEach(v => {
            db.run(`INSERT INTO Valores_Asignacion_Historicos (
                fecha_vigencia_desde, fecha_vigencia_hasta, ley_referencia,
                tramo1_ingreso_desde, tramo1_ingreso_hasta, tramo1_valor_unitario, tramo1_valor_duplo,
                tramo2_ingreso_desde, tramo2_ingreso_hasta, tramo2_valor_unitario, tramo2_valor_duplo,
                tramo3_ingreso_desde, tramo3_ingreso_hasta, tramo3_valor_unitario, tramo3_valor_duplo,
                observaciones
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, v);
        });

        console.log('Valores históricos de asignación insertados:', valoresHistoricos.length, 'registros');
    }

    // Insertar configuración inicial si no existe
    const configInicial = [
        ['tramo1_limite', '631976', 'Límite superior del Tramo 1'],
        ['tramo1_monto', '22007', 'Monto mensual Tramo 1'],
        ['tramo2_limite', '923067', 'Límite superior del Tramo 2'],
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
