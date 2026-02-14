/**
 * Rutas de Configuración - Versión Firestore
 * Ministerio de las Culturas, las Artes y el Patrimonio - Chile
 */

const express = require('express');
const router = express.Router();
const { db } = require('../database'); // Instancia de Firestore
const { FieldValue } = require('firebase-admin/firestore');

/**
 * GET /api/config/tramos
 * Obtener la configuración de tramos desde un único documento.
 */
router.get('/tramos', async (req, res) => {
    try {
        const docRef = db.collection('configuracion').doc('tramos'); // ¡CORREGIDO!
        const doc = await docRef.get();

        if (!doc.exists) {
            // Si no existe, podemos devolver una estructura por defecto o un error
            return res.status(404).json({ success: false, error: 'Configuración de tramos no encontrada.' });
        }

        res.json({ success: true, data: doc.data() });
    } catch (error) {
        console.error('Error al obtener tramos:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});

/**
 * PUT /api/config/tramos
 * Actualizar la configuración de tramos en un único documento.
 */
router.put('/tramos', async (req, res) => {
    try {
        const nuevosTramos = req.body;
        // Aquí se podría añadir una validación de la estructura de `nuevosTramos`

        const docRef = db.collection('configuracion').doc('tramos'); // ¡CORREGIDO!
        
        await docRef.set(nuevosTramos, { merge: true }); // `merge: true` para no sobrescribir todo el documento si se envía un subset de campos.

        await db.collection('configuracion').doc('metadata').update({  // ¡CORREGIDO!
            ultima_actualizacion_tramos: FieldValue.serverTimestamp() 
        });

        res.json({ success: true, message: 'Tramos actualizados exitosamente' });
    } catch (error) {
        console.error('Error al actualizar tramos:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});

/**
 * GET /api/config/valores-historicos
 * Obtener los valores históricos de asignación para el cálculo.
 */
router.get('/valores-historicos', async (req, res) => {
    try {
        const snapshot = await db.collection('Valores_Asignacion_Historicos').orderBy('fecha_vigencia', 'desc').get();
        const valores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json({ success: true, data: valores });
    } catch (error) {
        console.error('Error al obtener valores históricos:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});

/**
 * POST /api/config/valores-historicos
 * Añadir un nuevo set de valores históricos (solo para administradores).
 */
router.post('/valores-historicos', async (req, res) => {
    try {
        const nuevoValor = req.body;
        // Validar que el body tenga los campos necesarios (fecha_vigencia, tramos, etc.)

        const docRef = await db.collection('Valores_Asignacion_Historicos').add(nuevoValor);
        res.status(201).json({ success: true, message: 'Valores históricos añadidos', data: { id: docRef.id } });
    } catch (error) {
        console.error('Error al añadir valores históricos:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});


/**
 * GET /api/config/departamentos
 * Obtener lista de departamentos únicos desde las solicitudes.
 * Nota: Esto puede ser ineficiente con un gran número de solicitudes.
 */
router.get('/departamentos', async (req, res) => {
    try {
        const snapshot = await db.collection('Solicitudes_Asignacion_Maternal').select('departamento_unidad').get();
        const departamentos = new Set();
        
        snapshot.forEach(doc => {
            const depto = doc.data().departamento_unidad;
            if (depto) {
                departamentos.add(depto);
            }
        });

        res.json({ success: true, data: Array.from(departamentos).sort() });
    } catch (error) {
        console.error('Error al obtener departamentos:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});

module.exports = router;
