/**
 * Utilidades de Validación
 * Ministerio de las Culturas, las Artes y el Patrimonio - Chile
 */

/**
 * Valida un RUT chileno
 * @param {string} rut - RUT en formato XX.XXX.XXX-X o XXXXXXXX-X
 * @returns {object} - { valido: boolean, mensaje: string, rutFormateado: string }
 */
function validarRut(rut) {
    if (!rut) {
        return { valido: false, mensaje: 'El RUT es requerido', rutFormateado: '' };
    }

    // Limpiar el RUT
    let rutLimpio = rut.toString().replace(/\./g, '').replace(/-/g, '').trim().toUpperCase();

    if (rutLimpio.length < 8 || rutLimpio.length > 9) {
        return { valido: false, mensaje: 'El RUT debe tener entre 8 y 9 caracteres', rutFormateado: '' };
    }

    // Separar cuerpo y dígito verificador
    const cuerpo = rutLimpio.slice(0, -1);
    const dvIngresado = rutLimpio.slice(-1);

    // Validar que el cuerpo sea numérico
    if (!/^\d+$/.test(cuerpo)) {
        return { valido: false, mensaje: 'El cuerpo del RUT debe ser numérico', rutFormateado: '' };
    }

    // Calcular dígito verificador
    let suma = 0;
    let multiplicador = 2;

    for (let i = cuerpo.length - 1; i >= 0; i--) {
        suma += parseInt(cuerpo[i]) * multiplicador;
        multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
    }

    const resto = suma % 11;
    let dvCalculado = 11 - resto;

    if (dvCalculado === 11) dvCalculado = '0';
    else if (dvCalculado === 10) dvCalculado = 'K';
    else dvCalculado = dvCalculado.toString();

    if (dvCalculado !== dvIngresado) {
        return {
            valido: false,
            mensaje: 'El dígito verificador del RUT es incorrecto',
            rutFormateado: ''
        };
    }

    // Formatear RUT
    const rutFormateado = formatearRut(cuerpo + dvCalculado);

    return { valido: true, mensaje: 'RUT válido', rutFormateado };
}

/**
 * Formatea un RUT al formato XX.XXX.XXX-X
 * @param {string} rut 
 * @returns {string}
 */
function formatearRut(rut) {
    const rutLimpio = rut.replace(/\./g, '').replace(/-/g, '').trim().toUpperCase();
    const cuerpo = rutLimpio.slice(0, -1);
    const dv = rutLimpio.slice(-1);

    let cuerpoFormateado = '';
    let contador = 0;

    for (let i = cuerpo.length - 1; i >= 0; i--) {
        cuerpoFormateado = cuerpo[i] + cuerpoFormateado;
        contador++;
        if (contador === 3 && i !== 0) {
            cuerpoFormateado = '.' + cuerpoFormateado;
            contador = 0;
        }
    }

    return `${cuerpoFormateado}-${dv}`;
}

/**
 * Valida un correo electrónico
 * @param {string} email 
 * @returns {object}
 */
function validarEmail(email) {
    if (!email) {
        return { valido: false, mensaje: 'El correo electrónico es requerido' };
    }

    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(email)) {
        return { valido: false, mensaje: 'El formato del correo electrónico no es válido' };
    }

    return { valido: true, mensaje: 'Correo válido' };
}

/**
 * Valida un número de teléfono chileno
 * @param {string} telefono 
 * @returns {object}
 */
function validarTelefono(telefono) {
    if (!telefono) {
        return { valido: true, mensaje: 'Campo opcional' }; // El teléfono es opcional
    }

    // Limpiar el teléfono
    const telefonoLimpio = telefono.replace(/\s/g, '').replace(/-/g, '').replace(/\+/g, '');

    // Validar formato chileno (9 dígitos comenzando con 9, o con código de país)
    const regex = /^(56)?9\d{8}$/;
    if (!regex.test(telefonoLimpio)) {
        return { valido: false, mensaje: 'El formato del teléfono no es válido (ej: 912345678)' };
    }

    return { valido: true, mensaje: 'Teléfono válido' };
}

/**
 * Valida una fecha
 * @param {string} fecha - Fecha en formato YYYY-MM-DD
 * @returns {object}
 */
function validarFecha(fecha) {
    if (!fecha) {
        return { valido: false, mensaje: 'La fecha es requerida' };
    }

    const fechaObj = new Date(fecha);
    if (isNaN(fechaObj.getTime())) {
        return { valido: false, mensaje: 'El formato de fecha no es válido' };
    }

    return { valido: true, mensaje: 'Fecha válida', fecha: fechaObj };
}

/**
 * Valida el sueldo bruto
 * @param {number} sueldo 
 * @returns {object}
 */
function validarSueldo(sueldo) {
    if (!sueldo || sueldo <= 0) {
        return { valido: false, mensaje: 'El sueldo debe ser mayor a 0' };
    }

    if (isNaN(sueldo)) {
        return { valido: false, mensaje: 'El sueldo debe ser un número válido' };
    }

    return { valido: true, mensaje: 'Sueldo válido' };
}

/**
 * Valida todos los campos de una solicitud
 * @param {object} solicitud 
 * @returns {object} - { valido: boolean, errores: array }
 */
function validarSolicitud(solicitud) {
    const errores = [];

    // Validar RUT
    const validacionRut = validarRut(solicitud.rut_funcionaria);
    if (!validacionRut.valido) {
        errores.push({ campo: 'rut_funcionaria', mensaje: validacionRut.mensaje });
    }

    // Validar nombre
    if (!solicitud.nombre_completo || solicitud.nombre_completo.trim().length < 3) {
        errores.push({ campo: 'nombre_completo', mensaje: 'El nombre completo es requerido (mínimo 3 caracteres)' });
    }

    // Validar departamento
    if (!solicitud.departamento_unidad || solicitud.departamento_unidad.trim().length < 2) {
        errores.push({ campo: 'departamento_unidad', mensaje: 'El departamento/unidad es requerido' });
    }

    // Validar email
    const validacionEmail = validarEmail(solicitud.correo_electronico);
    if (!validacionEmail.valido) {
        errores.push({ campo: 'correo_electronico', mensaje: validacionEmail.mensaje });
    }

    // Validar teléfono (opcional)
    const validacionTel = validarTelefono(solicitud.telefono);
    if (!validacionTel.valido) {
        errores.push({ campo: 'telefono', mensaje: validacionTel.mensaje });
    }

    // Validar fecha inicio embarazo
    const validacionFechaInicio = validarFecha(solicitud.fecha_inicio_embarazo);
    if (!validacionFechaInicio.valido) {
        errores.push({ campo: 'fecha_inicio_embarazo', mensaje: validacionFechaInicio.mensaje });
    }

    // Validar fecha ingreso solicitud
    const validacionFechaIngreso = validarFecha(solicitud.fecha_ingreso_solicitud);
    if (!validacionFechaIngreso.valido) {
        errores.push({ campo: 'fecha_ingreso_solicitud', mensaje: validacionFechaIngreso.mensaje });
    }

    // Validar sueldo
    const validacionSueldo = validarSueldo(solicitud.sueldo_bruto_mensual);
    if (!validacionSueldo.valido) {
        errores.push({ campo: 'sueldo_bruto_mensual', mensaje: validacionSueldo.mensaje });
    }

    return {
        valido: errores.length === 0,
        errores,
        rutFormateado: validacionRut.rutFormateado
    };
}

module.exports = {
    validarRut,
    formatearRut,
    validarEmail,
    validarTelefono,
    validarFecha,
    validarSueldo,
    validarSolicitud
};
