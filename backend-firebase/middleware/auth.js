/**
 * Middleware de Autenticación - Firebase App Hosting
 * Verifica Firebase ID tokens y roles de usuario desde Firestore
 */

const admin = require('firebase-admin');

/**
 * Verifica que el request tenga un token Firebase válido
 */
async function verificarAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Token de autenticación requerido'
            });
        }

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);

        // Obtener datos del usuario desde Firestore
        const userDoc = await admin.firestore()
            .collection('usuarios')
            .doc(decodedToken.uid)
            .get();

        if (!userDoc.exists) {
            return res.status(403).json({
                success: false,
                error: 'Usuario no registrado en el sistema'
            });
        }

        const userData = userDoc.data();

        if (!userData.activo) {
            return res.status(403).json({
                success: false,
                error: 'Usuario desactivado'
            });
        }

        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            ...userData
        };

        next();
    } catch (error) {
        console.error('Error de autenticación:', error.message);

        if (error.code === 'auth/id-token-expired') {
            return res.status(401).json({
                success: false,
                error: 'Token expirado, inicie sesión nuevamente'
            });
        }

        return res.status(401).json({
            success: false,
            error: 'Token inválido'
        });
    }
}

/**
 * Verifica que el usuario tenga uno de los roles permitidos
 */
function verificarRol(...rolesPermitidos) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Autenticación requerida'
            });
        }

        if (!rolesPermitidos.includes(req.user.rol)) {
            return res.status(403).json({
                success: false,
                error: 'No tiene permisos para esta acción'
            });
        }

        next();
    };
}

/**
 * Auth opcional - no falla si no hay token
 */
async function verificarAuthOpcional(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const idToken = authHeader.split('Bearer ')[1];
            const decodedToken = await admin.auth().verifyIdToken(idToken);

            const userDoc = await admin.firestore()
                .collection('usuarios')
                .doc(decodedToken.uid)
                .get();

            if (userDoc.exists) {
                req.user = {
                    uid: decodedToken.uid,
                    email: decodedToken.email,
                    ...userDoc.data()
                };
            }
        }
    } catch (error) {
        // Silenciar errores en auth opcional
    }

    next();
}

module.exports = {
    verificarAuth,
    verificarRol,
    verificarAuthOpcional
};
