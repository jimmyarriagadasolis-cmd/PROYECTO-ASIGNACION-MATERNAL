const express = require('express');
const cors = require('cors');

// Inicializar Firebase Admin. Esto hace que la instancia 'db' de Firestore esté disponible.
require('./database');

const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurar rutas
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

// Iniciar el servidor para App Hosting
// El contenedor buscará que la app escuche en el puerto definido por process.env.PORT
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Servidor Express escuchando en el puerto ${PORT}`);
  console.log('Presiona Ctrl-C para terminar.');
});
