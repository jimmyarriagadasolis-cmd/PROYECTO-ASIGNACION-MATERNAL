/**
 * Middleware de Autenticación para Firebase
 * Ministerio de las Culturas, las Artes y el Patrimonio - Chile
 */

const admin = require("firebase-admin");

/**
 * Verifica el token de Firebase Authentication
 */
async function verificarAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                error: "No autorizado - Token no proporcionado",
            });
        }

        const token = authHeader.split("Bearer ")[1];

        try {
            const decodedToken = await admin.auth().verifyIdToken(token);
            req.user = decodedToken;
            next();
        } catch (error) {
            console.error("Error al verificar token:", error);
            return res.status(401).json({
                success: false,
                error: "Token inválido o expirado",
            });
        }
    } catch (error) {
        console.error("Error en middleware de autenticación:", error);
        return res.status(500).json({
            success: false,
            error: "Error interno del servidor",
        });
    }
}

/**
 * Verifica que el usuario tenga un rol específico
 */
function verificarRol(...rolesPermitidos) {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.uid) {
                return res.status(401).json({
                    success: false,
                    error: "Usuario no autenticado",
                });
            }

            // Obtener datos del usuario desde Firestore
            const db = admin.firestore();
            const userDoc = await db.collection("usuarios").doc(req.user.uid).get();

            if (!userDoc.exists) {
                return res.status(403).json({
                    success: false,
                    error: "Usuario no encontrado en el sistema",
                });
            }

            const userData = userDoc.data();
            const rol = userData.rol || req.user.rol;

            if (!rolesPermitidos.includes(rol)) {
                return res.status(403).json({
                    success: false,
                    error: `Permisos insuficientes. Se requiere uno de: ${rolesPermitidos.join(", ")}`,
                });
            }

            req.userRole = rol;
            req.userData = userData;
            next();
        } catch (error) {
            console.error("Error al verificar rol:", error);
            return res.status(500).json({
                success: false,
                error: "Error al verificar permisos",
            });
        }
    };
}

/**
 * Middleware opcional - no falla si no hay auth
 */
async function verificarAuthOpcional(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        req.user = null;
        return next();
    }

    const token = authHeader.split("Bearer ")[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
    } catch (error) {
        req.user = null;
    }

    next();
}

module.exports = {
    verificarAuth,
    verificarRol,
    verificarAuthOpcional,
};
