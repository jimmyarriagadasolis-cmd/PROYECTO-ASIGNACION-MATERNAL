/**
 * Rutas de Configuración
 * Ministerio de las Culturas, las Artes y el Patrimonio - Chile
 */

const express = require('express');
const router = express.Router();
const db = require('../database');

/**
 * GET /api/config
 * Obtener toda la configuración
 */
router.get('/', (req, res) => {
    try {
        const config = db.prepare('SELECT * FROM Configuracion ORDER BY clave').all();

        // Convertir a objeto
        const configObj = {};
        config.forEach(c => {
            configObj[c.clave] = {
                valor: c.valor,
                descripcion: c.descripcion,
                fecha_actualizacion: c.fecha_actualizacion
            };
        });

        res.json({ success: true, data: configObj });
    } catch (error) {
        console.error('Error al obtener configuración:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/config/tramos
 * Obtener configuración de tramos
 */
router.get('/tramos', (req, res) => {
    try {
        const tramos = db.prepare('SELECT * FROM Configuracion WHERE clave LIKE ?').all('tramo%');

        const tramosObj = {
            tramo1: { limite: 0, monto: 0 },
            tramo2: { limite: 0, monto: 0 },
            tramo3: { limite: 0, monto: 0 }
        };

        tramos.forEach(t => {
            if (t.clave === 'tramo1_limite') tramosObj.tramo1.limite = parseFloat(t.valor);
            if (t.clave === 'tramo1_monto') tramosObj.tramo1.monto = parseFloat(t.valor);
            if (t.clave === 'tramo2_limite') tramosObj.tramo2.limite = parseFloat(t.valor);
            if (t.clave === 'tramo2_monto') tramosObj.tramo2.monto = parseFloat(t.valor);
            if (t.clave === 'tramo3_limite') tramosObj.tramo3.limite = parseFloat(t.valor);
            if (t.clave === 'tramo3_monto') tramosObj.tramo3.monto = parseFloat(t.valor);
        });

        res.json({ success: true, data: tramosObj });
    } catch (error) {
        console.error('Error al obtener tramos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/config/:clave
 * Actualizar un valor de configuración
 */
router.put('/:clave', (req, res) => {
    try {
        const { clave } = req.params;
        const { valor } = req.body;

        const existe = db.prepare('SELECT clave FROM Configuracion WHERE clave = ?').get(clave);
        if (!existe) {
            return res.status(404).json({ success: false, error: 'Clave de configuración no encontrada' });
        }

        db.prepare(`
            UPDATE Configuracion 
            SET valor = ?, fecha_actualizacion = datetime('now', 'localtime')
            WHERE clave = ?
        `).run(valor.toString(), clave);

        res.json({ success: true, message: 'Configuración actualizada' });
    } catch (error) {
        console.error('Error al actualizar configuración:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/config/tramos/actualizar
 * Actualizar todos los tramos de una vez
 */
router.put('/tramos/actualizar', (req, res) => {
    try {
        const { tramo1, tramo2, tramo3 } = req.body;

        const updateStmt = db.prepare(`
            UPDATE Configuracion 
            SET valor = ?, fecha_actualizacion = datetime('now', 'localtime')
            WHERE clave = ?
        `);

        if (tramo1) {
            if (tramo1.limite) updateStmt.run(tramo1.limite.toString(), 'tramo1_limite');
            if (tramo1.monto) updateStmt.run(tramo1.monto.toString(), 'tramo1_monto');
        }
        if (tramo2) {
            if (tramo2.limite) updateStmt.run(tramo2.limite.toString(), 'tramo2_limite');
            if (tramo2.monto) updateStmt.run(tramo2.monto.toString(), 'tramo2_monto');
        }
        if (tramo3) {
            if (tramo3.limite) updateStmt.run(tramo3.limite.toString(), 'tramo3_limite');
            if (tramo3.monto) updateStmt.run(tramo3.monto.toString(), 'tramo3_monto');
        }

        res.json({ success: true, message: 'Tramos actualizados exitosamente' });
    } catch (error) {
        console.error('Error al actualizar tramos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/config/departamentos
 * Obtener lista de departamentos únicos
 */
router.get('/departamentos', (req, res) => {
    try {
        const departamentos = db.prepare(`
            SELECT DISTINCT departamento_unidad 
            FROM Solicitudes_Asignacion_Maternal 
            WHERE departamento_unidad IS NOT NULL
            ORDER BY departamento_unidad
        `).all();

        res.json({
            success: true,
            data: departamentos.map(d => d.departamento_unidad)
        });
    } catch (error) {
        console.error('Error al obtener departamentos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
