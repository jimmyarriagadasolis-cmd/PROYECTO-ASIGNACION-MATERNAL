/**
 * Servidor Express para Firebase App Hosting
 * Ministerio de las Culturas, las Artes y el Patrimonio - Chile
 *
 * Este servidor reemplaza al backend local (SQLite) usando Firestore como base de datos
 * y Firebase Auth para autenticación. Se despliega en Cloud Run via App Hosting.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const admin = require('firebase-admin');

// Inicializar Firebase Admin SDK (usa credenciales automáticas en Cloud Run)
admin.initializeApp();
const db = admin.firestore();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Servir assets (logo, etc.)
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));

// Importar rutas (Firestore)
const solicitudesRoutes = require('./routes/solicitudes');
const usuariosRoutes = require('./routes/usuarios');
const reportesRoutes = require('./routes/reportes');
const configRoutes = require('./routes/config');

// Usar rutas
app.use('/api/solicitudes', solicitudesRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/config', configRoutes);

// Ruta principal - servir el frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Catch-all para SPA
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
    }
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Error interno del servidor',
        mensaje: err.message
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║     SISTEMA DE GESTIÓN DE ASIGNACIÓN MATERNAL                    ║
║     Ministerio de las Culturas, las Artes y el Patrimonio        ║
║     Firebase App Hosting (Cloud Run)                              ║
╠═══════════════════════════════════════════════════════════════════╣
║     Servidor iniciado en puerto: ${PORT}                              ║
║     Fecha: ${new Date().toLocaleString('es-CL')}
╚═══════════════════════════════════════════════════════════════════╝
    `);
});

module.exports = app;
