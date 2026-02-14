/**
 * Script de Seed: Poblar colección valores_historicos en Firestore
 * Ministerio de las Culturas, las Artes y el Patrimonio - Chile
 *
 * Uso:
 *   node functions/scripts/seed-valores-historicos.js
 *
 * Requisitos:
 *   - Tener configurado GOOGLE_APPLICATION_CREDENTIALS o estar autenticado con firebase login
 *   - Tener el proyecto Firebase configurado
 */

const admin = require("firebase-admin");

// Inicializar solo si no está ya inicializado
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

const valoresHistoricos = [
    {
        fecha_vigencia_desde: "2026-01-01", fecha_vigencia_hasta: "2026-12-31", ley_referencia: "Ley 21.751",
        tramo1_ingreso_desde: 0, tramo1_ingreso_hasta: 631976, tramo1_valor_unitario: 22007, tramo1_valor_duplo: 44014,
        tramo2_ingreso_desde: 631977, tramo2_ingreso_hasta: 923067, tramo2_valor_unitario: 13505, tramo2_valor_duplo: 27010,
        tramo3_ingreso_desde: 923068, tramo3_ingreso_hasta: 1439668, tramo3_valor_unitario: 4267, tramo3_valor_duplo: 8534,
        observaciones: "Período 2026 - valores proyectados",
    },
    {
        fecha_vigencia_desde: "2025-07-01", fecha_vigencia_hasta: "2025-12-31", ley_referencia: "Ley 21.751",
        tramo1_ingreso_desde: 0, tramo1_ingreso_hasta: 620251, tramo1_valor_unitario: 22007, tramo1_valor_duplo: 44014,
        tramo2_ingreso_desde: 620252, tramo2_ingreso_hasta: 905941, tramo2_valor_unitario: 13505, tramo2_valor_duplo: 27010,
        tramo3_ingreso_desde: 905942, tramo3_ingreso_hasta: 1412957, tramo3_valor_unitario: 4267, tramo3_valor_duplo: 8534,
        observaciones: "Período ingresos: enero a junio 2025",
    },
    {
        fecha_vigencia_desde: "2025-05-01", fecha_vigencia_hasta: "2025-06-30", ley_referencia: "Ley 21.751",
        tramo1_ingreso_desde: 0, tramo1_ingreso_hasta: 620251, tramo1_valor_unitario: 22007, tramo1_valor_duplo: 44014,
        tramo2_ingreso_desde: 620252, tramo2_ingreso_hasta: 905941, tramo2_valor_unitario: 13505, tramo2_valor_duplo: 27010,
        tramo3_ingreso_desde: 905942, tramo3_ingreso_hasta: 1412957, tramo3_valor_unitario: 4267, tramo3_valor_duplo: 8534,
        observaciones: "Período ingresos: enero a junio 2024",
    },
    {
        fecha_vigencia_desde: "2025-01-01", fecha_vigencia_hasta: "2025-04-30", ley_referencia: "Ley 21.578",
        tramo1_ingreso_desde: 0, tramo1_ingreso_hasta: 598698, tramo1_valor_unitario: 21243, tramo1_valor_duplo: 42486,
        tramo2_ingreso_desde: 598699, tramo2_ingreso_hasta: 874460, tramo2_valor_unitario: 13036, tramo2_valor_duplo: 26072,
        tramo3_ingreso_desde: 874461, tramo3_ingreso_hasta: 1363858, tramo3_valor_unitario: 4119, tramo3_valor_duplo: 8238,
        observaciones: "Período ingresos: enero a junio 2024",
    },
    {
        fecha_vigencia_desde: "2024-07-01", fecha_vigencia_hasta: "2024-12-31", ley_referencia: "Ley 21.685",
        tramo1_ingreso_desde: 0, tramo1_ingreso_hasta: 586227, tramo1_valor_unitario: 21243, tramo1_valor_duplo: 42486,
        tramo2_ingreso_desde: 586228, tramo2_ingreso_hasta: 856247, tramo2_valor_unitario: 13036, tramo2_valor_duplo: 26072,
        tramo3_ingreso_desde: 856248, tramo3_ingreso_hasta: 1335450, tramo3_valor_unitario: 4119, tramo3_valor_duplo: 8238,
        observaciones: "Período ingresos: enero a junio 2024",
    },
    {
        fecha_vigencia_desde: "2023-09-01", fecha_vigencia_hasta: "2024-06-30", ley_referencia: "Ley 21.578",
        tramo1_ingreso_desde: 0, tramo1_ingreso_hasta: 539328, tramo1_valor_unitario: 20328, tramo1_valor_duplo: 40656,
        tramo2_ingreso_desde: 539329, tramo2_ingreso_hasta: 787746, tramo2_valor_unitario: 12475, tramo2_valor_duplo: 24950,
        tramo3_ingreso_desde: 787747, tramo3_ingreso_hasta: 1228614, tramo3_valor_unitario: 3942, tramo3_valor_duplo: 7884,
        observaciones: "Período ingresos: enero a junio 2023",
    },
    {
        fecha_vigencia_desde: "2023-07-01", fecha_vigencia_hasta: "2023-08-31", ley_referencia: "Ley 21.550",
        tramo1_ingreso_desde: 0, tramo1_ingreso_hasta: 515879, tramo1_valor_unitario: 20328, tramo1_valor_duplo: 40656,
        tramo2_ingreso_desde: 515880, tramo2_ingreso_hasta: 753496, tramo2_valor_unitario: 12475, tramo2_valor_duplo: 24950,
        tramo3_ingreso_desde: 753497, tramo3_ingreso_hasta: 1175196, tramo3_valor_unitario: 3942, tramo3_valor_duplo: 7884,
        observaciones: "Período ingresos: enero a junio 2023",
    },
    {
        fecha_vigencia_desde: "2023-05-01", fecha_vigencia_hasta: "2023-06-30", ley_referencia: "Ley 21.550",
        tramo1_ingreso_desde: 0, tramo1_ingreso_hasta: 515879, tramo1_valor_unitario: 20328, tramo1_valor_duplo: 40656,
        tramo2_ingreso_desde: 515880, tramo2_ingreso_hasta: 753496, tramo2_valor_unitario: 12475, tramo2_valor_duplo: 24950,
        tramo3_ingreso_desde: 753497, tramo3_ingreso_hasta: 1175196, tramo3_valor_unitario: 3942, tramo3_valor_duplo: 7884,
        observaciones: "Período ingresos: enero a junio 2022",
    },
    {
        fecha_vigencia_desde: "2023-01-01", fecha_vigencia_hasta: "2023-04-30", ley_referencia: "Ley 21.456",
        tramo1_ingreso_desde: 0, tramo1_ingreso_hasta: 429899, tramo1_valor_unitario: 16828, tramo1_valor_duplo: 33656,
        tramo2_ingreso_desde: 429900, tramo2_ingreso_hasta: 627913, tramo2_valor_unitario: 10327, tramo2_valor_duplo: 20654,
        tramo3_ingreso_desde: 627914, tramo3_ingreso_hasta: 979330, tramo3_valor_unitario: 3264, tramo3_valor_duplo: 6528,
        observaciones: "Período ingresos: enero a junio 2022",
    },
    {
        fecha_vigencia_desde: "2022-08-01", fecha_vigencia_hasta: "2022-12-31", ley_referencia: "Ley 21.456",
        tramo1_ingreso_desde: 0, tramo1_ingreso_hasta: 419414, tramo1_valor_unitario: 16418, tramo1_valor_duplo: 32836,
        tramo2_ingreso_desde: 419415, tramo2_ingreso_hasta: 612598, tramo2_valor_unitario: 10075, tramo2_valor_duplo: 20150,
        tramo3_ingreso_desde: 612599, tramo3_ingreso_hasta: 955444, tramo3_valor_unitario: 3184, tramo3_valor_duplo: 6368,
        observaciones: "Período ingresos: enero a junio 2022",
    },
    {
        fecha_vigencia_desde: "2022-07-01", fecha_vigencia_hasta: "2022-07-31", ley_referencia: "Ley 21.456",
        tramo1_ingreso_desde: 0, tramo1_ingreso_hasta: 398443, tramo1_valor_unitario: 15597, tramo1_valor_duplo: 31194,
        tramo2_ingreso_desde: 398444, tramo2_ingreso_hasta: 581968, tramo2_valor_unitario: 9571, tramo2_valor_duplo: 19142,
        tramo3_ingreso_desde: 581969, tramo3_ingreso_hasta: 907672, tramo3_valor_unitario: 3025, tramo3_valor_duplo: 6050,
        observaciones: "Período ingresos: enero a junio 2022",
    },
    {
        fecha_vigencia_desde: "2022-05-01", fecha_vigencia_hasta: "2022-06-30", ley_referencia: "Ley 21.456",
        tramo1_ingreso_desde: 0, tramo1_ingreso_hasta: 398443, tramo1_valor_unitario: 15597, tramo1_valor_duplo: 31194,
        tramo2_ingreso_desde: 398444, tramo2_ingreso_hasta: 581968, tramo2_valor_unitario: 9571, tramo2_valor_duplo: 19142,
        tramo3_ingreso_desde: 581969, tramo3_ingreso_hasta: 907672, tramo3_valor_unitario: 3025, tramo3_valor_duplo: 6050,
        observaciones: "Período ingresos: enero a junio 2021",
    },
    {
        fecha_vigencia_desde: "2022-01-01", fecha_vigencia_hasta: "2022-04-30", ley_referencia: "Ley 21.360",
        tramo1_ingreso_desde: 0, tramo1_ingreso_hasta: 366987, tramo1_valor_unitario: 14366, tramo1_valor_duplo: 28732,
        tramo2_ingreso_desde: 366988, tramo2_ingreso_hasta: 536023, tramo2_valor_unitario: 8815, tramo2_valor_duplo: 17630,
        tramo3_ingreso_desde: 536024, tramo3_ingreso_hasta: 836014, tramo3_valor_unitario: 2786, tramo3_valor_duplo: 5572,
        observaciones: "Período ingresos: enero a junio 2021",
    },
    {
        fecha_vigencia_desde: "2021-07-01", fecha_vigencia_hasta: "2021-12-31", ley_referencia: "Ley 21.360",
        tramo1_ingreso_desde: 0, tramo1_ingreso_hasta: 353356, tramo1_valor_unitario: 13832, tramo1_valor_duplo: 27664,
        tramo2_ingreso_desde: 353357, tramo2_ingreso_hasta: 516114, tramo2_valor_unitario: 8488, tramo2_valor_duplo: 16976,
        tramo3_ingreso_desde: 516115, tramo3_ingreso_hasta: 804962, tramo3_valor_unitario: 2683, tramo3_valor_duplo: 5366,
        observaciones: "Período ingresos: enero a junio 2021",
    },
    {
        fecha_vigencia_desde: "2021-05-01", fecha_vigencia_hasta: "2021-06-30", ley_referencia: "Ley 21.360",
        tramo1_ingreso_desde: 0, tramo1_ingreso_hasta: 353356, tramo1_valor_unitario: 13832, tramo1_valor_duplo: 27664,
        tramo2_ingreso_desde: 353357, tramo2_ingreso_hasta: 516114, tramo2_valor_unitario: 8488, tramo2_valor_duplo: 16976,
        tramo3_ingreso_desde: 516115, tramo3_ingreso_hasta: 804962, tramo3_valor_unitario: 2683, tramo3_valor_duplo: 5366,
        observaciones: "Período ingresos: enero a junio 2020",
    },
    {
        fecha_vigencia_desde: "2020-09-01", fecha_vigencia_hasta: "2021-04-30", ley_referencia: "Ley 21.283",
        tramo1_ingreso_desde: 0, tramo1_ingreso_hasta: 342346, tramo1_valor_unitario: 13401, tramo1_valor_duplo: 26802,
        tramo2_ingreso_desde: 342347, tramo2_ingreso_hasta: 500033, tramo2_valor_unitario: 8224, tramo2_valor_duplo: 16448,
        tramo3_ingreso_desde: 500034, tramo3_ingreso_hasta: 779882, tramo3_valor_unitario: 2599, tramo3_valor_duplo: 5198,
        observaciones: "Período ingresos: enero a junio 2020",
    },
    {
        fecha_vigencia_desde: "2020-07-01", fecha_vigencia_hasta: "2020-08-31", ley_referencia: "Ley 21.112",
        tramo1_ingreso_desde: 0, tramo1_ingreso_hasta: 336055, tramo1_valor_unitario: 13155, tramo1_valor_duplo: 26310,
        tramo2_ingreso_desde: 336056, tramo2_ingreso_hasta: 490844, tramo2_valor_unitario: 8073, tramo2_valor_duplo: 16146,
        tramo3_ingreso_desde: 490845, tramo3_ingreso_hasta: 765550, tramo3_valor_unitario: 2551, tramo3_valor_duplo: 5102,
        observaciones: "Período ingresos: enero a junio 2020",
    },
    {
        fecha_vigencia_desde: "2020-03-01", fecha_vigencia_hasta: "2020-06-30", ley_referencia: "Ley 21.112",
        tramo1_ingreso_desde: 0, tramo1_ingreso_hasta: 336055, tramo1_valor_unitario: 13155, tramo1_valor_duplo: 26310,
        tramo2_ingreso_desde: 336056, tramo2_ingreso_hasta: 490844, tramo2_valor_unitario: 8073, tramo2_valor_duplo: 16146,
        tramo3_ingreso_desde: 490845, tramo3_ingreso_hasta: 765550, tramo3_valor_unitario: 2551, tramo3_valor_duplo: 5102,
        observaciones: "Período ingresos: enero a junio 2019",
    },
    {
        fecha_vigencia_desde: "2019-07-01", fecha_vigencia_hasta: "2020-02-29", ley_referencia: "Ley 21.112",
        tramo1_ingreso_desde: 0, tramo1_ingreso_hasta: 315841, tramo1_valor_unitario: 12364, tramo1_valor_duplo: 24728,
        tramo2_ingreso_desde: 315842, tramo2_ingreso_hasta: 461320, tramo2_valor_unitario: 7587, tramo2_valor_duplo: 15174,
        tramo3_ingreso_desde: 461321, tramo3_ingreso_hasta: 719502, tramo3_valor_unitario: 2398, tramo3_valor_duplo: 4796,
        observaciones: "Período ingresos: enero a junio 2019",
    },
    {
        fecha_vigencia_desde: "2019-03-01", fecha_vigencia_hasta: "2019-06-30", ley_referencia: "Ley 21.112",
        tramo1_ingreso_desde: 0, tramo1_ingreso_hasta: 315841, tramo1_valor_unitario: 12364, tramo1_valor_duplo: 24728,
        tramo2_ingreso_desde: 315842, tramo2_ingreso_hasta: 461320, tramo2_valor_unitario: 7587, tramo2_valor_duplo: 15174,
        tramo3_ingreso_desde: 461321, tramo3_ingreso_hasta: 719502, tramo3_valor_unitario: 2398, tramo3_valor_duplo: 4796,
        observaciones: "Período ingresos: enero a junio 2018",
    },
    {
        fecha_vigencia_desde: "2018-08-01", fecha_vigencia_hasta: "2019-02-28", ley_referencia: "Ley 21.112",
        tramo1_ingreso_desde: 0, tramo1_ingreso_hasta: 302200, tramo1_valor_unitario: 11887, tramo1_valor_duplo: 23774,
        tramo2_ingreso_desde: 302201, tramo2_ingreso_hasta: 441395, tramo2_valor_unitario: 7259, tramo2_valor_duplo: 14518,
        tramo3_ingreso_desde: 441396, tramo3_ingreso_hasta: 688427, tramo3_valor_unitario: 2295, tramo3_valor_duplo: 4590,
        observaciones: "Período ingresos: enero a junio 2018",
    },
    {
        fecha_vigencia_desde: "2018-07-01", fecha_vigencia_hasta: "2018-07-31", ley_referencia: "Ley 20.935",
        tramo1_ingreso_desde: 0, tramo1_ingreso_hasta: 289608, tramo1_valor_unitario: 11337, tramo1_valor_duplo: 22674,
        tramo2_ingreso_desde: 289609, tramo2_ingreso_hasta: 423004, tramo2_valor_unitario: 6957, tramo2_valor_duplo: 13914,
        tramo3_ingreso_desde: 423005, tramo3_ingreso_hasta: 659743, tramo3_valor_unitario: 2199, tramo3_valor_duplo: 4398,
        observaciones: "Período ingresos: enero a junio 2018",
    },
    {
        fecha_vigencia_desde: "2018-01-01", fecha_vigencia_hasta: "2018-06-30", ley_referencia: "Ley 20.935",
        tramo1_ingreso_desde: 0, tramo1_ingreso_hasta: 289608, tramo1_valor_unitario: 11337, tramo1_valor_duplo: 22674,
        tramo2_ingreso_desde: 289609, tramo2_ingreso_hasta: 423004, tramo2_valor_unitario: 6957, tramo2_valor_duplo: 13914,
        tramo3_ingreso_desde: 423005, tramo3_ingreso_hasta: 659743, tramo3_valor_unitario: 2199, tramo3_valor_duplo: 4398,
        observaciones: "Período ingresos: enero a junio 2017",
    },
];

async function seedValoresHistoricos() {
    console.log("Iniciando seed de valores_historicos...");

    const batch = db.batch();
    const collectionRef = db.collection("valores_historicos");

    // Verificar si ya existen datos
    const existing = await collectionRef.limit(1).get();
    if (!existing.empty) {
        console.log("La colección valores_historicos ya tiene datos. Limpiando...");
        const allDocs = await collectionRef.get();
        allDocs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        console.log("Datos anteriores eliminados.");
    }

    // Insertar en batches de 500 (límite de Firestore)
    const insertBatch = db.batch();
    valoresHistoricos.forEach((valor, index) => {
        const docId = `periodo_${String(index + 1).padStart(3, "0")}`;
        const docRef = collectionRef.doc(docId);
        insertBatch.set(docRef, valor);
    });

    await insertBatch.commit();
    console.log(`Se insertaron ${valoresHistoricos.length} registros en valores_historicos`);
    console.log("Seed completado exitosamente.");
}

seedValoresHistoricos()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("Error en seed:", err);
        process.exit(1);
    });
