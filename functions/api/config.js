/**
 * Rutas de Configuración - Firebase Functions
 * Ministerio de las Culturas, las Artes y el Patrimonio - Chile
 */

const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const { verificarAuth, verificarRol } = require("../middleware/auth");

const db = admin.firestore();

/**
 * GET /config/tramos
 * Obtener configuración de tramos
 */
router.get("/tramos", verificarAuth, async (req, res) => {
    try {
        const tramosIds = [
            "tramo1_limite", "tramo1_monto",
            "tramo2_limite", "tramo2_monto",
            "tramo3_limite", "tramo3_monto",
        ];

        const configDocs = await Promise.all(
            tramosIds.map((id) => db.collection("configuracion").doc(id).get()),
        );

        const config = {};
        configDocs.forEach((doc, index) => {
            if (doc.exists) {
                config[tramosIds[index]] = parseFloat(doc.data().valor);
            }
        });

        const tramos = {
            tramo1: {
                limite: config.tramo1_limite || 631976,
                monto: config.tramo1_monto || 22007,
            },
            tramo2: {
                limite: config.tramo2_limite || 923067,
                monto: config.tramo2_monto || 13505,
            },
            tramo3: {
                limite: config.tramo3_limite || 1439668,
                monto: config.tramo3_monto || 4267,
            },
        };

        res.json({ success: true, data: tramos });
    } catch (error) {
        console.error("Error al obtener tramos:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /config/tramos/actualizar
 * Actualizar configuración de tramos (solo admin)
 */
router.put("/tramos/actualizar", verificarAuth, verificarRol("administrador"), async (req, res) => {
    try {
        const { tramo1, tramo2, tramo3 } = req.body;

        const updates = [];

        if (tramo1) {
            if (tramo1.limite) {
                updates.push(
                    db.collection("configuracion").doc("tramo1_limite").set({
                        valor: tramo1.limite,
                        fecha_actualizacion: admin.firestore.FieldValue.serverTimestamp(),
                    }),
                );
            }
            if (tramo1.monto) {
                updates.push(
                    db.collection("configuracion").doc("tramo1_monto").set({
                        valor: tramo1.monto,
                        fecha_actualizacion: admin.firestore.FieldValue.serverTimestamp(),
                    }),
                );
            }
        }

        if (tramo2) {
            if (tramo2.limite) {
                updates.push(
                    db.collection("configuracion").doc("tramo2_limite").set({
                        valor: tramo2.limite,
                        fecha_actualizacion: admin.firestore.FieldValue.serverTimestamp(),
                    }),
                );
            }
            if (tramo2.monto) {
                updates.push(
                    db.collection("configuracion").doc("tramo2_monto").set({
                        valor: tramo2.monto,
                        fecha_actualizacion: admin.firestore.FieldValue.serverTimestamp(),
                    }),
                );
            }
        }

        if (tramo3) {
            if (tramo3.limite) {
                updates.push(
                    db.collection("configuracion").doc("tramo3_limite").set({
                        valor: tramo3.limite,
                        fecha_actualizacion: admin.firestore.FieldValue.serverTimestamp(),
                    }),
                );
            }
            if (tramo3.monto) {
                updates.push(
                    db.collection("configuracion").doc("tramo3_monto").set({
                        valor: tramo3.monto,
                        fecha_actualizacion: admin.firestore.FieldValue.serverTimestamp(),
                    }),
                );
            }
        }

        await Promise.all(updates);

        res.json({ success: true, message: "Tramos actualizados exitosamente" });
    } catch (error) {
        console.error("Error al actualizar tramos:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /config/departamentos
 * Obtener lista de departamentos únicos
 */
router.get("/departamentos", verificarAuth, async (req, res) => {
    try {
        const snapshot = await db.collection("solicitudes").get();

        const departamentos = new Set();
        snapshot.forEach((doc) => {
            const dept = doc.data().departamento_unidad;
            if (dept) departamentos.add(dept);
        });

        res.json({ success: true, data: Array.from(departamentos).sort() });
    } catch (error) {
        console.error("Error al obtener departamentos:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /config/smtp
 * Obtener configuración SMTP (solo admin)
 */
router.get("/smtp", verificarAuth, verificarRol("administrador"), async (req, res) => {
    try {
        const configIds = ["smtp_host", "smtp_port", "smtp_user", "correo_notificaciones"];

        const configDocs = await Promise.all(
            configIds.map((id) => db.collection("configuracion").doc(id).get()),
        );

        const config = {};
        configDocs.forEach((doc, index) => {
            if (doc.exists) {
                config[configIds[index]] = doc.data().valor;
            }
        });

        res.json({ success: true, data: config });
    } catch (error) {
        console.error("Error al obtener configuración SMTP:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /config/smtp
 * Actualizar configuración SMTP (solo admin)
 */
router.put("/smtp", verificarAuth, verificarRol("administrador"), async (req, res) => {
    try {
        const { smtp_host, smtp_port, smtp_user, smtp_pass, correo_notificaciones } = req.body;

        const updates = [];

        if (smtp_host !== undefined) {
            updates.push(
                db.collection("configuracion").doc("smtp_host").set({
                    valor: smtp_host,
                    fecha_actualizacion: admin.firestore.FieldValue.serverTimestamp(),
                }),
            );
        }

        if (smtp_port !== undefined) {
            updates.push(
                db.collection("configuracion").doc("smtp_port").set({
                    valor: smtp_port,
                    fecha_actualizacion: admin.firestore.FieldValue.serverTimestamp(),
                }),
            );
        }

        if (smtp_user !== undefined) {
            updates.push(
                db.collection("configuracion").doc("smtp_user").set({
                    valor: smtp_user,
                    fecha_actualizacion: admin.firestore.FieldValue.serverTimestamp(),
                }),
            );
        }

        if (smtp_pass !== undefined) {
            updates.push(
                db.collection("configuracion").doc("smtp_pass").set({
                    valor: smtp_pass,
                    fecha_actualizacion: admin.firestore.FieldValue.serverTimestamp(),
                }),
            );
        }

        if (correo_notificaciones !== undefined) {
            updates.push(
                db.collection("configuracion").doc("correo_notificaciones").set({
                    valor: correo_notificaciones,
                    fecha_actualizacion: admin.firestore.FieldValue.serverTimestamp(),
                }),
            );
        }

        await Promise.all(updates);

        res.json({ success: true, message: "Configuración SMTP actualizada" });
    } catch (error) {
        console.error("Error al actualizar SMTP:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
