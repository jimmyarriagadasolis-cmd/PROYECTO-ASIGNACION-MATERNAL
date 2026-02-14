/**
 * Rutas de Reportes - Firebase Functions
 * Ministerio de las Culturas, las Artes y el Patrimonio - Chile
 */

const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const path = require("path");
const os = require("os");
const fs = require("fs");
const { verificarAuth } = require("../middleware/auth");
const { generarFichaIndividualPDF } = require("../services/pdfGenerator");
const { generarInformeConsolidadoExcel } = require("../services/excelGenerator");
const { enviarFichaIndividual, enviarReporteConsolidado, verificarConfiguracionSMTP } = require("../services/emailService");

const db = admin.firestore();

/**
 * GET /reportes/ficha/:id
 * Generar y descargar ficha individual en PDF
 */
router.get("/ficha/:id", verificarAuth, async (req, res) => {
    try {
        const id = req.params.id;
        const doc = await db.collection("solicitudes").doc(id).get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, error: "Solicitud no encontrada" });
        }

        const solicitud = { id_solicitud: doc.id, ...doc.data() };
        const filename = `Ficha_${solicitud.rut_funcionaria.replace(/\./g, "")}_${Date.now()}.pdf`;
        const outputPath = path.join(os.tmpdir(), filename);

        await generarFichaIndividualPDF(solicitud, outputPath);

        res.download(outputPath, filename, (err) => {
            if (err) console.error("Error al descargar:", err);
            // Limpiar archivo temporal
            try { fs.unlinkSync(outputPath); } catch (e) { /* ignore */ }
        });
    } catch (error) {
        console.error("Error al generar ficha PDF:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /reportes/ficha/:id/enviar
 * Enviar ficha por correo
 */
router.post("/ficha/:id/enviar", verificarAuth, async (req, res) => {
    try {
        const id = req.params.id;
        const { destinatarios } = req.body;

        const doc = await db.collection("solicitudes").doc(id).get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, error: "Solicitud no encontrada" });
        }

        const solicitud = { id_solicitud: doc.id, ...doc.data() };

        // Generar PDF
        const filename = `Ficha_${solicitud.rut_funcionaria.replace(/\./g, "")}_${Date.now()}.pdf`;
        const outputPath = path.join(os.tmpdir(), filename);
        await generarFichaIndividualPDF(solicitud, outputPath);

        // Destinatarios por defecto: funcionaria
        const emails = destinatarios || [solicitud.correo_electronico];
        const resultado = await enviarFichaIndividual(solicitud, outputPath, emails);

        // Limpiar archivo temporal
        try { fs.unlinkSync(outputPath); } catch (e) { /* ignore */ }

        res.json(resultado);
    } catch (error) {
        console.error("Error al enviar ficha:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /reportes/consolidado
 * Generar y descargar informe consolidado en Excel
 */
router.get("/consolidado", verificarAuth, async (req, res) => {
    try {
        const { estado, departamento, fechaDesde, fechaHasta, busqueda } = req.query;

        let query = db.collection("solicitudes");

        if (estado) {
            query = query.where("estado_solicitud", "==", estado);
        }
        if (departamento) {
            query = query.where("departamento_unidad", "==", departamento);
        }

        query = query.orderBy("fecha_registro", "desc");

        const snapshot = await query.get();
        let solicitudes = [];
        snapshot.forEach((doc) => {
            solicitudes.push({ id_solicitud: doc.id, ...doc.data() });
        });

        // Filtros adicionales en memoria (búsqueda y fechas)
        if (busqueda) {
            const b = busqueda.toLowerCase();
            solicitudes = solicitudes.filter((s) =>
                (s.nombre_completo || "").toLowerCase().includes(b) ||
                (s.rut_funcionaria || "").toLowerCase().includes(b),
            );
        }

        const filename = `Informe_Consolidado_${new Date().toISOString().split("T")[0]}.xlsx`;
        const outputPath = path.join(os.tmpdir(), filename);

        await generarInformeConsolidadoExcel(solicitudes, { estado, departamento, fechaDesde, fechaHasta }, outputPath);

        res.download(outputPath, filename, (err) => {
            if (err) console.error("Error al descargar:", err);
            try { fs.unlinkSync(outputPath); } catch (e) { /* ignore */ }
        });
    } catch (error) {
        console.error("Error al generar informe consolidado:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /reportes/consolidado/enviar
 * Enviar informe consolidado a jefatura
 */
router.post("/consolidado/enviar", verificarAuth, async (req, res) => {
    try {
        const { destinatarios, filtros = {} } = req.body;

        if (!destinatarios || destinatarios.length === 0) {
            return res.status(400).json({ success: false, error: "Se requieren destinatarios" });
        }

        // Obtener solicitudes
        const snapshot = await db.collection("solicitudes").orderBy("fecha_registro", "desc").get();
        const solicitudes = [];
        snapshot.forEach((doc) => {
            solicitudes.push({ id_solicitud: doc.id, ...doc.data() });
        });

        // Generar Excel
        const filename = `Informe_Consolidado_${new Date().toISOString().split("T")[0]}.xlsx`;
        const outputPath = path.join(os.tmpdir(), filename);
        await generarInformeConsolidadoExcel(solicitudes, filtros, outputPath);

        // Calcular resumen
        const resumen = {
            totalSolicitudes: solicitudes.length,
            aprobadas: solicitudes.filter((s) => s.estado_solicitud === "Aprobada").length,
            pendientes: solicitudes.filter((s) => s.estado_solicitud === "Ingresada" || s.estado_solicitud === "En Revisión").length,
            montoTotal: solicitudes.reduce((sum, s) => sum + (s.monto_total_pagable || 0), 0),
        };

        const resultado = await enviarReporteConsolidado(outputPath, destinatarios, resumen);

        // Limpiar archivo temporal
        try { fs.unlinkSync(outputPath); } catch (e) { /* ignore */ }

        res.json(resultado);
    } catch (error) {
        console.error("Error al enviar informe consolidado:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /reportes/historial-correos
 * Obtener historial de correos enviados
 */
router.get("/historial-correos", verificarAuth, async (req, res) => {
    try {
        const snapshot = await db.collection("historial_correos")
            .orderBy("fecha_envio", "desc")
            .limit(50)
            .get();

        const correos = [];
        snapshot.forEach((doc) => {
            correos.push({
                id: doc.id,
                ...doc.data(),
            });
        });

        res.json({ success: true, data: correos });
    } catch (error) {
        console.error("Error al obtener historial:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /reportes/config-smtp
 * Verificar configuración SMTP
 */
router.get("/config-smtp", verificarAuth, async (req, res) => {
    try {
        const config = await verificarConfiguracionSMTP();
        res.json({ success: true, data: config });
    } catch (error) {
        console.error("Error al verificar configuración SMTP:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
