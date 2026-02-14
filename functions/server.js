const express = require('express');
const cors = require('cors');
const { setGlobalOptions } = require('firebase-functions/v2');
const { onRequest } = require('firebase-functions/v2/https');

// Inicializar Firebase Admin. Esto hace que la instancia 'db' de Firestore esté disponible.
require('./database');

// Establecer opciones globales para las funciones (v2)
setGlobalOptions({ region: 'us-central1', cpu: 1 });

const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurar rutas
// Ya no es necesario esperar a que la base de datos esté lista.
console.log("Configurando rutas de la API...");
const solicitudesRoutes = require('./routes/solicitudes');
const usuariosRoutes = require('./routes/usuarios');
const reportesRoutes = require('./routes/reportes');
const configRoutes = require('./routes/config');

app.use('/api/solicitudes', solicitudesRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/config', configRoutes);
console.log("Rutas configuradas.");

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error('Ha ocurrido un error no controlado:', err.stack);
    res.status(500).json({
        error: 'Error interno del servidor',
        mensaje: err.message
    });
});

// Exportar la Cloud Function 'api'
// Express app se pasa directamente a onRequest.
exports.api = onRequest(app);
