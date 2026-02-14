/**
 * Rutas de Solicitudes - Firebase App Hosting (Firestore)
 * Ministerio de las Culturas, las Artes y el Patrimonio - Chile
 */

const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { verificarAuth } = require('../middleware/auth');
const { validarSolicitud } = require('../utils/validaciones');
const { calcularAsignacionMaternal } = require('../services/calculoAsignacion');

const db = admin.firestore();

/**
 * GET /solicitudes/estadisticas
 */
router.get('/estadisticas', verificarAuth, async (req, res) => {
    try {
        const snapshot = await db.collection('solicitudes').get();
        const solicitudes = [];
        snapshot.forEach(doc => solicitudes.push({ id: doc.id, ...doc.data() }));

        // Por estado
        const porEstado = {};
        solicitudes.forEach(s => {
            if (!porEstado[s.estado_solicitud]) {
                porEstado[s.estado_solicitud] = { estado_solicitud: s.estado_solicitud, cantidad: 0, monto_total: 0 };
            }
            porEstado[s.estado_solicitud].cantidad++;
            porEstado[s.estado_solicitud].monto_total += s.monto_total_pagable || 0;
        });

        // Por departamento
        const porDepartamento = {};
        solicitudes.forEach(s => {
            const dept = s.departamento_unidad || 'Sin Departamento';
            if (!porDepartamento[dept]) {
                porDepartamento[dept] = { departamento_unidad: dept, cantidad: 0, monto_total: 0 };
            }
            porDepartamento[dept].cantidad++;
            porDepartamento[dept].monto_total += s.monto_total_pagable || 0;
        });

        // Por tramo
        const porTramo = {};
        solicitudes.forEach(s => {
            const tramo = s.tramo_asignacion || 0;
            if (!porTramo[tramo]) {
                porTramo[tramo] = { tramo_asignacion: tramo, cantidad: 0, monto_total: 0 };
            }
            porTramo[tramo].cantidad++;
            porTramo[tramo].monto_total += s.monto_total_pagable || 0;
        });

        // Últimos 30 días
        const hace30Dias = new Date();
        hace30Dias.setDate(hace30Dias.getDate() - 30);
        const solicitudesUltimos30Dias = solicitudes.filter(s => {
            const fecha = s.fecha_registro?.toDate ? s.fecha_registro.toDate() : new Date(s.fecha_registro);
            return fecha >= hace30Dias;
        }).length;

        res.json({
            success: true,
            data: {
                porEstado: Object.values(porEstado),
                totales: {
                    total_solicitudes: solicitudes.length,
                    monto_total_acumulado: solicitudes.reduce((sum, s) => sum + (s.monto_total_pagable || 0), 0),
                    total_retroactivos: solicitudes.reduce((sum, s) => sum + (s.monto_total_retroactivo || 0), 0),
                    total_futuros: solicitudes.reduce((sum, s) => sum + (s.monto_total_futuro || 0), 0)
                },
                porDepartamento: Object.values(porDepartamento).sort((a, b) => b.cantidad - a.cantidad),
                porTramo: Object.values(porTramo),
                solicitudesUltimos30Dias
            }
        });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /solicitudes
 */
router.get('/', verificarAuth, async (req, res) => {
    try {
        const { estado, departamento, busqueda, limit: limitParam } = req.query;

        let query = db.collection('solicitudes');

        if (estado) {
            query = query.where('estado_solicitud', '==', estado);
        }
        if (departamento) {
            query = query.where('departamento_unidad', '==', departamento);
        }

        query = query.orderBy('fecha_registro', 'desc');

        if (limitParam) {
            query = query.limit(parseInt(limitParam));
        }

        const snapshot = await query.get();
        let solicitudes = [];
        snapshot.forEach(doc => {
            solicitudes.push({ id_solicitud: doc.id, ...doc.data() });
        });

        // Filtro de búsqueda en memoria
        if (busqueda) {
            const b = busqueda.toLowerCase();
            solicitudes = solicitudes.filter(s =>
                (s.nombre_completo || '').toLowerCase().includes(b) ||
                (s.rut_funcionaria || '').toLowerCase().includes(b)
            );
        }

        res.json({ success: true, data: solicitudes });
    } catch (error) {
        console.error('Error al obtener solicitudes:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /solicitudes/:id
 */
router.get('/:id', verificarAuth, async (req, res) => {
    try {
        const doc = await db.collection('solicitudes').doc(req.params.id).get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
        }

        res.json({ success: true, data: { id_solicitud: doc.id, ...doc.data() } });
    } catch (error) {
        console.error('Error al obtener solicitud:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /solicitudes/calcular-preview
 */
router.post('/calcular-preview', verificarAuth, async (req, res) => {
    try {
        const resultado = await calcularAsignacionMaternal(req.body);
        res.json({ success: true, data: resultado });
    } catch (error) {
        console.error('Error en cálculo preview:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /solicitudes
 * Crear nueva solicitud
 */
router.post('/', verificarAuth, async (req, res) => {
    try {
        const validacion = validarSolicitud(req.body);
        if (!validacion.valido) {
            return res.status(400).json({
                success: false,
                error: 'Datos inválidos',
                errores: validacion.errores
            });
        }

        // Calcular asignación
        const calculo = await calcularAsignacionMaternal(req.body);

        const solicitud = {
            rut_funcionaria: validacion.rutFormateado || req.body.rut_funcionaria,
            nombre_completo: req.body.nombre_completo.trim(),
            departamento_unidad: req.body.departamento_unidad.trim(),
            correo_electronico: req.body.correo_electronico.trim(),
            telefono: req.body.telefono || null,
            fecha_inicio_embarazo: req.body.fecha_inicio_embarazo,
            fecha_nacimiento: req.body.fecha_nacimiento || null,
            fecha_ingreso_solicitud: req.body.fecha_ingreso_solicitud,
            sueldo_bruto_mensual: parseFloat(req.body.sueldo_bruto_mensual),
            tramo_asignacion: calculo.tramo,
            monto_mensual_asignacion: calculo.montoMensual,
            meses_retroactivos: calculo.mesesRetroactivos,
            monto_total_retroactivo: calculo.montoTotalRetroactivo,
            meses_futuros: calculo.mesesFuturos || 0,
            monto_total_futuro: calculo.montoTotalFuturo || 0,
            monto_total_pagable: calculo.montoTotalPagable,
            desglose_mensual: calculo.desgloseMensual || [],
            estado_solicitud: 'Ingresada',
            observaciones: req.body.observaciones || '',
            usuario_id: req.user.uid,
            fecha_registro: admin.firestore.FieldValue.serverTimestamp(),
            fecha_actualizacion: admin.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await db.collection('solicitudes').add(solicitud);

        // Log de auditoría
        await db.collection('logs_auditoria').add({
            usuario_id: req.user.uid,
            accion: 'crear_solicitud',
            solicitud_id: docRef.id,
            detalle: `Solicitud creada para ${solicitud.nombre_completo}`,
            fecha: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({
            success: true,
            message: 'Solicitud creada exitosamente',
            data: { id: docRef.id, ...solicitud }
        });
    } catch (error) {
        console.error('Error al crear solicitud:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /solicitudes/:id
 */
router.put('/:id', verificarAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const docRef = db.collection('solicitudes').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
        }

        // Recalcular si cambiaron datos económicos
        let calculo = null;
        if (req.body.sueldo_bruto_mensual || req.body.fecha_inicio_embarazo || req.body.fecha_ingreso_solicitud) {
            const datosCalculo = { ...doc.data(), ...req.body };
            calculo = await calcularAsignacionMaternal(datosCalculo);
        }

        const updateData = {
            ...req.body,
            fecha_actualizacion: admin.firestore.FieldValue.serverTimestamp()
        };

        if (calculo) {
            updateData.tramo_asignacion = calculo.tramo;
            updateData.monto_mensual_asignacion = calculo.montoMensual;
            updateData.meses_retroactivos = calculo.mesesRetroactivos;
            updateData.monto_total_retroactivo = calculo.montoTotalRetroactivo;
            updateData.meses_futuros = calculo.mesesFuturos || 0;
            updateData.monto_total_futuro = calculo.montoTotalFuturo || 0;
            updateData.monto_total_pagable = calculo.montoTotalPagable;
            updateData.desglose_mensual = calculo.desgloseMensual || [];
        }

        // No permitir actualizar campos internos
        delete updateData.usuario_id;
        delete updateData.fecha_registro;

        await docRef.update(updateData);

        // Log
        await db.collection('logs_auditoria').add({
            usuario_id: req.user.uid,
            accion: 'actualizar_solicitud',
            solicitud_id: id,
            detalle: `Solicitud actualizada`,
            fecha: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ success: true, message: 'Solicitud actualizada exitosamente' });
    } catch (error) {
        console.error('Error al actualizar solicitud:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /solicitudes/:id
 */
router.delete('/:id', verificarAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const doc = await db.collection('solicitudes').doc(id).get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
        }

        await db.collection('solicitudes').doc(id).delete();

        await db.collection('logs_auditoria').add({
            usuario_id: req.user.uid,
            accion: 'eliminar_solicitud',
            solicitud_id: id,
            detalle: `Solicitud eliminada: ${doc.data().nombre_completo}`,
            fecha: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ success: true, message: 'Solicitud eliminada exitosamente' });
    } catch (error) {
        console.error('Error al eliminar solicitud:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /solicitudes/:id/aprobar
 */
router.post('/:id/aprobar', verificarAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const docRef = db.collection('solicitudes').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
        }

        await docRef.update({
            estado_solicitud: 'Aprobada',
            fecha_aprobacion: admin.firestore.FieldValue.serverTimestamp(),
            aprobado_por: req.user.uid,
            fecha_actualizacion: admin.firestore.FieldValue.serverTimestamp()
        });

        await db.collection('logs_auditoria').add({
            usuario_id: req.user.uid,
            accion: 'aprobar_solicitud',
            solicitud_id: id,
            detalle: `Solicitud aprobada: ${doc.data().nombre_completo}`,
            fecha: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ success: true, message: 'Solicitud aprobada exitosamente' });
    } catch (error) {
        console.error('Error al aprobar solicitud:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /solicitudes/:id/rechazar
 */
router.post('/:id/rechazar', verificarAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { motivo } = req.body;
        const docRef = db.collection('solicitudes').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
        }

        await docRef.update({
            estado_solicitud: 'Rechazada',
            motivo_rechazo: motivo || 'Sin motivo especificado',
            rechazado_por: req.user.uid,
            fecha_actualizacion: admin.firestore.FieldValue.serverTimestamp()
        });

        await db.collection('logs_auditoria').add({
            usuario_id: req.user.uid,
            accion: 'rechazar_solicitud',
            solicitud_id: id,
            detalle: `Solicitud rechazada: ${doc.data().nombre_completo}. Motivo: ${motivo || 'N/A'}`,
            fecha: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ success: true, message: 'Solicitud rechazada' });
    } catch (error) {
        console.error('Error al rechazar solicitud:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
