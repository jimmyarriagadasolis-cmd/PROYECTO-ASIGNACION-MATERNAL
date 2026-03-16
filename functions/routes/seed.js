/**
 * Ruta para sembrar datos de Funcionarios desde la app web
 * Solo para uso administrativo - requiere autenticación
 */

const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const path = require('path');
const { db } = require('../database');

/**
 * POST /api/seed/funcionarios
 * Ejecuta el sembrado de funcionarios desde Funcionarios.xlsx
 */
router.post('/funcionarios', async (req, res) => {
    try {
        console.log('🚀 Iniciando sembrado de funcionarios desde la app...');
        
        // Leer el archivo Excel
        const xlsxPath = path.join(__dirname, '..', '..', 'Funcionarios.xlsx');
        console.log(`📂 Leyendo archivo: ${xlsxPath}`);
        
        if (!require('fs').existsSync(xlsxPath)) {
            return res.status(404).json({ 
                success: false, 
                error: 'Archivo Funcionarios.xlsx no encontrado en el servidor' 
            });
        }

        const wb = XLSX.readFile(xlsxPath);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);
        
        console.log(`📊 Total registros encontrados: ${rows.length}`);

        // Helper functions
        const formatRut = (raw) => {
            if (!raw) return '';
            let rut = raw.toString().replace(/[^0-9kK]/g, '').toUpperCase();
            if (rut.length < 2) return rut;
            const dv = rut.slice(-1);
            const cuerpo = rut.slice(0, -1);
            const formatted = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            return `${formatted}-${dv}`;
        };

        const titleCase = (str) => {
            if (!str) return '';
            return str.toLowerCase().replace(/(?:^|\s)\S/g, c => c.toUpperCase());
        };

        // Firestore batch writes
        const BATCH_SIZE = 450;
        let batch = db.batch();
        let count = 0;
        let totalWritten = 0;
        let errors = [];

        for (const row of rows) {
            const rutRaw = (row.RUT || '').toString().trim();
            if (!rutRaw) continue;

            const rutFormatted = formatRut(rutRaw);
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

            try {
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
            } catch (error) {
                errors.push({
                    rut: rutFormatted,
                    nombre: funcionario.nombre_completo,
                    error: error.message
                });
            }
        }

        // Commit remaining
        if (count > 0) {
            console.log(`  ✍️  Escribiendo batch final (${totalWritten} registros)...`);
            await batch.commit();
        }

        // Verificar resultado
        const snapshot = await db.collection('Funcionarios').limit(1).get();
        const hasData = !snapshot.empty;

        res.json({
            success: true,
            message: `Sembrado completado: ${totalWritten} funcionarios guardados`,
            data: {
                totalProcessed: rows.length,
                totalWritten: totalWritten,
                errors: errors.length,
                hasData: hasData,
                errors: errors.slice(0, 10) // Primeros 10 errores
            }
        });

        console.log(`\n✅ Sembrado completado: ${totalWritten} funcionarios guardados en Firestore`);
        console.log(`❌ Errores: ${errors.length}`);

    } catch (error) {
        console.error('❌ Error en sembrado:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Error interno del servidor' 
        });
    }
});

/**
 * GET /api/seed/funcionarios/status
 * Verifica cuántos funcionarios hay en la colección
 */
router.get('/funcionarios/status', async (req, res) => {
    try {
        const snapshot = await db.collection('Funcionarios').get();
        res.json({
            success: true,
            data: {
                totalFuncionarios: snapshot.size,
                hasData: !snapshot.empty
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
