/**
 * Rutas de Solicitudes - Versión Firestore
 * Ministerio de las Culturas, las Artes y el Patrimonio - Chile
 */

const express = require('express');
const router = express.Router();
const { db } = require('../database'); // Instancia de Firestore
const { FieldValue } = require('firebase-admin/firestore');
const { calcularAsignacionMaternal } = require('../services/calculoAsignacion');
const { validarSolicitud } = require('../utils/validaciones');

// Helper para normalizar datos
function normalizeDepartamento(value) {
    if (typeof value !== 'string') return value;
    return value.replace(/siclo/ig, 'ciclo');
}

/**
 * GET /api/solicitudes
 * Obtener todas las solicitudes con filtros
 */
router.get('/', async (req, res) => {
    try {
        const { estado, departamento, fechaDesde, fechaHasta, tramo, limit } = req.query;

        let query = db.collection('Solicitudes_Asignacion_Maternal');

        if (estado) {
            query = query.where('estado_solicitud', '==', estado);
        }
        if (departamento) {
            // Firestore no tiene LIKE, usamos igualdad.
            query = query.where('departamento_unidad', '==', departamento);
        }
        if (fechaDesde) {
            query = query.where('fecha_ingreso_solicitud', '>=', fechaDesde);
        }
        if (fechaHasta) {
            query = query.where('fecha_ingreso_solicitud', '<=', fechaHasta);
        }
        if (tramo) {
            query = query.where('tramo_asignacion', '==', parseInt(tramo));
        }

        query = query.orderBy('fecha_registro', 'desc');

        if (limit) {
            query = query.limit(parseInt(limit));
        }

        const snapshot = await query.get();
        const solicitudes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        res.json({ success: true, data: solicitudes, total: solicitudes.length });

    } catch (error) {
        console.error('Error al obtener solicitudes:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});

/**
 * GET /api/solicitudes/estadisticas
 * Recrea las estadísticas del dashboard leyendo los datos y procesándolos en el servidor.
 */
router.get('/estadisticas', async (req, res) => {
    try {
        const snapshot = await db.collection('Solicitudes_Asignacion_Maternal').get();
        const solicitudes = snapshot.docs.map(doc => doc.data());

        const stats = {
            porEstado: {},
            totales: {
                total_solicitudes: solicitudes.length,
                monto_total_acumulado: 0,
                total_retroactivos: 0,
                total_futuros: 0
            },
            porDepartamento: {},
            porTramo: {},
            solicitudesUltimos30Dias: 0
        };

        const treintaDiasAtras = new Date();
        treintaDiasAtras.setDate(treintaDiasAtras.getDate() - 30);

        for (const sol of solicitudes) {
            // Por Estado
            if (!stats.porEstado[sol.estado_solicitud]) {
                stats.porEstado[sol.estado_solicitud] = { cantidad: 0, monto_total: 0 };
            }
            stats.porEstado[sol.estado_solicitud].cantidad++;
            stats.porEstado[sol.estado_solicitud].monto_total += sol.monto_total_pagable;

            // Totales
            stats.totales.monto_total_acumulado += sol.monto_total_pagable;
            stats.totales.total_retroactivos += sol.monto_total_retroactivo;
            stats.totales.total_futuros += sol.monto_total_futuro;

            // Por Departamento
            const depto = sol.departamento_unidad || 'No especificado';
            if (!stats.porDepartamento[depto]) {
                stats.porDepartamento[depto] = { cantidad: 0, monto_total: 0 };
            }
            stats.porDepartamento[depto].cantidad++;
            stats.porDepartamento[depto].monto_total += sol.monto_total_pagable;

            // Por Tramo
            const tramo = sol.tramo_asignacion || 'No especificado';
            if (!stats.porTramo[tramo]) {
                stats.porTramo[tramo] = { cantidad: 0, monto_total: 0 };
            }
            stats.porTramo[tramo].cantidad++;
            stats.porTramo[tramo].monto_total += sol.monto_total_pagable;
            
            // Recientes (convertir timestamp de Firestore a Date si es necesario)
            const fechaRegistro = sol.fecha_registro.toDate ? sol.fecha_registro.toDate() : new Date(sol.fecha_registro);
            if (fechaRegistro >= treintaDiasAtras) {
                 stats.solicitudesUltimos30Dias++;
            }
        }

        // Convertir los objetos a arrays como en la API original
        stats.porEstado = Object.entries(stats.porEstado).map(([k, v]) => ({ estado_solicitud: k, ...v }));
        stats.porDepartamento = Object.entries(stats.porDepartamento).map(([k, v]) => ({ departamento_unidad: k, ...v })).sort((a,b) => b.cantidad - a.cantidad).slice(0, 10);
        stats.porTramo = Object.entries(stats.porTramo).map(([k, v]) => ({ tramo_asignacion: k, ...v }));

        res.json({ success: true, data: stats });

    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});


/**
 * GET /api/solicitudes/:id
 * Obtener una solicitud por ID
 */
router.get('/:id', async (req, res) => {
    try {
        const docRef = db.collection('Solicitudes_Asignacion_Maternal').doc(req.params.id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
        }

        res.json({ success: true, data: { id: doc.id, ...doc.data() } });
    } catch (error) {
        console.error('Error al obtener solicitud:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});

/**
 * POST /api/solicitudes
 * Crear una nueva solicitud
 */
router.post('/', async (req, res) => {
    try {
        let solicitud = req.body;

        solicitud.departamento_unidad = normalizeDepartamento(solicitud.departamento_unidad);
        const validacion = validarSolicitud(solicitud);
        if (!validacion.valido) {
            return res.status(400).json({ success: false, error: 'Errores de validación', errores: validacion.errores });
        }
        solicitud.rut_funcionaria = validacion.rutFormateado;

        const calculo = calcularAsignacionMaternal({
            fechaInicioEmbarazo: solicitud.fecha_inicio_embarazo,
            fechaNacimiento: solicitud.fecha_nacimiento || null,
            fechaIngresoSolicitud: solicitud.fecha_ingreso_solicitud,
            sueldoBrutoMensual: parseFloat(solicitud.sueldo_bruto_mensual)
        });

        const nuevaSolicitud = {
            rut_funcionaria: solicitud.rut_funcionaria,
            nombre_completo: solicitud.nombre_completo.trim(),
            departamento_unidad: solicitud.departamento_unidad.trim(),
            correo_electronico: solicitud.correo_electronico.trim(),
            telefono: solicitud.telefono?.trim() || null,
            fecha_inicio_embarazo: solicitud.fecha_inicio_embarazo,
            fecha_nacimiento: solicitud.fecha_nacimiento || null,
            fecha_ingreso_solicitud: solicitud.fecha_ingreso_solicitud,
            sueldo_bruto_mensual: parseFloat(solicitud.sueldo_bruto_mensual),
            tramo_asignacion: calculo.tramo,
            monto_mensual_asignacion: calculo.montoMensual,
            meses_retroactivos: calculo.mesesRetroactivos,
            monto_total_retroactivo: calculo.montoTotalRetroactivo,
            meses_futuros: calculo.mesesFuturos,
            monto_total_futuro: calculo.montoTotalFuturo,
            monto_total_pagable: calculo.montoTotalPagable,
            estado_solicitud: 'Ingresada',
            observaciones: solicitud.observaciones?.trim() || null,
            usuario_registro: solicitud.usuario_id || 'sistema',
            desglose_mensual: calculo.desgloseMensual, // Guardar como objeto/array, no JSON
            fecha_registro: FieldValue.serverTimestamp(), // Usar timestamp del servidor
        };

        const docRef = await db.collection('Solicitudes_Asignacion_Maternal').add(nuevaSolicitud);
        
        res.status(201).json({
            success: true,
            message: 'Solicitud creada exitosamente',
            data: {
                id_solicitud: docRef.id,
                calculo: calculo
            }
        });

    } catch (error) {
        console.error('Error al crear solicitud:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});

/**
 * PUT /api/solicitudes/:id
 * Actualizar una solicitud existente
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const docRef = db.collection('Solicitudes_Asignacion_Maternal').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
        }

        const solicitudActual = doc.data();
        const camposActualizar = {};

        const camposPermitidos = [
            'nombre_completo', 'departamento_unidad', 'correo_electronico', 'telefono',
            'fecha_inicio_embarazo', 'fecha_nacimiento', 'fecha_ingreso_solicitud',
            'sueldo_bruto_mensual', 'estado_solicitud', 'observaciones', 'fecha_aprobacion',
            'fecha_primer_pago', 'usuario_aprobacion', 'archivo_certificado_compin'
        ];

        camposPermitidos.forEach(campo => {
            if (updates[campo] !== undefined) {
                camposActualizar[campo] = updates[campo];
            }
        });
        if (camposActualizar.departamento_unidad) {
            camposActualizar.departamento_unidad = normalizeDepartamento(camposActualizar.departamento_unidad);
        }

        if (updates.sueldo_bruto_mensual || updates.fecha_inicio_embarazo || updates.fecha_ingreso_solicitud) {
            const calculo = calcularAsignacionMaternal({
                fechaInicioEmbarazo: updates.fecha_inicio_embarazo || solicitudActual.fecha_inicio_embarazo,
                fechaNacimiento: updates.fecha_nacimiento || solicitudActual.fecha_nacimiento,
                fechaIngresoSolicitud: updates.fecha_ingreso_solicitud || solicitudActual.fecha_ingreso_solicitud,
                sueldoBrutoMensual: parseFloat(updates.sueldo_bruto_mensual || solicitudActual.sueldo_bruto_mensual)
            });
            
            camposActualizar.tramo_asignacion = calculo.tramo;
            camposActualizar.monto_mensual_asignacion = calculo.montoMensual;
            camposActualizar.meses_retroactivos = calculo.mesesRetroactivos;
            camposActualizar.monto_total_retroactivo = calculo.montoTotalRetroactivo;
            camposActualizar.meses_futuros = calculo.mesesFuturos;
            camposActualizar.monto_total_futuro = calculo.montoTotalFuturo;
            camposActualizar.monto_total_pagable = calculo.montoTotalPagable;
            camposActualizar.desglose_mensual = calculo.desgloseMensual;
        }

        if (Object.keys(camposActualizar).length === 0) {
            return res.status(400).json({ success: false, error: 'No hay campos para actualizar' });
        }

        await docRef.update(camposActualizar);

        const docActualizado = await docRef.get();

        res.json({ success: true, message: 'Solicitud actualizada', data: {id: docActualizado.id, ...docActualizado.data()} });

    } catch (error) {
        console.error('Error al actualizar solicitud:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});

/**
 * DELETE /api/solicitudes/:id
 * Eliminar una solicitud
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const docRef = db.collection('Solicitudes_Asignacion_Maternal').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
        }

        if (doc.data().estado_solicitud !== 'Ingresada') {
            return res.status(400).json({ success: false, error: 'Solo se pueden eliminar solicitudes en estado "Ingresada"' });
        }

        await docRef.delete();

        res.json({ success: true, message: 'Solicitud eliminada exitosamente' });

    } catch (error) {
        console.error('Error al eliminar solicitud:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});

// Endpoints para cambiar estado (Aprobar, Rechazar)
router.post('/:id/cambiar-estado', async (req, res) => {
    try {
        const { id } = req.params;
        const { estado, usuario_id, motivo } = req.body;

        if (!['Aprobada', 'Rechazada', 'En Revisión', 'Pagada'].includes(estado)){
            return res.status(400).json({ success: false, error: 'Estado no válido' });
        }

        const docRef = db.collection('Solicitudes_Asignacion_Maternal').doc(id);
        const doc = await docRef.get();
        if (!doc.exists) {
            return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
        }

        const updateData = {
            estado_solicitud: estado,
            usuario_aprobacion: usuario_id || 'sistema'
        };

        if(estado === 'Aprobada') {
            updateData.fecha_aprobacion = FieldValue.serverTimestamp();
        } else if (estado === 'Rechazada') {
            const obsActual = doc.data().observaciones || '';
            updateData.observaciones = `${obsActual} [Rechazada: ${motivo || 's/m'}]`.trim();
        }

        await docRef.update(updateData);

        res.json({ success: true, message: `Solicitud marcada como ${estado}` });

    } catch (error) {
        console.error(`Error al cambiar estado a ${estado}:`, error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});

/**
 * POST /api/solicitudes/calcular-preview
 * No requiere cambios, no interactúa con la BD.
 */
router.post('/calcular-preview', (req, res) => {
    try {
        const { fecha_inicio_embarazo, fecha_nacimiento, fecha_ingreso_solicitud, sueldo_bruto_mensual } = req.body;

        // Validar que el sueldo no sea undefined o null
        if (sueldo_bruto_mensual === undefined || sueldo_bruto_mensual === null) {
             return res.status(400).json({ success: false, error: 'El sueldo bruto es requerido' });
        }

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
