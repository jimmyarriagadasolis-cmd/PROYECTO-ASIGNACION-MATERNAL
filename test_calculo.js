// Test de cálculo de asignación maternal
const db = require('./backend/database');

async function test() {
    await db.initDatabase();

    // Importar migraciones primero
    require('./backend/migrations/agregar_valores_historicos').ejecutarMigracion();

    const { calcularAsignacionMaternal, determinarTramo, obtenerConfiguracionTramos } = require('./backend/services/calculoAsignacion');

    console.log('\n=== TEST 1: Enero 2025, Sueldo $500.000 ===');
    const config1 = obtenerConfiguracionTramos(new Date(2025, 0, 15));
    console.log('Config Enero 2025:', JSON.stringify(config1, null, 2));

    const tramo1 = determinarTramo(500000, new Date(2025, 0, 15));
    console.log('Tramo para $500.000:', tramo1.tramo, '-> Monto:', tramo1.montoMensual);

    console.log('\n=== TEST 2: Mayo 2025, Sueldo $500.000 ===');
    const config2 = obtenerConfiguracionTramos(new Date(2025, 4, 15));
    console.log('Config Mayo 2025:', JSON.stringify(config2, null, 2));

    const tramo2 = determinarTramo(500000, new Date(2025, 4, 15));
    console.log('Tramo para $500.000:', tramo2.tramo, '-> Monto:', tramo2.montoMensual);

    console.log('\n=== TEST 3: Cálculo completo Embarazo Ene-Sep 2025, Sueldo $500.000 ===');
    const calculo = calcularAsignacionMaternal({
        fechaInicioEmbarazo: '2025-01-01',
        fechaNacimiento: '2025-09-30',
        fechaIngresoSolicitud: '2026-01-30',
        sueldoBrutoMensual: 500000
    });

    console.log('Resultado:', {
        tramo: calculo.tramo,
        montoMensual: calculo.montoMensual,
        mesesRetroactivos: calculo.mesesRetroactivos,
        montoTotalRetroactivo: calculo.montoTotalRetroactivo,
        mesesFuturos: calculo.mesesFuturos,
        montoTotalPagable: calculo.montoTotalPagable
    });

    console.log('\nDesglose mensual:');
    calculo.desgloseMensual.forEach(m => {
        console.log(`  ${m.mesAño}: Tramo ${m.tramo} -> $${m.monto} (${m.leyVigente})`);
    });

    console.log('\n=== TEST 4: Julio 2024, Sueldo $600.000 ===');
    const config3 = obtenerConfiguracionTramos(new Date(2024, 6, 15));
    console.log('Config Jul 2024:', JSON.stringify(config3, null, 2));

    const tramo3 = determinarTramo(600000, new Date(2024, 6, 15));
    console.log('Tramo para $600.000:', tramo3.tramo, '-> Monto:', tramo3.montoMensual);

    process.exit(0);
}

test().catch(e => { console.error(e); process.exit(1); });
