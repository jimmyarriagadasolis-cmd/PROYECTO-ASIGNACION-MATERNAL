/**
 * Cloud Functions para Sistema de Asignación Maternal
 * Ministerio de las Culturas, las Artes y el Patrimonio - Chile
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");

// Inicializar Firebase Admin
admin.initializeApp();

// Crear app Express
const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Importar rutas
const solicitudesRoutes = require("./api/solicitudes");
const usuariosRoutes = require("./api/usuarios");
const reportesRoutes = require("./api/reportes");
const configRoutes = require("./api/config");

// Usar rutas
app.use("/solicitudes", solicitudesRoutes);
app.use("/usuarios", usuariosRoutes);
app.use("/reportes", reportesRoutes);
app.use("/config", configRoutes);

// Ruta de health check
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "API de Asignación Maternal - Funcionando correctamente",
        timestamp: new Date().toISOString(),
    });
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error("Error:", err);
    res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        message: err.message,
    });
});

// Exportar la función HTTP
exports.api = functions.https.onRequest(app);

// Función para inicializar datos por defecto
exports.initializeDefaultData = functions.https.onCall(async (data, context) => {
    // Solo admin puede ejecutar esto
    if (!context.auth || !context.auth.token.admin) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Solo administradores pueden inicializar datos",
        );
    }

    const db = admin.firestore();

    try {
        // Crear configuración inicial
        const configRef = db.collection("configuracion");

        const configInicial = {
            tramo1_limite: 631976,
            tramo1_monto: 22007,
            tramo2_limite: 923067,
            tramo2_monto: 13505,
            tramo3_limite: 1439668,
            tramo3_monto: 4267,
            plazo_maximo_años: 5,
            meses_max_embarazo: 9,
            nombre_institucion: "Ministerio de las Culturas, las Artes y el Patrimonio",
            correo_notificaciones: "",
            smtp_host: "",
            smtp_port: 587,
            smtp_user: "",
            smtp_pass: "",
        };

        for (const [key, value] of Object.entries(configInicial)) {
            await configRef.doc(key).set({
                valor: value,
                fecha_actualizacion: admin.firestore.FieldValue.serverTimestamp(),
            });
        }

        return { success: true, message: "Configuración inicial creada" };
    } catch (error) {
        console.error("Error al inicializar datos:", error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});
