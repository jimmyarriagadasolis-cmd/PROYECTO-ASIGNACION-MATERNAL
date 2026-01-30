/**
 * Migración: Agregar valores históricos de asignación familiar
 * Para cálculos correctos según los tramos vigentes en cada período
 */

const db = require('../database');

function ejecutarMigracion() {
    console.log('🔄 Iniciando migración de valores históricos...');

    // Crear tabla de valores históricos
    db.exec(`
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

    // Limpiar datos previos si existen
    db.exec('DELETE FROM Valores_Asignacion_Historicos');

    // Insertar valores históricos oficiales de SUCESO.CL
    const valoresHistoricos = [
        // 2021 - Mayo a Diciembre
        {
            desde: '2021-05-01',
            hasta: '2021-12-31',
            ley: 'Ley 21.360',
            t1_desde: 0, t1_hasta: 353356, t1_unit: 13832, t1_duplo: 27664,
            t2_desde: 353357, t2_hasta: 516114, t2_unit: 8488, t2_duplo: 16976,
            t3_desde: 516115, t3_hasta: 804962, t3_unit: 2683, t3_duplo: 5366,
            obs: 'Vigente desde 1 de mayo de 2021'
        },
        // 2021 - Enero a Abril (valores año anterior)
        {
            desde: '2021-01-01',
            hasta: '2021-04-30',
            ley: 'Ley anterior a 21.360',
            t1_desde: 0, t1_hasta: 340000, t1_unit: 13304, t1_duplo: 26608,
            t2_desde: 340001, t2_hasta: 496000, t2_unit: 8163, t2_duplo: 16326,
            t3_desde: 496001, t3_hasta: 774000, t3_unit: 2581, t3_duplo: 5162,
            obs: 'Valores aproximados primer cuatrimestre 2021'
        },
        // 2022 - Mayo a Julio
        {
            desde: '2022-05-01',
            hasta: '2022-07-31',
            ley: 'Ley 21.456',
            t1_desde: 0, t1_hasta: 398443, t1_unit: 15597, t1_duplo: 31194,
            t2_desde: 398444, t2_hasta: 581962, t2_unit: 9571, t2_duplo: 19142,
            t3_desde: 581963, t3_hasta: 907672, t3_unit: 3025, t3_duplo: 6050,
            obs: 'Vigente desde 1 de mayo de 2022'
        },
        // 2022 - Agosto a Diciembre
        {
            desde: '2022-08-01',
            hasta: '2022-12-31',
            ley: 'Ley 21.456 (Ajuste)',
            t1_desde: 0, t1_hasta: 419180, t1_unit: 16418, t1_duplo: 32836,
            t2_desde: 419181, t2_hasta: 612262, t2_unit: 10075, t2_duplo: 20150,
            t3_desde: 612263, t3_hasta: 954923, t3_unit: 3184, t3_duplo: 6368,
            obs: 'Ajuste desde 1 de agosto de 2022'
        },
        // 2022 - Enero a Abril
        {
            desde: '2022-01-01',
            hasta: '2022-04-30',
            ley: 'Ley 21.360 (vigente del año anterior)',
            t1_desde: 0, t1_hasta: 353356, t1_unit: 13832, t1_duplo: 27664,
            t2_desde: 353357, t2_hasta: 516114, t2_unit: 8488, t2_duplo: 16976,
            t3_desde: 516115, t3_hasta: 804962, t3_unit: 2683, t3_duplo: 5366,
            obs: 'Valores heredados de 2021'
        },
        // 2023 - Mayo a Diciembre
        {
            desde: '2023-05-01',
            hasta: '2023-12-31',
            ley: 'Ley 21.550',
            t1_desde: 0, t1_hasta: 429899, t1_unit: 20328, t1_duplo: 40656,
            t2_desde: 429900, t2_hasta: 627913, t2_unit: 12475, t2_duplo: 24950,
            t3_desde: 627914, t3_hasta: 979330, t3_unit: 3942, t3_duplo: 7884,
            obs: 'Vigente desde 1 de mayo de 2023'
        },
        // 2023 - Enero a Abril
        {
            desde: '2023-01-01',
            hasta: '2023-04-30',
            ley: 'Ley 21.456 (vigente del año anterior)',
            t1_desde: 0, t1_hasta: 419180, t1_unit: 16418, t1_duplo: 32836,
            t2_desde: 419181, t2_hasta: 612262, t2_unit: 10075, t2_duplo: 20150,
            t3_desde: 612263, t3_hasta: 954923, t3_unit: 3184, t3_duplo: 6368,
            obs: 'Valores heredados de 2022'
        },
        // 2024 - Julio a Diciembre
        {
            desde: '2024-07-01',
            hasta: '2024-12-31',
            ley: 'Ley 21.674',
            t1_desde: 0, t1_hasta: 586227, t1_unit: 21243, t1_duplo: 42486,
            t2_desde: 586228, t2_hasta: 856247, t2_unit: 13036, t2_duplo: 26072,
            t3_desde: 856248, t3_hasta: 1335450, t3_unit: 4119, t3_duplo: 8238,
            obs: 'Vigente desde 1 de julio de 2024'
        },
        // 2024 - Enero a Junio
        {
            desde: '2024-01-01',
            hasta: '2024-06-30',
            ley: 'Ley 21.550 (vigente del año anterior)',
            t1_desde: 0, t1_hasta: 429899, t1_unit: 20328, t1_duplo: 40656,
            t2_desde: 429900, t2_hasta: 627913, t2_unit: 12475, t2_duplo: 24950,
            t3_desde: 627914, t3_hasta: 979330, t3_unit: 3942, t3_duplo: 7884,
            obs: 'Valores heredados de 2023'
        },
        // 2025 - Enero a Junio (valores actuales)
        {
            desde: '2025-01-01',
            hasta: '2025-06-30',
            ley: 'Ley 21.674 (vigente)',
            t1_desde: 0, t1_hasta: 586227, t1_unit: 21243, t1_duplo: 42486,
            t2_desde: 586228, t2_hasta: 856247, t2_unit: 13036, t2_duplo: 26072,
            t3_desde: 856248, t3_hasta: 1335450, t3_unit: 4119, t3_duplo: 8238,
            obs: 'Valores heredados de julio 2024'
        },
        // 2025 - DFS (actualizado enero 2025)
        {
            desde: '2025-01-01',
            hasta: '2025-12-31',
            ley: 'O-01-DFS-04473-2025 / Ley 21.751',
            t1_desde: 0, t1_hasta: 631976, t1_unit: 22007, t1_duplo: 44014,
            t2_desde: 631977, t2_hasta: 923067, t2_unit: 13505, t2_duplo: 27010,
            t3_desde: 923068, t3_hasta: 1439668, t3_unit: 4267, t3_duplo: 8534,
            obs: 'Valores vigentes año 2025 según DFS'
        },
        // 2026 - Proyección (usar valores 2025 hasta nueva actualización)
        {
            desde: '2026-01-01',
            hasta: '2026-12-31',
            ley: 'O-01-DFS-04473-2025 (vigente)',
            t1_desde: 0, t1_hasta: 631976, t1_unit: 22007, t1_duplo: 44014,
            t2_desde: 631977, t2_hasta: 923067, t2_unit: 13505, t2_duplo: 27010,
            t3_desde: 923068, t3_hasta: 1439668, t3_unit: 4267, t3_duplo: 8534,
            obs: 'Proyección - usar valores 2025 hasta actualización oficial'
        }
    ];

    const insertStmt = db.prepare(`
        INSERT INTO Valores_Asignacion_Historicos (
            fecha_vigencia_desde, fecha_vigencia_hasta, ley_referencia,
            tramo1_ingreso_desde, tramo1_ingreso_hasta, tramo1_valor_unitario, tramo1_valor_duplo,
            tramo2_ingreso_desde, tramo2_ingreso_hasta, tramo2_valor_unitario, tramo2_valor_duplo,
            tramo3_ingreso_desde, tramo3_ingreso_hasta, tramo3_valor_unitario, tramo3_valor_duplo,
            observaciones
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    valoresHistoricos.forEach(v => {
        insertStmt.run([
            v.desde, v.hasta, v.ley,
            v.t1_desde, v.t1_hasta, v.t1_unit, v.t1_duplo,
            v.t2_desde, v.t2_hasta, v.t2_unit, v.t2_duplo,
            v.t3_desde, v.t3_hasta, v.t3_unit, v.t3_duplo,
            v.obs
        ]);
    });

    console.log('✅ Migración completada: Se agregaron', valoresHistoricos.length, 'registros históricos');
}

module.exports = { ejecutarMigracion };

// Ejecutar si se llama directamente
if (require.main === module) {
    const { initDatabase } = require('../database');
    initDatabase().then(() => {
        ejecutarMigracion();
        console.log('✅ Base de datos actualizada con valores históricos');
    });
}
