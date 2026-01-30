/**
 * Rutas de Solicitudes de Asignación Maternal
 * Ministerio de las Culturas, las Artes y el Patrimonio - Chile
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const { calcularAsignacionMaternal, formatearMoneda } = require('../services/calculoAsignacion');
const { validarSolicitud } = require('../utils/validaciones');

function normalizeDepartamento(value) {
    if (typeof value !== 'string') return value;
    return value.replace(/siclo/ig, 'ciclo');
}

/**
 * GET /api/solicitudes
 * Obtener todas las solicitudes con filtros opcionales
 */
router.get('/', (req, res) => {
    try {
        const { estado, departamento, fechaDesde, fechaHasta, tramo, limit } = req.query;

        let query = 'SELECT * FROM Solicitudes_Asignacion_Maternal WHERE 1=1';
        const params = [];

        if (estado) {
            query += ' AND estado_solicitud = ?';
            params.push(estado);
        }

        if (departamento) {
            query += ' AND departamento_unidad LIKE ?';
            params.push(`%${departamento}%`);
        }

        if (fechaDesde) {
            query += ' AND fecha_ingreso_solicitud >= ?';
            params.push(fechaDesde);
        }

        if (fechaHasta) {
            query += ' AND fecha_ingreso_solicitud <= ?';
            params.push(fechaHasta);
        }

        if (tramo) {
            query += ' AND tramo_asignacion = ?';
            params.push(parseInt(tramo));
        }

        query += ' ORDER BY fecha_registro DESC';

        if (limit) {
            const limitVal = parseInt(limit);
            if (!isNaN(limitVal)) {
                query += ' LIMIT ?';
                params.push(limitVal);
            }
        }

        const solicitudes = db.prepare(query).all(params);

        // Parsear el desglose mensual JSON
        solicitudes.forEach(sol => {
            if (sol.desglose_mensual) {
                try {
                    sol.desglose_mensual = JSON.parse(sol.desglose_mensual);
                } catch (e) {
                    console.error('Error al parsear desglose_mensual:', e);
                    sol.desglose_mensual = [];
                }
            }
        });

        res.json({
            success: true,
            data: solicitudes,
            total: solicitudes.length
        });
    } catch (error) {
        console.error('Error al obtener solicitudes:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/solicitudes/estadisticas
 * Obtener estadísticas para el dashboard
 */
router.get('/estadisticas', (req, res) => {
    try {
        const stats = {};

        // Total de solicitudes por estado
        const porEstado = db.prepare(`
            SELECT estado_solicitud, COUNT(*) as cantidad, SUM(monto_total_pagable) as monto_total
            FROM Solicitudes_Asignacion_Maternal
            GROUP BY estado_solicitud
        `).all();
        stats.porEstado = porEstado;

        // Total general
        const total = db.prepare(`
            SELECT COUNT(*) as total_solicitudes, 
                   SUM(monto_total_pagable) as monto_total_acumulado,
                   SUM(monto_total_retroactivo) as total_retroactivos,
                   SUM(monto_total_futuro) as total_futuros
            FROM Solicitudes_Asignacion_Maternal
        `).get();
        stats.totales = total;

        // Por departamento
        const porDepartamento = db.prepare(`
            SELECT departamento_unidad, COUNT(*) as cantidad, SUM(monto_total_pagable) as monto_total
            FROM Solicitudes_Asignacion_Maternal
            GROUP BY departamento_unidad
            ORDER BY cantidad DESC
            LIMIT 10
        `).all();
        stats.porDepartamento = porDepartamento;

        // Por tramo
        const porTramo = db.prepare(`
            SELECT tramo_asignacion, COUNT(*) as cantidad, SUM(monto_total_pagable) as monto_total
            FROM Solicitudes_Asignacion_Maternal
            GROUP BY tramo_asignacion
        `).all();
        stats.porTramo = porTramo;

        // Solicitudes recientes (últimos 30 días)
        const recientes = db.prepare(`
            SELECT COUNT(*) as cantidad
            FROM Solicitudes_Asignacion_Maternal
            WHERE fecha_registro >= date('now', '-30 days')
        `).get();
        stats.solicitudesUltimos30Dias = recientes.cantidad;

        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/solicitudes/:id
 * Obtener una solicitud por ID
 */
router.get('/:id', (req, res) => {
    try {
        const solicitud = db.prepare('SELECT * FROM Solicitudes_Asignacion_Maternal WHERE id_solicitud = ?').get(req.params.id);

        if (!solicitud) {
            return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
        }

        if (solicitud.desglose_mensual) {
            solicitud.desglose_mensual = JSON.parse(solicitud.desglose_mensual);
        }

        res.json({ success: true, data: solicitud });
    } catch (error) {
        console.error('Error al obtener solicitud:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/solicitudes
 * Crear una nueva solicitud
 */
router.post('/', (req, res) => {
    try {
        const solicitud = req.body;

        // Validar campos
        if (solicitud && solicitud.departamento_unidad !== undefined) {
            solicitud.departamento_unidad = normalizeDepartamento(solicitud.departamento_unidad);
        }
        const validacion = validarSolicitud(solicitud);
        if (!validacion.valido) {
            return res.status(400).json({
                success: false,
                error: 'Errores de validación',
                errores: validacion.errores
            });
        }

        // Usar RUT formateado
        solicitud.rut_funcionaria = validacion.rutFormateado;

        // Calcular asignación
        const calculo = calcularAsignacionMaternal({
            fechaInicioEmbarazo: solicitud.fecha_inicio_embarazo,
            fechaNacimiento: solicitud.fecha_nacimiento || null,
            fechaIngresoSolicitud: solicitud.fecha_ingreso_solicitud,
            sueldoBrutoMensual: parseFloat(solicitud.sueldo_bruto_mensual)
        });

        // Preparar datos para insertar
        const stmt = db.prepare(`
            INSERT INTO Solicitudes_Asignacion_Maternal (
                rut_funcionaria, nombre_completo, departamento_unidad, correo_electronico,
                telefono, fecha_inicio_embarazo, fecha_nacimiento, fecha_ingreso_solicitud,
                sueldo_bruto_mensual, tramo_asignacion, monto_mensual_asignacion,
                meses_retroactivos, monto_total_retroactivo, meses_futuros, monto_total_futuro,
                monto_total_pagable, estado_solicitud, observaciones, usuario_registro, desglose_mensual
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            solicitud.rut_funcionaria,
            solicitud.nombre_completo.trim(),
            solicitud.departamento_unidad.trim(),
            solicitud.correo_electronico.trim(),
            solicitud.telefono?.trim() || null,
            solicitud.fecha_inicio_embarazo,
            solicitud.fecha_nacimiento || null,
            solicitud.fecha_ingreso_solicitud,
            parseFloat(solicitud.sueldo_bruto_mensual),
            calculo.tramo,
            calculo.montoMensual,
            calculo.mesesRetroactivos,
            calculo.montoTotalRetroactivo,
            calculo.mesesFuturos,
            calculo.montoTotalFuturo,
            calculo.montoTotalPagable,
            'Ingresada',
            solicitud.observaciones?.trim() || null,
            solicitud.usuario_id || 1,
            JSON.stringify(calculo.desgloseMensual)
        );

        // Registrar en log de auditoría
        db.prepare(`
            INSERT INTO Logs_Auditoria (usuario_id, accion, tabla_afectada, registro_id, datos_nuevos)
            VALUES (?, ?, ?, ?, ?)
        `).run(
            solicitud.usuario_id || 1,
            'CREAR',
            'Solicitudes_Asignacion_Maternal',
            result.lastInsertRowid,
            JSON.stringify(solicitud)
        );

        res.status(201).json({
            success: true,
            message: 'Solicitud creada exitosamente',
            data: {
                id_solicitud: result.lastInsertRowid,
                calculo: calculo,
                alertas: calculo.validacionPlazo?.valido === false ? [calculo.validacionPlazo.mensaje] : []
            }
        });
    } catch (error) {
        console.error('Error al crear solicitud:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/solicitudes/:id
 * Actualizar una solicitud existente
 */
router.put('/:id', (req, res) => {
    try {
        const id = req.params.id;
        const updates = req.body;

        if (updates && updates.departamento_unidad !== undefined) {
            updates.departamento_unidad = normalizeDepartamento(updates.departamento_unidad);
        }

        // Verificar que existe
        const solicitudActual = db.prepare('SELECT * FROM Solicitudes_Asignacion_Maternal WHERE id_solicitud = ?').get(id);
        if (!solicitudActual) {
            return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
        }

        // Construir query de actualización
        const campos = [];
        const valores = [];

        const camposPermitidos = [
            'nombre_completo', 'departamento_unidad', 'correo_electronico', 'telefono',
            'fecha_inicio_embarazo', 'fecha_nacimiento', 'fecha_ingreso_solicitud',
            'sueldo_bruto_mensual', 'estado_solicitud', 'observaciones', 'fecha_aprobacion',
            'fecha_primer_pago', 'usuario_aprobacion', 'archivo_certificado_compin'
        ];

        camposPermitidos.forEach(campo => {
            if (updates[campo] !== undefined) {
                campos.push(`${campo} = ?`);
                valores.push(updates[campo]);
            }
        });

        // Si cambia el sueldo o fechas, recalcular
        if (updates.sueldo_bruto_mensual || updates.fecha_inicio_embarazo || updates.fecha_ingreso_solicitud) {
            const calculo = calcularAsignacionMaternal({
                fechaInicioEmbarazo: updates.fecha_inicio_embarazo || solicitudActual.fecha_inicio_embarazo,
                fechaNacimiento: updates.fecha_nacimiento || solicitudActual.fecha_nacimiento,
                fechaIngresoSolicitud: updates.fecha_ingreso_solicitud || solicitudActual.fecha_ingreso_solicitud,
                sueldoBrutoMensual: parseFloat(updates.sueldo_bruto_mensual || solicitudActual.sueldo_bruto_mensual)
            });

            campos.push('tramo_asignacion = ?', 'monto_mensual_asignacion = ?',
                'meses_retroactivos = ?', 'monto_total_retroactivo = ?',
                'meses_futuros = ?', 'monto_total_futuro = ?',
                'monto_total_pagable = ?', 'desglose_mensual = ?');
            valores.push(calculo.tramo, calculo.montoMensual,
                calculo.mesesRetroactivos, calculo.montoTotalRetroactivo,
                calculo.mesesFuturos, calculo.montoTotalFuturo,
                calculo.montoTotalPagable, JSON.stringify(calculo.desgloseMensual));
        }

        if (campos.length === 0) {
            return res.status(400).json({ success: false, error: 'No hay campos para actualizar' });
        }

        valores.push(id);

        const stmt = db.prepare(`UPDATE Solicitudes_Asignacion_Maternal SET ${campos.join(', ')} WHERE id_solicitud = ?`);
        stmt.run(...valores);

        // Registrar en log de auditoría
        db.prepare(`
            INSERT INTO Logs_Auditoria (usuario_id, accion, tabla_afectada, registro_id, datos_anteriores, datos_nuevos)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            updates.usuario_id || 1,
            'ACTUALIZAR',
            'Solicitudes_Asignacion_Maternal',
            id,
            JSON.stringify(solicitudActual),
            JSON.stringify(updates)
        );

        // Obtener solicitud actualizada
        const solicitudActualizada = db.prepare('SELECT * FROM Solicitudes_Asignacion_Maternal WHERE id_solicitud = ?').get(id);
        if (solicitudActualizada.desglose_mensual) {
            solicitudActualizada.desglose_mensual = JSON.parse(solicitudActualizada.desglose_mensual);
        }

        res.json({
            success: true,
            message: 'Solicitud actualizada exitosamente',
            data: solicitudActualizada
        });
    } catch (error) {
        console.error('Error al actualizar solicitud:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/solicitudes/:id
 * Eliminar una solicitud
 */
router.delete('/:id', (req, res) => {
    try {
        const id = req.params.id;

        // Verificar que existe
        const solicitud = db.prepare('SELECT * FROM Solicitudes_Asignacion_Maternal WHERE id_solicitud = ?').get(id);
        if (!solicitud) {
            return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
        }

        // Solo permitir eliminar si está en estado "Ingresada"
        if (solicitud.estado_solicitud !== 'Ingresada') {
            return res.status(400).json({
                success: false,
                error: 'Solo se pueden eliminar solicitudes en estado "Ingresada"'
            });
        }

        db.prepare('DELETE FROM Solicitudes_Asignacion_Maternal WHERE id_solicitud = ?').run(id);

        // Registrar en log de auditoría
        db.prepare(`
            INSERT INTO Logs_Auditoria (usuario_id, accion, tabla_afectada, registro_id, datos_anteriores)
            VALUES (?, ?, ?, ?, ?)
        `).run(
            req.body.usuario_id || 1,
            'ELIMINAR',
            'Solicitudes_Asignacion_Maternal',
            id,
            JSON.stringify(solicitud)
        );

        res.json({ success: true, message: 'Solicitud eliminada exitosamente' });
    } catch (error) {
        console.error('Error al eliminar solicitud:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/solicitudes/:id/aprobar
 * Aprobar una solicitud
 */
router.post('/:id/aprobar', (req, res) => {
    try {
        const id = req.params.id;
        const { usuario_id } = req.body;

        const solicitud = db.prepare('SELECT * FROM Solicitudes_Asignacion_Maternal WHERE id_solicitud = ?').get(id);
        if (!solicitud) {
            return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
        }

        db.prepare(`
            UPDATE Solicitudes_Asignacion_Maternal 
            SET estado_solicitud = 'Aprobada', 
                fecha_aprobacion = datetime('now', 'localtime'),
                usuario_aprobacion = ?
            WHERE id_solicitud = ?
        `).run(usuario_id || 1, id);

        res.json({ success: true, message: 'Solicitud aprobada exitosamente' });
    } catch (error) {
        console.error('Error al aprobar solicitud:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/solicitudes/:id/rechazar
 * Rechazar una solicitud
 */
router.post('/:id/rechazar', (req, res) => {
    try {
        const id = req.params.id;
        const { usuario_id, motivo } = req.body;

        const solicitud = db.prepare('SELECT * FROM Solicitudes_Asignacion_Maternal WHERE id_solicitud = ?').get(id);
        if (!solicitud) {
            return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
        }

        db.prepare(`
            UPDATE Solicitudes_Asignacion_Maternal 
            SET estado_solicitud = 'Rechazada', 
                observaciones = COALESCE(observaciones || ' - ', '') || 'Rechazada: ' || ?,
                usuario_aprobacion = ?
            WHERE id_solicitud = ?
        `).run(motivo || 'Sin motivo especificado', usuario_id || 1, id);

        res.json({ success: true, message: 'Solicitud rechazada' });
    } catch (error) {
        console.error('Error al rechazar solicitud:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/solicitudes/calcular-preview
 * Calcular preview sin guardar
 */
router.post('/calcular-preview', (req, res) => {
    try {
        const { fecha_inicio_embarazo, fecha_nacimiento, fecha_ingreso_solicitud, sueldo_bruto_mensual } = req.body;

        const calculo = calcularAsignacionMaternal({
            fechaInicioEmbarazo: fecha_inicio_embarazo,
            fechaNacimiento: fecha_nacimiento || null,
            fechaIngresoSolicitud: fecha_ingreso_solicitud,
            sueldoBrutoMensual: parseFloat(sueldo_bruto_mensual)
        });

        res.json({ success: true, data: calculo });
    } catch (error) {
        console.error('Error al calcular preview:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
