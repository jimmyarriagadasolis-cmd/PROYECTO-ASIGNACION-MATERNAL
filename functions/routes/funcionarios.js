/**
 * Rutas de Funcionarios
 * Búsqueda y autocompletado desde la colección Funcionarios en Firestore
 */

const express = require('express');
const router = express.Router();
const { db } = require('../database');

/**
 * GET /api/funcionarios/buscar?q=...
 * Busca funcionarios por RUT o nombre (parcial)
 * Retorna hasta 10 resultados para autocompletado
 */
router.get('/buscar', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) {
            return res.json({ success: true, data: [] });
        }

        const query = q.trim().toUpperCase();
        const results = [];

        // Strategy: fetch all and filter in memory (Firestore doesn't support LIKE/contains)
        // For ~1300 records this is perfectly fine performance-wise
        const snapshot = await db.collection('Funcionarios').get();

        snapshot.docs.forEach(doc => {
            const f = doc.data();
            const rutClean = (f.rut || '').replace(/\./g, '').toUpperCase();
            const rutSinFormato = (f.rut_sin_formato || '').toUpperCase();
            const nombre = (f.nombre_completo || '').toUpperCase();

            const matchesRut = rutClean.includes(query) || rutSinFormato.includes(query);
            const matchesNombre = nombre.includes(query);

            if (matchesRut || matchesNombre) {
                results.push({
                    id: doc.id,
                    rut: f.rut,
                    nombre_completo: f.nombre_completo,
                    area: f.area,
                    cargo: f.cargo,
                    genero: f.genero,
                    grado: f.grado,
                    calidad_juridica: f.calidad_juridica,
                    tipo_funcionario: f.tipo_funcionario,
                    num_cargas: f.num_cargas
                });
            }
        });

        // Sort: exact RUT matches first, then by name
        results.sort((a, b) => {
            const aRutMatch = (a.rut || '').replace(/\./g, '').toUpperCase().startsWith(query);
            const bRutMatch = (b.rut || '').replace(/\./g, '').toUpperCase().startsWith(query);
            if (aRutMatch && !bRutMatch) return -1;
            if (!aRutMatch && bRutMatch) return 1;
            return (a.nombre_completo || '').localeCompare(b.nombre_completo || '');
        });

        res.json({ success: true, data: results.slice(0, 10) });
    } catch (error) {
        console.error('Error al buscar funcionarios:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/funcionarios/:rut
 * Obtiene un funcionario por su RUT (sin formato)
 */
router.get('/:rut', async (req, res) => {
    try {
        const rutId = req.params.rut.replace(/[^0-9kK]/gi, '').toUpperCase();
        const doc = await db.collection('Funcionarios').doc(rutId).get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, error: 'Funcionario no encontrado' });
        }

        res.json({ success: true, data: { id: doc.id, ...doc.data() } });
    } catch (error) {
        console.error('Error al obtener funcionario:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
