/**
 * Rutas de Usuarios - Firebase App Hosting (Firestore + Firebase Auth)
 * Ministerio de las Culturas, las Artes y el Patrimonio - Chile
 */

const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { verificarAuth, verificarRol } = require('../middleware/auth');

const db = admin.firestore();

/**
 * POST /usuarios/login
 * Obtener datos del usuario después de autenticación con Firebase Auth
 */
router.post('/login', async (req, res) => {
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

        // Buscar usuario en Firestore
        const userDoc = await db.collection('usuarios').doc(decodedToken.uid).get();

        if (!userDoc.exists) {
            return res.status(404).json({
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

        // Registrar login en auditoría
        await db.collection('logs_auditoria').add({
            usuario_id: decodedToken.uid,
            accion: 'login',
            detalle: `Login de ${userData.username || userData.email}`,
            fecha: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({
            success: true,
            data: {
                usuario: {
                    id: decodedToken.uid,
                    username: userData.username,
                    nombre_completo: userData.nombre_completo,
                    email: decodedToken.email,
                    rol: userData.rol,
                    departamento: userData.departamento,
                    activo: userData.activo
                }
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /usuarios
 * Obtener todos los usuarios
 */
router.get('/', verificarAuth, verificarRol('administrador', 'admin'), async (req, res) => {
    try {
        const snapshot = await db.collection('usuarios').orderBy('nombre_completo').get();
        const usuarios = [];

        for (const doc of snapshot.docs) {
            const data = doc.data();
            usuarios.push({
                id: doc.id,
                username: data.username,
                nombre_completo: data.nombre_completo,
                email: data.email,
                rol: data.rol,
                departamento: data.departamento,
                activo: data.activo,
                fecha_creacion: data.fecha_creacion
            });
        }

        res.json({ success: true, data: usuarios });
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /usuarios
 * Crear nuevo usuario (en Firebase Auth + Firestore)
 */
router.post('/', verificarAuth, verificarRol('administrador', 'admin'), async (req, res) => {
    try {
        const { username, password, nombre_completo, email, rol, departamento } = req.body;

        if (!email || !password || !nombre_completo) {
            return res.status(400).json({
                success: false,
                error: 'Email, contraseña y nombre completo son requeridos'
            });
        }

        // Crear usuario en Firebase Auth
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
            displayName: nombre_completo
        });

        // Crear documento en Firestore
        await db.collection('usuarios').doc(userRecord.uid).set({
            username: username || email.split('@')[0],
            nombre_completo: nombre_completo,
            email: email,
            rol: rol || 'lectura',
            departamento: departamento || '',
            activo: true,
            fecha_creacion: admin.firestore.FieldValue.serverTimestamp()
        });

        // Log de auditoría
        await db.collection('logs_auditoria').add({
            usuario_id: req.user.uid,
            accion: 'crear_usuario',
            detalle: `Usuario creado: ${nombre_completo} (${email})`,
            fecha: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({
            success: true,
            message: 'Usuario creado exitosamente',
            data: { id: userRecord.uid }
        });
    } catch (error) {
        console.error('Error al crear usuario:', error);

        if (error.code === 'auth/email-already-exists') {
            return res.status(400).json({
                success: false,
                error: 'El email ya está registrado'
            });
        }

        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /usuarios/:id
 * Actualizar usuario
 */
router.put('/:id', verificarAuth, verificarRol('administrador', 'admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre_completo, rol, departamento, password } = req.body;

        const userDoc = await db.collection('usuarios').doc(id).get();
        if (!userDoc.exists) {
            return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
        }

        // Actualizar en Firebase Auth si hay cambios
        const authUpdate = {};
        if (nombre_completo) authUpdate.displayName = nombre_completo;
        if (password) authUpdate.password = password;

        if (Object.keys(authUpdate).length > 0) {
            await admin.auth().updateUser(id, authUpdate);
        }

        // Actualizar en Firestore
        const firestoreUpdate = {};
        if (nombre_completo) firestoreUpdate.nombre_completo = nombre_completo;
        if (rol) firestoreUpdate.rol = rol;
        if (departamento !== undefined) firestoreUpdate.departamento = departamento;
        firestoreUpdate.fecha_actualizacion = admin.firestore.FieldValue.serverTimestamp();

        await db.collection('usuarios').doc(id).update(firestoreUpdate);

        res.json({ success: true, message: 'Usuario actualizado exitosamente' });
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /usuarios/:id
 * Desactivar usuario (soft delete)
 */
router.delete('/:id', verificarAuth, verificarRol('administrador', 'admin'), async (req, res) => {
    try {
        const { id } = req.params;

        await db.collection('usuarios').doc(id).update({
            activo: false,
            fecha_actualizacion: admin.firestore.FieldValue.serverTimestamp()
        });

        // Deshabilitar en Firebase Auth
        await admin.auth().updateUser(id, { disabled: true });

        res.json({ success: true, message: 'Usuario desactivado exitosamente' });
    } catch (error) {
        console.error('Error al desactivar usuario:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
