/**
 * Script de sembrado de Funcionarios desde Funcionarios.xlsx
 * Ejecutar: node functions/scripts/seedFuncionarios.js
 */

const XLSX = require('xlsx');
const path = require('path');
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();

// Helper: format RUT from raw number to XX.XXX.XXX-D format
function formatRut(raw) {
    if (!raw) return '';
    let rut = raw.toString().replace(/[^0-9kK]/g, '').toUpperCase();
    if (rut.length < 2) return rut;
    const dv = rut.slice(-1);
    const cuerpo = rut.slice(0, -1);
    const formatted = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${formatted}-${dv}`;
}

// Helper: Title Case for names
function titleCase(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/(?:^|\s)\S/g, c => c.toUpperCase());
}

async function seedFuncionarios() {
    const xlsxPath = path.join(__dirname, '..', '..', 'Funcionarios.xlsx');
    console.log(`📂 Leyendo archivo: ${xlsxPath}`);

    const wb = XLSX.readFile(xlsxPath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws);

    console.log(`📊 Total registros encontrados: ${rows.length}`);

    // Firestore batch writes (max 500 per batch)
    const BATCH_SIZE = 450;
    let batch = db.batch();
    let count = 0;
    let totalWritten = 0;

    for (const row of rows) {
        const rutRaw = (row.RUT || '').toString().trim();
        if (!rutRaw) continue;

        const rutFormatted = formatRut(rutRaw);
        // Use raw RUT (digits + DV) as document ID for easy lookup
        const rutId = rutRaw.replace(/[^0-9kK]/gi, '').toUpperCase();

        const funcionario = {
            rut: rutFormatted,
            rut_sin_formato: rutId,
            nombre_completo: titleCase(row.NombrePersona || ''),
            area: (row.Area || '').trim(),
            calidad_juridica: (row.CalidadJuridica || '').trim(),
            asig_profesional: (row.AsigProfesional || '').trim(),
            genero: (row.Genero || '').trim(),
            grado: (row.Grado || '').toString().trim(),
            escalafon: (row.Escalafon || '').trim(),
            tipo_funcionario: (row['Tipo Funcionario'] || '').trim(),
            cargo: (row.Cargo || '').trim(),
            num_cargas: row['Nº Cargas'] || 0,
            tipo_pago: (row.TipoPago || '').trim(),
            banco: (row.Banco || '').trim(),
            tipo_cuenta: (row['Tipo Cuenta'] || '').trim(),
        };

        const docRef = db.collection('Funcionarios').doc(rutId);
        batch.set(docRef, funcionario, { merge: true });
        count++;
        totalWritten++;

        if (count >= BATCH_SIZE) {
            console.log(`  ✍️  Escribiendo batch (${totalWritten} registros)...`);
            await batch.commit();
            batch = db.batch();
            count = 0;
        }
    }

    // Commit remaining
    if (count > 0) {
        console.log(`  ✍️  Escribiendo batch final (${totalWritten} registros)...`);
        await batch.commit();
    }

    console.log(`\n✅ Sembrado completado: ${totalWritten} funcionarios guardados en Firestore`);
}

seedFuncionarios()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('❌ Error:', err);
        process.exit(1);
    });
