/**
 * Rutas de Usuarios - Versión 100% Firebase
 * Ministerio de las Culturas, las Artes y el Patrimonio - Chile
 */

const express = require('express');
const router = express.Router();
const { db, admin } = require('../database'); // Importar Firestore y Firebase Admin SDK

// ====================================================================
// MIDDLEWARE DE AUTENTICACIÓN (EL "GUARDIA")
// ====================================================================

/**
 * Middleware para verificar el token de ID de Firebase enviado en el header Authorization.
 * Si el token es válido, extrae la información del usuario (UID) y la añade a la petición.
 * Si no, rechaza la petición.
 */
const verifyFirebaseToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(403).json({ success: false, error: 'Acceso denegado. No se proporcionó token.' });
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
        // Verificar el token usando el SDK de Firebase Admin
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken; // Añade la información del usuario decodificada (incluye uid, email) a la petición
        next(); // El token es válido, continuar al siguiente manejador de ruta
    } catch (error) {
        console.error('Error al verificar el token de Firebase:', error);
        return res.status(403).json({ success: false, error: 'Token inválido o expirado.' });
    }
};

// ====================================================================
// RUTAS PROTEGIDAS
// ====================================================================

/**
 * GET /api/usuarios/me
 * 
 * Endpoint protegido que devuelve el perfil del usuario actualmente autenticado.
 * Utiliza el UID que el middleware `verifyFirebaseToken` extrajo del token.
 */
router.get('/me', verifyFirebaseToken, async (req, res) => {
    try {
        const uid = req.user.uid; // UID obtenido desde el token verificado

        // Buscar en la colección 'Usuarios' un documento que tenga el campo 'firebase_uid' correspondiente.
        const usuariosRef = db.collection('Usuarios');
        const snapshot = await usuariosRef.where('firebase_uid', '==', uid).limit(1).get();

        if (snapshot.empty) {
            // Esto ocurre si un usuario existe en Firebase Authentication pero no tiene un perfil en nuestra base de datos.
            return res.status(404).json({ success: false, error: 'Perfil de usuario no encontrado en la base de datos.' });
        }

        const usuarioDoc = snapshot.docs[0];
        const usuarioData = usuarioDoc.data();

        // Devolver los datos del perfil del usuario
        res.json({
            success: true,
            data: {
                id: usuarioDoc.id, // ID del documento en Firestore
                uid: uid,
                nombre_completo: usuarioData.nombre_completo,
                email: usuarioData.email,
                rol: usuarioData.rol, // ¡El rol que necesitamos en el frontend!
                departamento: usuarioData.departamento
            }
        });

    } catch (error) {
        console.error('Error al obtener el perfil del usuario:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor al buscar el perfil.' });
    }
});

// Nota: Las rutas para crear, actualizar o listar usuarios se podrían proteger con el mismo middleware,
// añadiendo una comprobación de rol. Por ejemplo: if (req.user.rol !== 'Administrador') return res.status(403).send();

module.exports = router;
