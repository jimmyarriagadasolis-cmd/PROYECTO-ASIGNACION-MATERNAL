/**
 * Motor de Cálculo de Asignación Maternal
 * Ministerio de las Culturas, las Artes y el Patrimonio - Chile
 */

const db = require('../database');

/**
 * Obtiene la configuración de tramos históricos según la fecha
 * @param {Date} fecha - Fecha para la cual se necesitan los valores
 * @returns {object} - Configuración de tramos vigente en esa fecha
 */
function obtenerConfiguracionTramos(fecha = new Date()) {
    const fechaBusqueda = typeof fecha === 'string' ? fecha : fecha.toISOString().split('T')[0];

    // Buscar valores históricos para esta fecha
    const valoresHistoricos = db.prepare(`
        SELECT * FROM Valores_Asignacion_Historicos 
        WHERE fecha_vigencia_desde <= ? AND fecha_vigencia_hasta >= ?
        ORDER BY fecha_vigencia_desde DESC
        LIMIT 1
    `).get([fechaBusqueda, fechaBusqueda]);

    if (valoresHistoricos) {
        return {
            tramo1: {
                min: valoresHistoricos.tramo1_ingreso_desde,
                limite: valoresHistoricos.tramo1_ingreso_hasta,
                monto: valoresHistoricos.tramo1_valor_unitario
            },
            tramo2: {
                min: valoresHistoricos.tramo2_ingreso_desde,
                limite: valoresHistoricos.tramo2_ingreso_hasta,
                monto: valoresHistoricos.tramo2_valor_unitario
            },
            tramo3: {
                min: valoresHistoricos.tramo3_ingreso_desde,
                limite: valoresHistoricos.tramo3_ingreso_hasta,
                monto: valoresHistoricos.tramo3_valor_unitario
            },
            leyReferencia: valoresHistoricos.ley_referencia,
            vigenciaDesde: valoresHistoricos.fecha_vigencia_desde,
            vigenciaHasta: valoresHistoricos.fecha_vigencia_hasta
        };
    }

    // Fallback: usar valores actuales de la tabla Configuracion
    console.warn(`⚠️  No se encontraron valores históricos para ${fechaBusqueda}, usando valores actuales`);
    const config = {};
    const rows = db.prepare('SELECT clave, valor FROM Configuracion WHERE clave LIKE ?').all('tramo%');
    rows.forEach(row => {
        config[row.clave] = parseFloat(row.valor);
    });
    return {
        tramo1: { limite: config.tramo1_limite, monto: config.tramo1_monto },
        tramo2: { limite: config.tramo2_limite, monto: config.tramo2_monto },
        tramo3: { limite: config.tramo3_limite, monto: config.tramo3_monto }
    };
}

/**
 * Determina el tramo de asignación según el sueldo bruto y la fecha
 * @param {number} sueldoBruto - Sueldo bruto mensual
 * @param {Date|string} fecha - Fecha para obtener valores vigentes
 * @returns {object} - { tramo: number, montoMensual: number, config: object }
 */
function determinarTramo(sueldoBruto, fecha = new Date()) {
    const config = obtenerConfiguracionTramos(fecha);

    if (sueldoBruto <= config.tramo1.limite) {
        return { tramo: 1, montoMensual: config.tramo1.monto, config };
    } else if (sueldoBruto <= config.tramo2.limite) {
        return { tramo: 2, montoMensual: config.tramo2.monto, config };
    } else if (sueldoBruto <= config.tramo3.limite) {
        return { tramo: 3, montoMensual: config.tramo3.monto, config };
    } else {
        return { tramo: 4, montoMensual: 0, config };
    }
}

/**
 * Calcula los meses entre dos fechas
 * @param {Date} fechaInicio 
 * @param {Date} fechaFin 
 * @returns {number}
 */
function calcularMesesEntre(fechaInicio, fechaFin) {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    let meses = (fin.getFullYear() - inicio.getFullYear()) * 12;
    meses += fin.getMonth() - inicio.getMonth();

    // Incluir el mes de inicio
    return Math.max(0, meses + 1);
}

/**
 * Genera el desglose mensual de pagos con valores históricos correctos
 * @param {Date} fechaInicio - Fecha inicio del embarazo
 * @param {number} cantidadMeses - Cantidad de meses
 * @param {number} sueldoBruto - Sueldo bruto mensual para determinar tramo
 * @returns {Array} - Array con desglose por mes con valores históricos
 */
function generarDesgloseMensual(fechaInicio, cantidadMeses, sueldoBruto) {
    const desglose = [];
    const fecha = new Date(fechaInicio);

    const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    for (let i = 0; i < cantidadMeses; i++) {
        // Obtener valores vigentes para este mes específico
        const { montoMensual, tramo, config } = determinarTramo(sueldoBruto, fecha);

        desglose.push({
            mes: meses[fecha.getMonth()],
            año: fecha.getFullYear(),
            mesAño: `${meses[fecha.getMonth()]} ${fecha.getFullYear()}`,
            monto: montoMensual,
            tramo: tramo,
            fecha: fecha.toISOString().split('T')[0],
            leyVigente: config.leyReferencia || 'N/A'
        });
        fecha.setMonth(fecha.getMonth() + 1);
    }

    return desglose;
}

/**
 * Valida si la solicitud está dentro del plazo legal (5 años)
 * @param {Date} fechaInicioEmbarazo 
 * @param {Date} fechaIngresoSolicitud 
 * @returns {object} - { valido: boolean, mensaje: string }
 */
function validarPlazoLegal(fechaInicioEmbarazo, fechaIngresoSolicitud) {
    const configPlazo = db.prepare('SELECT valor FROM Configuracion WHERE clave = ?').get('plazo_maximo_años');
    const plazoMaximoAños = parseInt(configPlazo?.valor || 5);

    const inicio = new Date(fechaInicioEmbarazo);
    const ingreso = new Date(fechaIngresoSolicitud);

    const añosDiferencia = (ingreso - inicio) / (1000 * 60 * 60 * 24 * 365);

    if (añosDiferencia > plazoMaximoAños) {
        return {
            valido: false,
            mensaje: `La solicitud está fuera del plazo legal de ${plazoMaximoAños} años`
        };
    }

    return { valido: true, mensaje: '' };
}

/**
 * Calcula la asignación maternal completa con valores históricos
 * @param {object} datos - Datos de la solicitud
 * @returns {object} - Resultado del cálculo completo
 */
function calcularAsignacionMaternal(datos) {
    const {
        fechaInicioEmbarazo,
        fechaNacimiento,
        fechaIngresoSolicitud,
        sueldoBrutoMensual
    } = datos;

    // Determinar tramo inicial (se recalculará mes a mes)
    const { tramo, montoMensual, config } = determinarTramo(sueldoBrutoMensual, fechaInicioEmbarazo);

    // Si es tramo 4, no tiene derecho
    if (tramo === 4) {
        return {
            tieneDerechos: false,
            tramo: 4,
            montoMensual: 0,
            mensaje: 'Sin derecho a asignación maternal (sueldo superior al límite del Tramo 3)',
            mesesRetroactivos: 0,
            montoTotalRetroactivo: 0,
            mesesFuturos: 0,
            montoTotalFuturo: 0,
            montoTotalPagable: 0,
            desgloseMensual: []
        };
    }

    // Validar plazo legal
    const validacionPlazo = validarPlazoLegal(fechaInicioEmbarazo, fechaIngresoSolicitud);

    // Calcular fecha fin del embarazo
    let fechaFinEmbarazo;
    if (fechaNacimiento) {
        fechaFinEmbarazo = new Date(fechaNacimiento);
    } else {
        // Si no ha nacido, calcular 9 meses desde inicio
        fechaFinEmbarazo = new Date(fechaInicioEmbarazo);
        fechaFinEmbarazo.setMonth(fechaFinEmbarazo.getMonth() + 9);
    }

    const fechaIngreso = new Date(fechaIngresoSolicitud);
    const fechaInicio = new Date(fechaInicioEmbarazo);

    // Calcular meses totales de embarazo (máximo 9)
    let mesesTotalesEmbarazo = calcularMesesEntre(fechaInicio, fechaFinEmbarazo);
    mesesTotalesEmbarazo = Math.min(mesesTotalesEmbarazo, 9);

    // Calcular meses retroactivos (desde inicio hasta mes anterior a la solicitud)
    let fechaMesAnteriorSolicitud = new Date(fechaIngreso);
    fechaMesAnteriorSolicitud.setMonth(fechaMesAnteriorSolicitud.getMonth() - 1);

    let mesesRetroactivos = calcularMesesEntre(fechaInicio, fechaMesAnteriorSolicitud);
    mesesRetroactivos = Math.max(0, Math.min(mesesRetroactivos, mesesTotalesEmbarazo));

    // Calcular meses futuros (si aún no ha nacido o quedan meses por pagar)
    let mesesFuturos = 0;
    if (fechaIngreso < fechaFinEmbarazo) {
        mesesFuturos = calcularMesesEntre(fechaIngreso, fechaFinEmbarazo);
        mesesFuturos = Math.min(mesesFuturos, mesesTotalesEmbarazo - mesesRetroactivos);
    }

    // ✨ GENERAR DESGLOSE CON VALORES HISTÓRICOS MES A MES
    const desgloseRetroactivo = generarDesgloseMensual(fechaInicio, mesesRetroactivos, sueldoBrutoMensual);

    let desgloseFuturo = [];
    if (mesesFuturos > 0) {
        const fechaInicioFuturo = new Date(fechaIngreso);
        desgloseFuturo = generarDesgloseMensual(fechaInicioFuturo, mesesFuturos, sueldoBrutoMensual);
    }

    // Calcular montos totales sumando el desglose mensual real
    const montoTotalRetroactivo = desgloseRetroactivo.reduce((sum, mes) => sum + mes.monto, 0);
    const montoTotalFuturo = desgloseFuturo.reduce((sum, mes) => sum + mes.monto, 0);
    const montoTotalPagable = montoTotalRetroactivo + montoTotalFuturo;

    // El monto mensual promedio para referencia
    const desgloseMensualCompleto = [...desgloseRetroactivo, ...desgloseFuturo];
    const montoMensualPromedio = desgloseMensualCompleto.length > 0
        ? montoTotalPagable / desgloseMensualCompleto.length
        : montoMensual;

    return {
        tieneDerechos: true,
        tramo,
        montoMensual: Math.round(montoMensualPromedio), // Promedio redondeado
        mesesTotalesEmbarazo,
        mesesRetroactivos,
        montoTotalRetroactivo,
        mesesFuturos,
        montoTotalFuturo,
        montoTotalPagable,
        desgloseRetroactivo,
        desgloseFuturo,
        desgloseMensual: desgloseMensualCompleto,
        validacionPlazo,
        fechaInicioEmbarazo: fechaInicio.toISOString().split('T')[0],
        fechaFinEmbarazo: fechaFinEmbarazo.toISOString().split('T')[0],
        configuracionVigente: config
    };
}



/**
 * Formatea un número como moneda chilena
 * @param {number} numero 
 * @returns {string}
 */
function formatearMoneda(numero) {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0
    }).format(numero);
}

/**
 * Convierte número a palabras en español
 * @param {number} numero 
 * @returns {string}
 */
function numeroAPalabras(numero) {
    const unidades = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
    const decenas = ['', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
    const centenas = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

    if (numero === 0) return 'cero';
    if (numero === 100) return 'cien';

    let resultado = '';

    if (numero >= 1000000) {
        const millones = Math.floor(numero / 1000000);
        resultado += (millones === 1 ? 'un millón ' : numeroAPalabras(millones) + ' millones ');
        numero %= 1000000;
    }

    if (numero >= 1000) {
        const miles = Math.floor(numero / 1000);
        resultado += (miles === 1 ? 'mil ' : numeroAPalabras(miles) + ' mil ');
        numero %= 1000;
    }

    if (numero >= 100) {
        resultado += centenas[Math.floor(numero / 100)] + ' ';
        numero %= 100;
    }

    if (numero >= 10) {
        if (numero < 20) {
            const especiales = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
            resultado += especiales[numero - 10];
            return resultado.trim() + ' pesos';
        }
        resultado += decenas[Math.floor(numero / 10)];
        numero %= 10;
        if (numero > 0) resultado += ' y ';
    }

    if (numero > 0) {
        resultado += unidades[numero];
    }

    return resultado.trim() + ' pesos';
}

module.exports = {
    calcularAsignacionMaternal,
    determinarTramo,
    validarPlazoLegal,
    formatearMoneda,
    numeroAPalabras,
    obtenerConfiguracionTramos
};
