/**
 * Migración: Agregar valores históricos de asignación familiar
 * Datos extraídos del Excel oficial: Promedio 2018-2025 (1).xlsx
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

    // Insertar valores históricos exactos del Excel de referencia
    const valoresHistoricos = [
        // 2026 - Proyección
        {
            desde: '2026-01-01', hasta: '2026-12-31', ley: 'Ley 21.751',
            t1_desde: 0, t1_hasta: 631976, t1_unit: 22007, t1_duplo: 44014,
            t2_desde: 631977, t2_hasta: 923067, t2_unit: 13505, t2_duplo: 27010,
            t3_desde: 923068, t3_hasta: 1439668, t3_unit: 4267, t3_duplo: 8534,
            obs: 'Período 2026 - valores proyectados'
        },
        // 202503 - Jul 2025
        {
            desde: '2025-07-01', hasta: '2025-12-31', ley: 'Ley 21.751',
            t1_desde: 0, t1_hasta: 620251, t1_unit: 22007, t1_duplo: 44014,
            t2_desde: 620252, t2_hasta: 905941, t2_unit: 13505, t2_duplo: 27010,
            t3_desde: 905942, t3_hasta: 1412957, t3_unit: 4267, t3_duplo: 8534,
            obs: 'Período ingresos: enero a junio 2025'
        },
        // 202502 - May-Jun 2025
        {
            desde: '2025-05-01', hasta: '2025-06-30', ley: 'Ley 21.751',
            t1_desde: 0, t1_hasta: 620251, t1_unit: 22007, t1_duplo: 44014,
            t2_desde: 620252, t2_hasta: 905941, t2_unit: 13505, t2_duplo: 27010,
            t3_desde: 905942, t3_hasta: 1412957, t3_unit: 4267, t3_duplo: 8534,
            obs: 'Período ingresos: enero a junio 2024'
        },
        // 202501 - Ene-Abr 2025
        {
            desde: '2025-01-01', hasta: '2025-04-30', ley: 'Ley 21.578',
            t1_desde: 0, t1_hasta: 598698, t1_unit: 21243, t1_duplo: 42486,
            t2_desde: 598699, t2_hasta: 874460, t2_unit: 13036, t2_duplo: 26072,
            t3_desde: 874461, t3_hasta: 1363858, t3_unit: 4119, t3_duplo: 8238,
            obs: 'Período ingresos: enero a junio 2024'
        },
        // 202401 - Jul-Dic 2024
        {
            desde: '2024-07-01', hasta: '2024-12-31', ley: 'Ley 21.685',
            t1_desde: 0, t1_hasta: 586227, t1_unit: 21243, t1_duplo: 42486,
            t2_desde: 586228, t2_hasta: 856247, t2_unit: 13036, t2_duplo: 26072,
            t3_desde: 856248, t3_hasta: 1335450, t3_unit: 4119, t3_duplo: 8238,
            obs: 'Período ingresos: enero a junio 2024'
        },
        // 202304 - Sep-Dic 2023 y Ene-Jun 2024
        {
            desde: '2023-09-01', hasta: '2024-06-30', ley: 'Ley 21.578',
            t1_desde: 0, t1_hasta: 539328, t1_unit: 20328, t1_duplo: 40656,
            t2_desde: 539329, t2_hasta: 787746, t2_unit: 12475, t2_duplo: 24950,
            t3_desde: 787747, t3_hasta: 1228614, t3_unit: 3942, t3_duplo: 7884,
            obs: 'Período ingresos: enero a junio 2023'
        },
        // 202303 - Jul-Ago 2023
        {
            desde: '2023-07-01', hasta: '2023-08-31', ley: 'Ley 21.550',
            t1_desde: 0, t1_hasta: 515879, t1_unit: 20328, t1_duplo: 40656,
            t2_desde: 515880, t2_hasta: 753496, t2_unit: 12475, t2_duplo: 24950,
            t3_desde: 753497, t3_hasta: 1175196, t3_unit: 3942, t3_duplo: 7884,
            obs: 'Período ingresos: enero a junio 2023'
        },
        // 202302 - May-Jun 2023
        {
            desde: '2023-05-01', hasta: '2023-06-30', ley: 'Ley 21.550',
            t1_desde: 0, t1_hasta: 515879, t1_unit: 20328, t1_duplo: 40656,
            t2_desde: 515880, t2_hasta: 753496, t2_unit: 12475, t2_duplo: 24950,
            t3_desde: 753497, t3_hasta: 1175196, t3_unit: 3942, t3_duplo: 7884,
            obs: 'Período ingresos: enero a junio 2022'
        },
        // 202301 - Ene-Abr 2023
        {
            desde: '2023-01-01', hasta: '2023-04-30', ley: 'Ley 21.456',
            t1_desde: 0, t1_hasta: 429899, t1_unit: 16828, t1_duplo: 33656,
            t2_desde: 429900, t2_hasta: 627913, t2_unit: 10327, t2_duplo: 20654,
            t3_desde: 627914, t3_hasta: 979330, t3_unit: 3264, t3_duplo: 6528,
            obs: 'Período ingresos: enero a junio 2022'
        },
        // 202204 - Ago 2022 a Dic 2022
        {
            desde: '2022-08-01', hasta: '2022-12-31', ley: 'Ley 21.456',
            t1_desde: 0, t1_hasta: 419414, t1_unit: 16418, t1_duplo: 32836,
            t2_desde: 419415, t2_hasta: 612598, t2_unit: 10075, t2_duplo: 20150,
            t3_desde: 612599, t3_hasta: 955444, t3_unit: 3184, t3_duplo: 6368,
            obs: 'Período ingresos: enero a junio 2022'
        },
        // 202203 - Jul 2022
        {
            desde: '2022-07-01', hasta: '2022-07-31', ley: 'Ley 21.456',
            t1_desde: 0, t1_hasta: 398443, t1_unit: 15597, t1_duplo: 31194,
            t2_desde: 398444, t2_hasta: 581968, t2_unit: 9571, t2_duplo: 19142,
            t3_desde: 581969, t3_hasta: 907672, t3_unit: 3025, t3_duplo: 6050,
            obs: 'Período ingresos: enero a junio 2022'
        },
        // 202202 - May-Jun 2022
        {
            desde: '2022-05-01', hasta: '2022-06-30', ley: 'Ley 21.456',
            t1_desde: 0, t1_hasta: 398443, t1_unit: 15597, t1_duplo: 31194,
            t2_desde: 398444, t2_hasta: 581968, t2_unit: 9571, t2_duplo: 19142,
            t3_desde: 581969, t3_hasta: 907672, t3_unit: 3025, t3_duplo: 6050,
            obs: 'Período ingresos: enero a junio 2021'
        },
        // 202201 - Ene-Abr 2022
        {
            desde: '2022-01-01', hasta: '2022-04-30', ley: 'Ley 21.360',
            t1_desde: 0, t1_hasta: 366987, t1_unit: 14366, t1_duplo: 28732,
            t2_desde: 366988, t2_hasta: 536023, t2_unit: 8815, t2_duplo: 17630,
            t3_desde: 536024, t3_hasta: 836014, t3_unit: 2786, t3_duplo: 5572,
            obs: 'Período ingresos: enero a junio 2021'
        },
        // 202102 - Jul-Dic 2021
        {
            desde: '2021-07-01', hasta: '2021-12-31', ley: 'Ley 21.360',
            t1_desde: 0, t1_hasta: 353356, t1_unit: 13832, t1_duplo: 27664,
            t2_desde: 353357, t2_hasta: 516114, t2_unit: 8488, t2_duplo: 16976,
            t3_desde: 516115, t3_hasta: 804962, t3_unit: 2683, t3_duplo: 5366,
            obs: 'Período ingresos: enero a junio 2021'
        },
        // 202101 - May-Jun 2021
        {
            desde: '2021-05-01', hasta: '2021-06-30', ley: 'Ley 21.360',
            t1_desde: 0, t1_hasta: 353356, t1_unit: 13832, t1_duplo: 27664,
            t2_desde: 353357, t2_hasta: 516114, t2_unit: 8488, t2_duplo: 16976,
            t3_desde: 516115, t3_hasta: 804962, t3_unit: 2683, t3_duplo: 5366,
            obs: 'Período ingresos: enero a junio 2020'
        },
        // 202003 - Sep 2020 a Abr 2021
        {
            desde: '2020-09-01', hasta: '2021-04-30', ley: 'Ley 21.283',
            t1_desde: 0, t1_hasta: 342346, t1_unit: 13401, t1_duplo: 26802,
            t2_desde: 342347, t2_hasta: 500033, t2_unit: 8224, t2_duplo: 16448,
            t3_desde: 500034, t3_hasta: 779882, t3_unit: 2599, t3_duplo: 5198,
            obs: 'Período ingresos: enero a junio 2020'
        },
        // 202002 - Jul-Ago 2020
        {
            desde: '2020-07-01', hasta: '2020-08-31', ley: 'Ley 21.112',
            t1_desde: 0, t1_hasta: 336055, t1_unit: 13155, t1_duplo: 26310,
            t2_desde: 336056, t2_hasta: 490844, t2_unit: 8073, t2_duplo: 16146,
            t3_desde: 490845, t3_hasta: 765550, t3_unit: 2551, t3_duplo: 5102,
            obs: 'Período ingresos: enero a junio 2020'
        },
        // 202001 - Mar-Jun 2020
        {
            desde: '2020-03-01', hasta: '2020-06-30', ley: 'Ley 21.112',
            t1_desde: 0, t1_hasta: 336055, t1_unit: 13155, t1_duplo: 26310,
            t2_desde: 336056, t2_hasta: 490844, t2_unit: 8073, t2_duplo: 16146,
            t3_desde: 490845, t3_hasta: 765550, t3_unit: 2551, t3_duplo: 5102,
            obs: 'Período ingresos: enero a junio 2019'
        },
        // 201902 - Jul 2019 a Feb 2020
        {
            desde: '2019-07-01', hasta: '2020-02-29', ley: 'Ley 21.112',
            t1_desde: 0, t1_hasta: 315841, t1_unit: 12364, t1_duplo: 24728,
            t2_desde: 315842, t2_hasta: 461320, t2_unit: 7587, t2_duplo: 15174,
            t3_desde: 461321, t3_hasta: 719502, t3_unit: 2398, t3_duplo: 4796,
            obs: 'Período ingresos: enero a junio 2019'
        },
        // 201901 - Mar-Jun 2019
        {
            desde: '2019-03-01', hasta: '2019-06-30', ley: 'Ley 21.112',
            t1_desde: 0, t1_hasta: 315841, t1_unit: 12364, t1_duplo: 24728,
            t2_desde: 315842, t2_hasta: 461320, t2_unit: 7587, t2_duplo: 15174,
            t3_desde: 461321, t3_hasta: 719502, t3_unit: 2398, t3_duplo: 4796,
            obs: 'Período ingresos: enero a junio 2018'
        },
        // 201803 - Ago 2018 a Feb 2019
        {
            desde: '2018-08-01', hasta: '2019-02-28', ley: 'Ley 21.112',
            t1_desde: 0, t1_hasta: 302200, t1_unit: 11887, t1_duplo: 23774,
            t2_desde: 302201, t2_hasta: 441395, t2_unit: 7259, t2_duplo: 14518,
            t3_desde: 441396, t3_hasta: 688427, t3_unit: 2295, t3_duplo: 4590,
            obs: 'Período ingresos: enero a junio 2018'
        },
        // 201802 - Jul 2018
        {
            desde: '2018-07-01', hasta: '2018-07-31', ley: 'Ley 20.935',
            t1_desde: 0, t1_hasta: 289608, t1_unit: 11337, t1_duplo: 22674,
            t2_desde: 289609, t2_hasta: 423004, t2_unit: 6957, t2_duplo: 13914,
            t3_desde: 423005, t3_hasta: 659743, t3_unit: 2199, t3_duplo: 4398,
            obs: 'Período ingresos: enero a junio 2018'
        },
        // 201801 - Ene-Jun 2018
        {
            desde: '2018-01-01', hasta: '2018-06-30', ley: 'Ley 20.935',
            t1_desde: 0, t1_hasta: 289608, t1_unit: 11337, t1_duplo: 22674,
            t2_desde: 289609, t2_hasta: 423004, t2_unit: 6957, t2_duplo: 13914,
            t3_desde: 423005, t3_hasta: 659743, t3_unit: 2199, t3_duplo: 4398,
            obs: 'Período ingresos: enero a junio 2017'
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
        console.log('✅ Base de datos actualizada con valores históricos del Excel oficial');
    });
}
