/**
 * Rate Limiting Middleware
 * Ministerio de las Culturas, las Artes y el Patrimonio - Chile
 */

const rateLimit = require('express-rate-limit');

// Configuración general de rate limiting
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Límite de 100 requests por ventana
    message: {
        success: false,
        error: 'Demasiadas solicitudes desde esta IP',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true, // Enviar headers de rate limit
    legacyHeaders: false, // Deshabilitar headers legacy
    handler: (req, res) => {
        console.log('🚫 Rate limit excedido para IP:', req.ip);
        res.status(429).json({
            success: false,
            error: 'Demasiadas solicitudes desde esta IP',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: Math.round(15 * 60) // 15 minutos en segundos
        });
    }
});

// Rate limiting más estricto para endpoints sensibles
const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 20, // Solo 20 requests por ventana para endpoints sensibles
    message: {
        success: false,
        error: 'Demasiados intentos. Por favor espere antes de continuar',
        code: 'STRICT_RATE_LIMIT_EXCEEDED'
    },
    handler: (req, res) => {
        console.log('🚫 Strict rate limit excedido para IP:', req.ip, 'en endpoint:', req.path);
        res.status(429).json({
            success: false,
            error: 'Demasiados intentos. Por favor espere antes de continuar',
            code: 'STRICT_RATE_LIMIT_EXCEEDED',
            retryAfter: Math.round(15 * 60)
        });
    }
});

// Rate limiting para login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // Solo 5 intentos de login por ventana
    skipSuccessfulRequests: true, // No contar requests exitosas
    message: {
        success: false,
        error: 'Demasiados intentos de login. Por favor espere 15 minutos',
        code: 'LOGIN_RATE_LIMIT_EXCEEDED'
    },
    handler: (req, res) => {
        console.log('🚫 Login rate limit excedido para IP:', req.ip);
        res.status(429).json({
            success: false,
            error: 'Demasiados intentos de login. Por favor espere 15 minutos',
            code: 'LOGIN_RATE_LIMIT_EXCEEDED',
            retryAfter: Math.round(15 * 60)
        });
    }
});

module.exports = {
    generalLimiter,
    strictLimiter,
    loginLimiter
};
