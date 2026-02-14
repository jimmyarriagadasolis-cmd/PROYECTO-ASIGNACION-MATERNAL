/**
 * Rutas de Configuración - Firebase App Hosting (Firestore)
 * Ministerio de las Culturas, las Artes y el Patrimonio - Chile
 */

const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { verificarAuth, verificarRol } = require('../middleware/auth');

const db = admin.firestore();

/**
 * GET /config
 * Obtener toda la configuración
 */
router.get('/', verificarAuth, async (req, res) => {
    try {
        const snapshot = await db.collection('configuracion').get();
        const config = {};
        snapshot.forEach(doc => {
            config[doc.id] = doc.data().valor;
        });

        res.json({ success: true, data: config });
    } catch (error) {
        console.error('Error al obtener configuración:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /config/tramos
 * Obtener configuración de tramos
 */
router.get('/tramos', verificarAuth, async (req, res) => {
    try {
        const keys = [
            'tramo1_limite', 'tramo1_monto',
            'tramo2_limite', 'tramo2_monto',
            'tramo3_limite', 'tramo3_monto'
        ];

        const docs = await Promise.all(
            keys.map(k => db.collection('configuracion').doc(k).get())
        );

        const vals = {};
        docs.forEach((doc, i) => {
            vals[keys[i]] = doc.exists ? parseFloat(doc.data().valor) : 0;
        });

        res.json({
            success: true,
            data: {
                tramo1: { limite: vals.tramo1_limite, monto: vals.tramo1_monto },
                tramo2: { limite: vals.tramo2_limite, monto: vals.tramo2_monto },
                tramo3: { limite: vals.tramo3_limite, monto: vals.tramo3_monto }
            }
        });
    } catch (error) {
        console.error('Error al obtener tramos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /config/tramos/actualizar
 * Actualizar todos los tramos
 */
router.put('/tramos/actualizar', verificarAuth, verificarRol('administrador', 'admin'), async (req, res) => {
    try {
        const { tramo1, tramo2, tramo3 } = req.body;
        const batch = db.batch();
        const ts = admin.firestore.FieldValue.serverTimestamp();

        const updates = {
            tramo1_limite: tramo1.limite,
            tramo1_monto: tramo1.monto,
            tramo2_limite: tramo2.limite,
            tramo2_monto: tramo2.monto,
            tramo3_limite: tramo3.limite,
            tramo3_monto: tramo3.monto
        };

        for (const [key, valor] of Object.entries(updates)) {
            const ref = db.collection('configuracion').doc(key);
            batch.set(ref, { valor: valor.toString(), fecha_actualizacion: ts }, { merge: true });
        }

        await batch.commit();

        await db.collection('logs_auditoria').add({
            usuario_id: req.user.uid,
            accion: 'actualizar_tramos',
            detalle: 'Tramos de asignación actualizados',
            fecha: ts
        });

        res.json({ success: true, message: 'Tramos actualizados exitosamente' });
    } catch (error) {
        console.error('Error al actualizar tramos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /config/:clave
 * Actualizar un valor de configuración
 */
router.put('/:clave', verificarAuth, verificarRol('administrador', 'admin'), async (req, res) => {
    try {
        const { clave } = req.params;
        const { valor } = req.body;

        await db.collection('configuracion').doc(clave).set({
            valor: valor,
            fecha_actualizacion: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        res.json({ success: true, message: `Configuración '${clave}' actualizada` });
    } catch (error) {
        console.error('Error al actualizar configuración:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /config/departamentos
 * Obtener lista de departamentos únicos
 */
router.get('/departamentos', verificarAuth, async (req, res) => {
    try {
        const snapshot = await db.collection('solicitudes').get();
        const departamentos = new Set();
        snapshot.forEach(doc => {
            const dept = doc.data().departamento_unidad;
            if (dept) departamentos.add(dept);
        });

        res.json({ success: true, data: Array.from(departamentos).sort() });
    } catch (error) {
        console.error('Error al obtener departamentos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
