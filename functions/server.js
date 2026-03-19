const express = require('express');
const cors = require('cors');
const path = require('path');
const functions = require('firebase-functions');
const helmet = require('helmet');
const { generalLimiter, strictLimiter, loginLimiter } = require('./middleware/rateLimit');

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

// CORS Configuration - Restrictive
const allowedOrigins = [
    'https://asignacion-maternal.web.app',
    'https://functions--asignacion-maternal.us-east4.hosted.app',
    'http://localhost:3000', // Desarrollo local
    'http://localhost:5000'  // Emuladores Firebase
];

const corsOptions = {
    origin: function (origin, callback) {
        // Permitir requests sin origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('🚫 Origen CORS no permitido:', origin);
            callback(new Error('Origen no permitido por CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'"]
        }
    },
    crossOriginEmbedderPolicy: false // Necesario para Firebase Functions
}));

// Rate limiting
app.use(generalLimiter);

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`📡 ${req.method} ${req.path} - Origin: ${req.headers.origin || 'No Origin'} - IP: ${req.ip}`);
    next();
});

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

// Servir assets en todos los entornos (necesario para Firebase Functions)
const assetsPath = path.join(__dirname, 'assets');
app.use('/assets', express.static(assetsPath));
console.log(`📁 Sirviendo assets desde: ${assetsPath}`);
console.log(`📁 __dirname actual: ${__dirname}`);
console.log(`📁 Ruta completa de assets: ${path.resolve(assetsPath)}`);

// En desarrollo local, también servir el frontend
if (process.env.NODE_ENV !== 'production') {
    const frontendPath = path.join(__dirname, '..', 'frontend');
    app.use(express.static(frontendPath));
    console.log(`📁 Sirviendo frontend desde: ${frontendPath}`);

    // SPA fallback para desarrollo local
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api') && !req.path.startsWith('/assets')) {
            res.sendFile(path.join(frontendPath, 'index.html'));
        } else {
            res.status(404).json({ error: 'Endpoint no encontrado' });
        }
    });
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Error no manejado:', err);
    
    // Log estructurado
    const errorInfo = {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        origin: req.headers.origin,
        timestamp: new Date().toISOString()
    };
    
    if (process.env.NODE_ENV === 'production') {
        // En producción, no enviar stack trace al cliente
        res.status(500).json({ 
            success: false,
            error: 'Error interno del servidor',
            code: 'INTERNAL_SERVER_ERROR'
        });
    } else {
        // En desarrollo, enviar detalles del error
        res.status(500).json({ 
            success: false,
            error: err.message,
            stack: err.stack
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint no encontrado',
        path: req.originalUrl
    });
});

// Exportar como Firebase Cloud Function en us-east4
exports.api = functions.https.onRequest({
    region: 'us-east4'
}, app);
