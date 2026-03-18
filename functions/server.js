const express = require('express');
const cors = require('cors');
const path = require('path');
const functions = require('firebase-functions');

// Inicializar Firebase Admin. Esto hace que la instancia 'db' de Firestore esté disponible.
try {
    require('./database');
    console.log('✅ Firebase Admin inicializado correctamente');
} catch (err) {
    console.error('❌ ERROR al inicializar Firebase Admin:', err.message);
    console.error(err.stack);
    process.exit(1);
}

const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurar rutas con try-catch para detectar errores de require()
console.log("Configurando rutas de la API...");
try {
    const solicitudesRoutes = require('./routes/solicitudes');
    console.log('  ✅ solicitudes cargado');
    const usuariosRoutes = require('./routes/usuarios');
    console.log('  ✅ usuarios cargado');
    const reportesRoutes = require('./routes/reportes');
    console.log('  ✅ reportes cargado');
    const configRoutes = require('./routes/config');
    console.log('  ✅ config cargado');
    const funcionariosRoutes = require('./routes/funcionarios');
    console.log('  ✅ funcionarios cargado');

    app.use('/api/solicitudes', solicitudesRoutes);
    app.use('/api/usuarios', usuariosRoutes);
    app.use('/api/reportes', reportesRoutes);
    app.use('/api/config', configRoutes);
    app.use('/api/funcionarios', funcionariosRoutes);
    console.log("✅ Todas las rutas configuradas.");
} catch (err) {
    console.error('❌ ERROR al cargar rutas:', err.message);
    console.error(err.stack);
    process.exit(1);
}

// Servir archivos estáticos del frontend y assets
const frontendPath = path.join(__dirname, '..', 'frontend');
const assetsPath = path.join(__dirname, '..', 'assets');
app.use(express.static(frontendPath));
app.use('/assets', express.static(assetsPath));
console.log(`📁 Sirviendo frontend desde: ${frontendPath}`);
console.log(`📁 Sirviendo assets desde: ${assetsPath}`);

// SPA fallback: cualquier ruta que no sea /api/* devuelve index.html
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(frontendPath, 'index.html'));
    } else {
        res.status(404).json({ error: 'Endpoint no encontrado' });
    }
});

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error('Ha ocurrido un error no controlado:', err.stack);
    res.status(500).json({
        error: 'Error interno del servidor',
        mensaje: err.message
    });
});

// Exportar como Firebase Cloud Function
exports.api = functions.https.onRequest(app);
