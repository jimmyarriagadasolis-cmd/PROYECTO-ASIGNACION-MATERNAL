/**
 * Rutas de Usuarios
 * Ministerio de las Culturas, las Artes y el Patrimonio - Chile
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'ministerio-cultura-2026-secret-key';

/**
 * POST /api/usuarios/login
 * Autenticación de usuario
 */
router.post('/login', (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'Usuario y contraseña requeridos' });
        }

        const usuario = db.prepare('SELECT * FROM Usuarios WHERE username = ? AND activo = 1').get(username);

        if (!usuario) {
            return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
        }

        const passwordValido = bcrypt.compareSync(password, usuario.password_hash);
        if (!passwordValido) {
            return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
        }

        // Actualizar último acceso
        db.prepare('UPDATE Usuarios SET ultimo_acceso = datetime("now", "localtime") WHERE id = ?').run(usuario.id);

        // Generar token JWT
        const token = jwt.sign(
            { id: usuario.id, username: usuario.username, rol: usuario.rol },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        // Registrar en log
        db.prepare(`
            INSERT INTO Logs_Auditoria (usuario_id, accion, tabla_afectada)
            VALUES (?, ?, ?)
        `).run(usuario.id, 'LOGIN', 'Usuarios');

        res.json({
            success: true,
            data: {
                token,
                usuario: {
                    id: usuario.id,
                    username: usuario.username,
                    nombre_completo: usuario.nombre_completo,
                    email: usuario.email,
                    rol: usuario.rol,
                    departamento: usuario.departamento
                }
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/usuarios
 * Obtener todos los usuarios (solo admin)
 */
router.get('/', (req, res) => {
    try {
        const usuarios = db.prepare(`
            SELECT id, username, nombre_completo, email, rol, departamento, activo, fecha_creacion, ultimo_acceso
            FROM Usuarios ORDER BY nombre_completo
        `).all();

        res.json({ success: true, data: usuarios });
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/usuarios
 * Crear nuevo usuario (solo admin)
 */
router.post('/', (req, res) => {
    try {
        const { username, password, nombre_completo, email, rol, departamento } = req.body;

        // Validar campos requeridos
        if (!username || !password || !nombre_completo || !email || !rol) {
            return res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
        }

        // Verificar que no exista el username
        const existe = db.prepare('SELECT id FROM Usuarios WHERE username = ?').get(username);
        if (existe) {
            return res.status(400).json({ success: false, error: 'El nombre de usuario ya existe' });
        }

        const passwordHash = bcrypt.hashSync(password, 10);

        const result = db.prepare(`
            INSERT INTO Usuarios (username, password_hash, nombre_completo, email, rol, departamento)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(username, passwordHash, nombre_completo, email, rol, departamento || null);

        res.status(201).json({
            success: true,
            message: 'Usuario creado exitosamente',
            data: { id: result.lastInsertRowid }
        });
    } catch (error) {
        console.error('Error al crear usuario:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/usuarios/:id
 * Actualizar usuario
 */
router.put('/:id', (req, res) => {
    try {
        const id = req.params.id;
        const { nombre_completo, email, rol, departamento, activo, password } = req.body;

        const usuario = db.prepare('SELECT id FROM Usuarios WHERE id = ?').get(id);
        if (!usuario) {
            return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
        }

        let query = 'UPDATE Usuarios SET nombre_completo = ?, email = ?, rol = ?, departamento = ?, activo = ?';
        let params = [nombre_completo, email, rol, departamento, activo ? 1 : 0];

        if (password) {
            query += ', password_hash = ?';
            params.push(bcrypt.hashSync(password, 10));
        }

        query += ' WHERE id = ?';
        params.push(id);

        db.prepare(query).run(...params);

        res.json({ success: true, message: 'Usuario actualizado exitosamente' });
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/usuarios/:id
 * Desactivar usuario (no eliminar)
 */
router.delete('/:id', (req, res) => {
    try {
        const id = req.params.id;

        // No permitir eliminar el usuario admin
        const usuario = db.prepare('SELECT username FROM Usuarios WHERE id = ?').get(id);
        if (usuario?.username === 'admin') {
            return res.status(400).json({ success: false, error: 'No se puede eliminar el usuario administrador' });
        }

        db.prepare('UPDATE Usuarios SET activo = 0 WHERE id = ?').run(id);

        res.json({ success: true, message: 'Usuario desactivado exitosamente' });
    } catch (error) {
        console.error('Error al desactivar usuario:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
