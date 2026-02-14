/**
 * Rutas de Usuarios - Versión 100% Firebase y Estandarizada
 * Ministerio de las Culturas, las Artes y el Patrimonio - Chile
 */

// Forzando re-despliegue final: 14-feb-2026 05:35

const express = require('express');
const router = express.Router();
const { db, admin } = require('../database'); // Importar Firestore y Firebase Admin SDK

// Middleware para verificar el token de ID de Firebase
const verifyFirebaseToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(403).json({ success: false, error: 'Acceso denegado. No se proporcionó token.' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error('Error al verificar el token de Firebase:', error);
        return res.status(403).json({ success: false, error: 'Token inválido o expirado.' });
    }
};

/**
 * GET /api/usuarios/me
 * Endpoint protegido que devuelve el perfil del usuario autenticado.
 */
router.get('/me', verifyFirebaseToken, async (req, res) => {
    try {
        const uid = req.user.uid;

        const usuariosRef = db.collection('usuarios');
        const snapshot = await usuariosRef.where('firebase_uid', '==', uid).limit(1).get();

        if (snapshot.empty) {
            return res.status(404).json({ success: false, error: 'Perfil de usuario no encontrado en la base de datos.' });
        }

        const usuarioDoc = snapshot.docs[0];
        const usuarioData = usuarioDoc.data();

        res.json({
            success: true,
            data: {
                id: usuarioDoc.id,
                uid: uid,
                nombre_completo: usuarioData.nombre_completo,
                email: usuarioData.email,
                rol: usuarioData.rol,
                departamento: usuarioData.departamento
            }
        });

    } catch (error) {
        console.error('Error al obtener el perfil del usuario:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor al buscar el perfil.' });
    }
});

module.exports = router;
