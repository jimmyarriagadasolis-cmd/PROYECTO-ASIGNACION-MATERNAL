const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

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

// Servir reportes generados
app.use('/reports', express.static(path.join(__dirname, '..', 'reports')));

// Asegurar que existen los directorios necesarios
const dirs = ['data', 'reports', 'backups'];
dirs.forEach(dir => {
    const dirPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
});

// Inicializar base de datos e iniciar servidor
const { initDatabase } = require('./database');

initDatabase().then(() => {
    // Importar rutas después de inicializar la BD
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
║     Gobierno de Chile                                             ║
╠═══════════════════════════════════════════════════════════════════╣
║     Servidor iniciado en: http://localhost:${PORT}                   ║
║     Fecha: ${new Date().toLocaleString('es-CL')}                          
╚═══════════════════════════════════════════════════════════════════╝
        `);
    });
}).catch(err => {
    console.error('Error al inicializar la base de datos:', err);
    process.exit(1);
});

module.exports = app;
