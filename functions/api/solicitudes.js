/**
 * Rutas de Solicitudes de Asignación Maternal - Firebase Functions
 * Ministerio de las Culturas, las Artes y el Patrimonio - Chile
 */

const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const { calcularAsignacionMaternal } = require("../services/calculoAsignacion");
const { validarSolicitud } = require("../utils/validaciones");
const { verificarAuth } = require("../middleware/auth");

const db = admin.firestore();

function normalizeDepartamento(value) {
    if (typeof value !== "string") return value;
    return value.replace(/siclo/ig, "ciclo");
}

/**
 * GET /solicitudes
 * Obtener todas las solicitudes con filtros opcionales
 */
router.get("/", verificarAuth, async (req, res) => {
    try {
        const { estado, departamento, fechaDesde, fechaHasta, tramo, limit } = req.query;

        let query = db.collection("solicitudes");

        // Aplicar filtros
        if (estado) {
            query = query.where("estado_solicitud", "==", estado);
        }

        if (departamento) {
            query = query.where("departamento_unidad", "==", departamento);
        }

        if (tramo) {
            query = query.where("tramo_asignacion", "==", parseInt(tramo));
        }

        // Ordenar por fecha de registro descendente
        query = query.orderBy("fecha_registro", "desc");

        // Aplicar límite si se especifica
        if (limit) {
            query = query.limit(parseInt(limit));
        }

        const snapshot = await query.get();

        const solicitudes = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            // Parsear desglose mensual si existe
            solicitudes.push({
                id_solicitud: doc.id,
                ...data,
                desglose_mensual: data.desglose_mensual || [],
            });
        });

        res.json({
            success: true,
            data: solicitudes,
            total: solicitudes.length,
        });
    } catch (error) {
        console.error("Error al obtener solicitudes:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /solicitudes/estadisticas
 * Obtener estadísticas para el dashboard
 */
router.get("/estadisticas", verificarAuth, async (req, res) => {
    try {
        const stats = {};

        // Obtener todas las solicitudes
        const snapshot = await db.collection("solicitudes").get();

        const solicitudes = [];
        snapshot.forEach((doc) => {
            solicitudes.push({ id: doc.id, ...doc.data() });
        });

        // Total por estado
        const porEstado = {};
        solicitudes.forEach((sol) => {
            const estado = sol.estado_solicitud || "Ingresada";
            if (!porEstado[estado]) {
                porEstado[estado] = { estado_solicitud: estado, cantidad: 0, monto_total: 0 };
            }
            porEstado[estado].cantidad++;
            porEstado[estado].monto_total += sol.monto_total_pagable || 0;
        });
        stats.porEstado = Object.values(porEstado);

        // Totales generales
        stats.totales = {
            total_solicitudes: solicitudes.length,
            monto_total_acumulado: solicitudes.reduce((sum, s) => sum + (s.monto_total_pagable || 0), 0),
            total_retroactivos: solicitudes.reduce((sum, s) => sum + (s.monto_total_retroactivo || 0), 0),
            total_futuros: solicitudes.reduce((sum, s) => sum + (s.monto_total_futuro || 0), 0),
        };

        // Por departamento
        const porDepartamento = {};
        solicitudes.forEach((sol) => {
            const dept = sol.departamento_unidad || "Sin departamento";
            if (!porDepartamento[dept]) {
                porDepartamento[dept] = { departamento_unidad: dept, cantidad: 0, monto_total: 0 };
            }
            porDepartamento[dept].cantidad++;
            porDepartamento[dept].monto_total += sol.monto_total_pagable || 0;
        });
        stats.porDepartamento = Object.values(porDepartamento)
            .sort((a, b) => b.cantidad - a.cantidad)
            .slice(0, 10);

        // Por tramo
        const porTramo = {};
        solicitudes.forEach((sol) => {
            const tramo = sol.tramo_asignacion || 0;
            if (!porTramo[tramo]) {
                porTramo[tramo] = { tramo_asignacion: tramo, cantidad: 0, monto_total: 0 };
            }
            porTramo[tramo].cantidad++;
            porTramo[tramo].monto_total += sol.monto_total_pagable || 0;
        });
        stats.porTramo = Object.values(porTramo);

        // Solicitudes recientes (últimos 30 días)
        const hace30Dias = new Date();
        hace30Dias.setDate(hace30Dias.getDate() - 30);
        stats.solicitudesUltimos30Dias = solicitudes.filter((sol) => {
            const fechaRegistro = sol.fecha_registro?.toDate ? sol.fecha_registro.toDate() : new Date(sol.fecha_registro);
            return fechaRegistro >= hace30Dias;
        }).length;

        res.json({ success: true, data: stats });
    } catch (error) {
        console.error("Error al obtener estadísticas:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /solicitudes/:id
 * Obtener una solicitud por ID
 */
router.get("/:id", verificarAuth, async (req, res) => {
    try {
        const doc = await db.collection("solicitudes").doc(req.params.id).get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, error: "Solicitud no encontrada" });
        }

        const solicitud = {
            id_solicitud: doc.id,
            ...doc.data(),
        };

        res.json({ success: true, data: solicitud });
    } catch (error) {
        console.error("Error al obtener solicitud:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /solicitudes
 * Crear una nueva solicitud
 */
router.post("/", verificarAuth, async (req, res) => {
    try {
        const solicitud = req.body;

        // Normalizar departamento
        if (solicitud && solicitud.departamento_unidad !== undefined) {
            solicitud.departamento_unidad = normalizeDepartamento(solicitud.departamento_unidad);
        }

        // Validar campos
        const validacion = validarSolicitud(solicitud);
        if (!validacion.valido) {
            return res.status(400).json({
                success: false,
                error: "Errores de validación",
                errores: validacion.errores,
            });
        }

        // Usar RUT formateado
        solicitud.rut_funcionaria = validacion.rutFormateado;

        // Calcular asignación
        const calculo = await calcularAsignacionMaternal({
            fechaInicioEmbarazo: solicitud.fecha_inicio_embarazo,
            fechaNacimiento: solicitud.fecha_nacimiento || null,
            fechaIngresoSolicitud: solicitud.fecha_ingreso_solicitud,
            sueldoBrutoMensual: parseFloat(solicitud.sueldo_bruto_mensual),
        }, db);

        // Preparar datos para insertar
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
            meses_futuros: calculo.mesesFuturos || 0,
            monto_total_futuro: calculo.montoTotalFuturo || 0,
            monto_total_pagable: calculo.montoTotalPagable,
            estado_solicitud: "Ingresada",
            observaciones: solicitud.observaciones?.trim() || null,
            usuario_registro: req.user?.uid || "sistema",
            fecha_registro: admin.firestore.FieldValue.serverTimestamp(),
            desglose_mensual: calculo.desgloseMensual,
        };

        const docRef = await db.collection("solicitudes").add(nuevaSolicitud);

        // Registrar en log de auditoría
        await db.collection("logs_auditoria").add({
            usuario_id: req.user?.uid || "sistema",
            accion: "CREAR",
            tabla_afectada: "solicitudes",
            registro_id: docRef.id,
            datos_nuevos: nuevaSolicitud,
            fecha: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.status(201).json({
            success: true,
            message: "Solicitud creada exitosamente",
            data: {
                id_solicitud: docRef.id,
                calculo: calculo,
                alertas: calculo.validacionPlazo?.valido === false ? [calculo.validacionPlazo.mensaje] : [],
            },
        });
    } catch (error) {
        console.error("Error al crear solicitud:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /solicitudes/:id
 * Actualizar una solicitud existente
 */
router.put("/:id", verificarAuth, async (req, res) => {
    try {
        const id = req.params.id;
        const updates = req.body;

        if (updates && updates.departamento_unidad !== undefined) {
            updates.departamento_unidad = normalizeDepartamento(updates.departamento_unidad);
        }

        // Verificar que existe
        const docRef = db.collection("solicitudes").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, error: "Solicitud no encontrada" });
        }

        const solicitudActual = doc.data();

        // Preparar actualizaciones
        const updateData = {};

        const camposPermitidos = [
            "nombre_completo", "departamento_unidad", "correo_electronico", "telefono",
            "fecha_inicio_embarazo", "fecha_nacimiento", "fecha_ingreso_solicitud",
            "sueldo_bruto_mensual", "estado_solicitud", "observaciones", "fecha_aprobacion",
            "fecha_primer_pago", "usuario_aprobacion", "archivo_certificado_compin",
        ];

        camposPermitidos.forEach((campo) => {
            if (updates[campo] !== undefined) {
                updateData[campo] = updates[campo];
            }
        });

        // Si cambia el sueldo o fechas, recalcular
        if (updates.sueldo_bruto_mensual || updates.fecha_inicio_embarazo || updates.fecha_ingreso_solicitud) {
            const calculo = await calcularAsignacionMaternal({
                fechaInicioEmbarazo: updates.fecha_inicio_embarazo || solicitudActual.fecha_inicio_embarazo,
                fechaNacimiento: updates.fecha_nacimiento || solicitudActual.fecha_nacimiento,
                fechaIngresoSolicitud: updates.fecha_ingreso_solicitud || solicitudActual.fecha_ingreso_solicitud,
                sueldoBrutoMensual: parseFloat(updates.sueldo_bruto_mensual || solicitudActual.sueldo_bruto_mensual),
            }, db);

            updateData.tramo_asignacion = calculo.tramo;
            updateData.monto_mensual_asignacion = calculo.montoMensual;
            updateData.meses_retroactivos = calculo.mesesRetroactivos;
            updateData.monto_total_retroactivo = calculo.montoTotalRetroactivo;
            updateData.meses_futuros = calculo.mesesFuturos;
            updateData.monto_total_futuro = calculo.montoTotalFuturo;
            updateData.monto_total_pagable = calculo.montoTotalPagable;
            updateData.desglose_mensual = calculo.desgloseMensual;
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ success: false, error: "No hay campos para actualizar" });
        }

        await docRef.update(updateData);

        // Registrar en log de auditoría
        await db.collection("logs_auditoria").add({
            usuario_id: req.user?.uid || "sistema",
            accion: "ACTUALIZAR",
            tabla_afectada: "solicitudes",
            registro_id: id,
            datos_anteriores: solicitudActual,
            datos_nuevos: updates,
            fecha: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Obtener solicitud actualizada
        const updatedDoc = await docRef.get();
        const solicitudActualizada = {
            id_solicitud: updatedDoc.id,
            ...updatedDoc.data(),
        };

        res.json({
            success: true,
            message: "Solicitud actualizada exitosamente",
            data: solicitudActualizada,
        });
    } catch (error) {
        console.error("Error al actualizar solicitud:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /solicitudes/:id
 * Eliminar una solicitud
 */
router.delete("/:id", verificarAuth, async (req, res) => {
    try {
        const id = req.params.id;

        const docRef = db.collection("solicitudes").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, error: "Solicitud no encontrada" });
        }

        const solicitud = doc.data();

        // Solo permitir eliminar si está en estado "Ingresada"
        if (solicitud.estado_solicitud !== "Ingresada") {
            return res.status(400).json({
                success: false,
                error: "Solo se pueden eliminar solicitudes en estado \"Ingresada\"",
            });
        }

        await docRef.delete();

        // Registrar en log de auditoría
        await db.collection("logs_auditoria").add({
            usuario_id: req.user?.uid || "sistema",
            accion: "ELIMINAR",
            tabla_afectada: "solicitudes",
            registro_id: id,
            datos_anteriores: solicitud,
            fecha: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.json({ success: true, message: "Solicitud eliminada exitosamente" });
    } catch (error) {
        console.error("Error al eliminar solicitud:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /solicitudes/:id/aprobar
 * Aprobar una solicitud
 */
router.post("/:id/aprobar", verificarAuth, async (req, res) => {
    try {
        const id = req.params.id;

        const docRef = db.collection("solicitudes").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, error: "Solicitud no encontrada" });
        }

        await docRef.update({
            estado_solicitud: "Aprobada",
            fecha_aprobacion: admin.firestore.FieldValue.serverTimestamp(),
            usuario_aprobacion: req.user?.uid || "sistema",
        });

        res.json({ success: true, message: "Solicitud aprobada exitosamente" });
    } catch (error) {
        console.error("Error al aprobar solicitud:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /solicitudes/:id/rechazar
 * Rechazar una solicitud
 */
router.post("/:id/rechazar", verificarAuth, async (req, res) => {
    try {
        const id = req.params.id;
        const { motivo } = req.body;

        const docRef = db.collection("solicitudes").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, error: "Solicitud no encontrada" });
        }

        const solicitudActual = doc.data();
        const observacionesActuales = solicitudActual.observaciones || "";

        await docRef.update({
            estado_solicitud: "Rechazada",
            observaciones: observacionesActuales + " - Rechazada: " + (motivo || "Sin motivo especificado"),
            usuario_aprobacion: req.user?.uid || "sistema",
        });

        res.json({ success: true, message: "Solicitud rechazada" });
    } catch (error) {
        console.error("Error al rechazar solicitud:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /solicitudes/calcular-preview
 * Calcular preview sin guardar
 */
router.post("/calcular-preview", async (req, res) => {
    try {
        const { fecha_inicio_embarazo, fecha_nacimiento, fecha_ingreso_solicitud, sueldo_bruto_mensual } = req.body;

        const calculo = await calcularAsignacionMaternal({
            fechaInicioEmbarazo: fecha_inicio_embarazo,
            fechaNacimiento: fecha_nacimiento || null,
            fechaIngresoSolicitud: fecha_ingreso_solicitud,
            sueldoBrutoMensual: parseFloat(sueldo_bruto_mensual),
        }, db);

        res.json({ success: true, data: calculo });
    } catch (error) {
        console.error("Error al calcular preview:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
