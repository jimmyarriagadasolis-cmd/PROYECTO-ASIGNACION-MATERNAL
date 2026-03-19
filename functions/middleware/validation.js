/**
 * Middleware de Validación de Entrada
 * Ministerio de las Culturas, las Artes y el Patrimonio - Chile
 */

const { body, validationResult } = require('express-validator');

// Validación para creación de solicitudes
const validateSolicitud = [
    body('rut_funcionaria')
        .notEmpty()
        .withMessage('El RUT es requerido')
        .matches(/^[0-9Kk]{7,8}$/)
        .withMessage('El RUT debe tener entre 7 y 8 caracteres (números y K)'),
    
    body('nombre_completo')
        .notEmpty()
        .withMessage('El nombre completo es requerido')
        .isLength({ min: 3, max: 100 })
        .withMessage('El nombre debe tener entre 3 y 100 caracteres')
        .trim(),
    
    body('departamento_unidad')
        .notEmpty()
        .withMessage('El departamento/unidad es requerido')
        .isLength({ min: 3, max: 100 })
        .withMessage('El departamento debe tener entre 3 y 100 caracteres')
        .trim(),
    
    body('correo_electronico')
        .optional()
        .isEmail()
        .withMessage('El correo electrónico no es válido')
        .normalizeEmail(),
    
    body('telefono')
        .optional()
        .matches(/^[+]?[0-9]{8,15}$/)
        .withMessage('El teléfono no es válido'),
    
    body('fecha_inicio_embarazo')
        .notEmpty()
        .withMessage('La fecha de inicio de embarazo es requerida')
        .isISO8601()
        .withMessage('La fecha de inicio de embarazo no es válida'),
    
    body('fecha_nacimiento')
        .optional()
        .isISO8601()
        .withMessage('La fecha de nacimiento no es válida'),
    
    body('fecha_ingreso_solicitud')
        .notEmpty()
        .withMessage('La fecha de ingreso de solicitud es requerida')
        .isISO8601()
        .withMessage('La fecha de ingreso de solicitud no es válida'),
    
    body('sueldo_bruto_mensual')
        .notEmpty()
        .withMessage('El sueldo bruto mensual es requerido')
        .isInt({ min: 1, max: 10000000 })
        .withMessage('El sueldo debe ser un número entre 1 y 10,000,000'),
    
    body('estado_solicitud')
        .optional()
        .isIn(['Ingresada', 'En Revisión', 'Aprobada', 'Rechazada'])
        .withMessage('El estado de solicitud no es válido')
];

// Validación para actualización de solicitudes
const validateSolicitudUpdate = [
    body('estado_solicitud')
        .optional()
        .isIn(['Ingresada', 'En Revisión', 'Aprobada', 'Rechazada'])
        .withMessage('El estado de solicitud no es válido'),
    
    body('observaciones')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Las observaciones no pueden exceder 500 caracteres')
        .trim(),
    
    body('fecha_aprobacion')
        .optional()
        .isISO8601()
        .withMessage('La fecha de aprobación no es válida')
];

// Validación para usuarios
const validateUsuario = [
    body('nombre')
        .notEmpty()
        .withMessage('El nombre es requerido')
        .isLength({ min: 3, max: 100 })
        .withMessage('El nombre debe tener entre 3 y 100 caracteres')
        .trim(),
    
    body('email')
        .isEmail()
        .withMessage('El correo electrónico no es válido')
        .normalizeEmail(),
    
    body('rol')
        .isIn(['administrador', 'rrhh', 'jefatura'])
        .withMessage('El rol no es válido'),
    
    body('rut')
        .optional()
        .matches(/^[0-9Kk]{7,8}$/)
        .withMessage('El RUT debe tener entre 7 y 8 caracteres (números y K)'),
    
    body('cargo')
        .optional()
        .isLength({ max: 100 })
        .withMessage('El cargo no puede exceder 100 caracteres')
        .trim(),
    
    body('departamento')
        .optional()
        .isLength({ max: 100 })
        .withMessage('El departamento no puede exceder 100 caracteres')
        .trim()
];

// Middleware para manejar errores de validación
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => ({
            campo: error.path,
            mensaje: error.msg,
            valor: error.value
        }));
        
        console.log('❌ Errores de validación:', errorMessages);
        
        return res.status(400).json({
            success: false,
            error: 'Errores de validación',
            errores: errorMessages
        });
    }
    
    next();
};

module.exports = {
    validateSolicitud,
    validateSolicitudUpdate,
    validateUsuario,
    handleValidationErrors
};
