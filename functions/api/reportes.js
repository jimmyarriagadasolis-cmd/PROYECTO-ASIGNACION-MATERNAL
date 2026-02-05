/**
 * Rutas de Reportes - Firebase Functions
 * Ministerio de las Culturas, las Artes y el Patrimonio - Chile
 * 
 * NOTA: Generación de PDF y Excel pendiente de implementación.
 * Envío de correos pendiente hasta configuración del servicio.
 */

const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const { verificarAuth } = require("../middleware/auth");

const db = admin.firestore();

/**
 * GET /reportes/ficha/:id
 * Generar ficha individual en PDF
 * TODO: Implementar generación de PDF
 */
router.get("/ficha/:id", verificarAuth, async (req, res) => {
    try {
        const id = req.params.id;

        const doc = await db.collection("solicitudes").doc(id).get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, error: "Solicitud no encontrada" });
        }

        // TODO: Generar PDF
        res.json({
            success: false,
            message: "Generación de PDF pendiente de implementación",
            nota: "Esta funcionalidad estará disponible en la siguiente fase",
        });
    } catch (error) {
        console.error("Error al generar ficha:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /reportes/consolidado
 * Generar reporte consolidado en Excel
 * TODO: Implementar generación de Excel
 */
router.get("/consolidado", verificarAuth, async (req, res) => {
    try {
        // TODO: Generar Excel
        res.json({
            success: false,
            message: "Generación de Excel pendiente de implementación",
            nota: "Esta funcionalidad estará disponible en la siguiente fase",
        });
    } catch (error) {
        console.error("Error al generar consolidado:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /reportes/ficha/:id/enviar
 * Enviar ficha por correo
 * TODO: Implementar envío de correo
 */
router.post("/ficha/:id/enviar", verificarAuth, async (req, res) => {
    try {
        res.json({
            success: false,
            message: "Envío de correos pendiente de configuración",
            nota: "Configure primero el servicio de correo (SendGrid/Mailgun)",
        });
    } catch (error) {
        console.error("Error al enviar ficha:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /reportes/consolidado/enviar
 * Enviar reporte consolidado por correo
 * TODO: Implementar envío de correo
 */
router.post("/consolidado/enviar", verificarAuth, async (req, res) => {
    try {
        res.json({
            success: false,
            message: "Envío de correos pendiente de configuración",
            nota: "Configure primero el servicio de correo (SendGrid/Mailgun)",
        });
    } catch (error) {
        console.error("Error al enviar consolidado:", error);
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
        const smtpHostDoc = await db.collection("configuracion").doc("smtp_host").get();
        const smtpPortDoc = await db.collection("configuracion").doc("smtp_port").get();

        const configurado = smtpHostDoc.exists && smtpHostDoc.data().valor !== "";

        res.json({
            success: true,
            data: {
                configurado: configurado,
                host: smtpHostDoc.exists ? smtpHostDoc.data().valor : "",
                port: smtpPortDoc.exists ? smtpPortDoc.data().valor : 587,
            },
        });
    } catch (error) {
        console.error("Error al verificar configuración SMTP:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
