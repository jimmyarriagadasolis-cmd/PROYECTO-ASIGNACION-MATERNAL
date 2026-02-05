/**
 * Rutas de Usuarios - Firebase Functions
 * Ministerio de las Culturas, las Artes y el Patrimonio - Chile
 */

const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const { verificarAuth, verificarRol } = require("../middleware/auth");

const db = admin.firestore();

/**
 * POST /usuarios/login
 * Autenticación de usuario con Firebase Auth
 * Nota: El login real se hace en el cliente con Firebase Auth SDK
 * Esta ruta es para obtener datos adicionales del usuario
 */
router.post("/login", async (req, res) => {
    try {
        const { uid } = req.body;

        if (!uid) {
            return res.status(400).json({ success: false, error: "UID requerido" });
        }

        // Obtener datos del usuario desde Firestore
        const userDoc = await db.collection("usuarios").doc(uid).get();

        if (!userDoc.exists) {
            return res.status(404).json({
                success: false,
                error: "Usuario no encontrado en el sistema",
            });
        }

        const userData = userDoc.data();

        // Actualizar último acceso
        await db.collection("usuarios").doc(uid).update({
            ultimo_acceso: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Registrar en log
        await db.collection("logs_auditoria").add({
            usuario_id: uid,
            accion: "LOGIN",
            tabla_afectada: "usuarios",
            fecha: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.json({
            success: true,
            data: {
                usuario: {
                    id: uid,
                    username: userData.username,
                    nombre_completo: userData.nombre_completo,
                    email: userData.email,
                    rol: userData.rol,
                    departamento: userData.departamento,
                },
            },
        });
    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /usuarios
 * Obtener todos los usuarios (solo admin)
 */
router.get("/", verificarAuth, verificarRol("administrador"), async (req, res) => {
    try {
        const snapshot = await db.collection("usuarios").orderBy("nombre_completo").get();

        const usuarios = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            usuarios.push({
                id: doc.id,
                username: data.username,
                nombre_completo: data.nombre_completo,
                email: data.email,
                rol: data.rol,
                departamento: data.departamento,
                activo: data.activo !== false,
                fecha_creacion: data.fecha_creacion,
                ultimo_acceso: data.ultimo_acceso,
            });
        });

        res.json({ success: true, data: usuarios });
    } catch (error) {
        console.error("Error al obtener usuarios:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /usuarios
 * Crear nuevo usuario (solo admin)
 */
router.post("/", verificarAuth, verificarRol("administrador"), async (req, res) => {
    try {
        const { username, password, nombre_completo, email, rol, departamento } = req.body;

        // Validar campos requeridos
        if (!username || !password || !nombre_completo || !email || !rol) {
            return res.status(400).json({ success: false, error: "Faltan campos requeridos" });
        }

        // Crear usuario en Firebase Authentication
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
            displayName: nombre_completo,
        });

        // Guardar datos adicionales en Firestore
        await db.collection("usuarios").doc(userRecord.uid).set({
            username: username,
            nombre_completo: nombre_completo,
            email: email,
            rol: rol,
            departamento: departamento || null,
            activo: true,
            fecha_creacion: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Establecer custom claims para el rol
        await admin.auth().setCustomUserClaims(userRecord.uid, { rol: rol });

        res.status(201).json({
            success: true,
            message: "Usuario creado exitosamente",
            data: { id: userRecord.uid },
        });
    } catch (error) {
        console.error("Error al crear usuario:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /usuarios/:id
 * Actualizar usuario
 */
router.put("/:id", verificarAuth, async (req, res) => {
    try {
        const id = req.params.id;
        const { nombre_completo, email, rol, departamento, activo, password } = req.body;

        // Verificar que el usuario existe
        const userDoc = await db.collection("usuarios").doc(id).get();
        if (!userDoc.exists) {
            return res.status(404).json({ success: false, error: "Usuario no encontrado" });
        }

        // Solo admin puede actualizar otros usuarios
        // Los usuarios pueden actualizar su propio perfil (campos limitados)
        if (req.user.uid !== id && req.userRole !== "administrador") {
            return res.status(403).json({
                success: false,
                error: "No tiene permisos para actualizar este usuario",
            });
        }

        // Actualizar en Firestore
        const updateData = {};
        if (nombre_completo) updateData.nombre_completo = nombre_completo;
        if (email) updateData.email = email;
        if (rol && req.userRole === "administrador") updateData.rol = rol;
        if (departamento !== undefined) updateData.departamento = departamento;
        if (activo !== undefined && req.userRole === "administrador") updateData.activo = activo;

        await db.collection("usuarios").doc(id).update(updateData);

        // Actualizar en Firebase Auth
        const authUpdate = {};
        if (email) authUpdate.email = email;
        if (nombre_completo) authUpdate.displayName = nombre_completo;
        if (password) authUpdate.password = password;

        if (Object.keys(authUpdate).length > 0) {
            await admin.auth().updateUser(id, authUpdate);
        }

        // Actualizar custom claims si cambió el rol
        if (rol && req.userRole === "administrador") {
            await admin.auth().setCustomUserClaims(id, { rol: rol });
        }

        res.json({ success: true, message: "Usuario actualizado exitosamente" });
    } catch (error) {
        console.error("Error al actualizar usuario:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /usuarios/:id
 * Desactivar usuario (no eliminar)
 */
router.delete("/:id", verificarAuth, verificarRol("administrador"), async (req, res) => {
    try {
        const id = req.params.id;

        // Obtener datos del usuario
        const userDoc = await db.collection("usuarios").doc(id).get();
        if (!userDoc.exists) {
            return res.status(404).json({ success: false, error: "Usuario no encontrado" });
        }

        const userData = userDoc.data();

        // No permitir eliminar el usuario admin principal
        if (userData.username === "admin") {
            return res.status(400).json({
                success: false,
                error: "No se puede eliminar el usuario administrador",
            });
        }

        // Desactivar en Firestore
        await db.collection("usuarios").doc(id).update({ activo: false });

        // Desactivar en Firebase Auth
        await admin.auth().updateUser(id, { disabled: true });

        res.json({ success: true, message: "Usuario desactivado exitosamente" });
    } catch (error) {
        console.error("Error al desactivar usuario:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
