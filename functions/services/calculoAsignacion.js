/**
 * Motor de Cálculo de Asignación Maternal
 * Ministerio de las Culturas, las Artes y el Patrimonio - Chile
 */

const db = require('../database');
/**
 * Parsea una fecha en formato YYYY-MM-DD a un objeto Date local (evita desfase UTC)
 */
function parsearFechaLocal(fechaStr) {
    if (!fechaStr) return null;
    const [año, mes, día] = fechaStr.split('-').map(Number);
    return new Date(año, mes - 1, día);
}

/**
 * Obtiene la configuración de tramos históricos según la fecha
 * @param {Date} fecha - Fecha para la cual se necesitan los valores
 * @returns {object} - Configuración de tramos vigente en esa fecha
 */
function obtenerConfiguracionTramos(fecha = new Date()) {
    // Asegurar que usamos la fecha en formato local YYYY-MM-DD para la query
    const yyyy = fecha.getFullYear();
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const dd = String(fecha.getDate()).padStart(2, '0');
    const fechaBusqueda = `${yyyy}-${mm}-${dd}`;

    // Buscar valores históricos para esta fecha
    const valoresHistoricos = db.prepare(`
        SELECT * FROM Valores_Asignacion_Historicos 
        WHERE fecha_vigencia_desde <= ? AND fecha_vigencia_hasta >= ?
        ORDER BY fecha_vigencia_desde DESC
        LIMIT 1
    `).get([fechaBusqueda, fechaBusqueda]);

    if (valoresHistoricos) {
        return {
            tramo1: { min: valoresHistoricos.tramo1_ingreso_desde, limite: valoresHistoricos.tramo1_ingreso_hasta, monto: valoresHistoricos.tramo1_valor_unitario },
            tramo2: { min: valoresHistoricos.tramo2_ingreso_desde, limite: valoresHistoricos.tramo2_ingreso_hasta, monto: valoresHistoricos.tramo2_valor_unitario },
            tramo3: { min: valoresHistoricos.tramo3_ingreso_desde, limite: valoresHistoricos.tramo3_ingreso_hasta, monto: valoresHistoricos.tramo3_valor_unitario },
            leyReferencia: valoresHistoricos.ley_referencia,
            vigenciaDesde: valoresHistoricos.fecha_vigencia_desde,
            vigenciaHasta: valoresHistoricos.fecha_vigencia_hasta
        };
    }

    // Fallback: usar valores actuales de la tabla Configuracion
    console.warn(`⚠️ No se encontraron valores históricos para ${fechaBusqueda}, usando valores actuales`);
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
 * Determina el tramo de asignación según el sueldo imponible promedio y la fecha
 */
function determinarTramo(sueldoImponible, fecha = new Date()) {
    const config = obtenerConfiguracionTramos(fecha);

    if (sueldoImponible <= config.tramo1.limite) {
        return { tramo: 1, montoMensual: config.tramo1.monto, config };
    } else if (sueldoImponible <= config.tramo2.limite) {
        return { tramo: 2, montoMensual: config.tramo2.monto, config };
    } else if (sueldoImponible <= config.tramo3.limite) {
        return { tramo: 3, montoMensual: config.tramo3.monto, config };
    } else {
        return { tramo: 4, montoMensual: 0, config };
    }
}

/**
 * Calcula los meses completos entre dos fechas
 */
function calcularMesesEntre(fechaInicio, fechaFin) {
    if (!fechaInicio || !fechaFin) return 0;
    const inicio = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth(), 1);
    const fin = new Date(fechaFin.getFullYear(), fechaFin.getMonth(), 1);

    let meses = (fin.getFullYear() - inicio.getFullYear()) * 12;
    meses += fin.getMonth() - inicio.getMonth();

    return Math.max(0, meses + 1);
}

/**
 * Genera el desglose mensual de pagos con valores históricos correctos
 */
function generarDesgloseMensual(fechaInicio, cantidadMeses, sueldoImponible) {
    const desglose = [];
    const fecha = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth(), 1);

    const nombresMeses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    for (let i = 0; i < cantidadMeses; i++) {
        const { montoMensual, tramo, config } = determinarTramo(sueldoImponible, fecha);

        desglose.push({
            mes: nombresMeses[fecha.getMonth()],
            año: fecha.getFullYear(),
            mesAño: `${nombresMeses[fecha.getMonth()]} ${fecha.getFullYear()}`,
            monto: montoMensual,
            tramo: tramo,
            fecha: `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-01`,
            leyVigente: config.leyReferencia || 'Valores actuales por defecto',
            detalleCalculo: tramo === 4
                ? `Sueldo (${formatearMoneda(sueldoImponible)}) excede Tramo 3`
                : `Sueldo (${formatearMoneda(sueldoImponible)}) en Tramo ${tramo} (Límite: ${formatearMoneda(config[`tramo${tramo}`].limite)})`,
            vigenciaRango: `${config.vigenciaDesde} a ${config.vigenciaHasta}`
        });
        fecha.setMonth(fecha.getMonth() + 1);
    }

    return desglose;
}

/**
 * Valida si la solicitud está dentro del plazo legal (5 años)
 */
function validarPlazoLegal(fechaInicioEmbarazo, fechaIngresoSolicitud) {
    const configPlazo = db.prepare('SELECT valor FROM Configuracion WHERE clave = ?').get('plazo_maximo_años');
    const plazoMaximoAños = parseInt(configPlazo?.valor || 5);

    const diferenciaAños = (fechaIngresoSolicitud - fechaInicioEmbarazo) / (1000 * 60 * 60 * 24 * 365.25);

    if (diferenciaAños > plazoMaximoAños) {
        return {
            valido: false,
            mensaje: `La solicitud supera el plazo legal de ${plazoMaximoAños} años.`
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
        fechaInicioEmbarazo: fechaInicioStr,
        fechaNacimiento: fechaNacStr,
        fechaIngresoSolicitud: fechaIngresoStr,
        sueldoBrutoMensual
    } = datos;

    // Usar parsing local para evitar desfase UTC
    const fechaInicio = parsearFechaLocal(fechaInicioStr);
    const fechaIngreso = parsearFechaLocal(fechaIngresoStr);
    const fechaNacimiento = parsearFechaLocal(fechaNacStr);

    // Determinar tramo inicial y asegurar sueldo como entero
    const sueldoLimpio = Math.floor(parseFloat(sueldoBrutoMensual) || 0);
    const { tramo, montoMensual, config } = determinarTramo(sueldoLimpio, fechaInicio);

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
    const validacionPlazo = validarPlazoLegal(fechaInicio, fechaIngreso);

    // Calcular fecha fin del embarazo (estimada o real)
    let fechaFinEmbarazo;
    if (fechaNacimiento) {
        fechaFinEmbarazo = new Date(fechaNacimiento);
    } else {
        fechaFinEmbarazo = new Date(fechaInicio);
        fechaFinEmbarazo.setMonth(fechaFinEmbarazo.getMonth() + 9);
    }

    // Meses totales (máximo 9 por ley)
    let mesesTotalesEmbarazo = calcularMesesEntre(fechaInicio, fechaFinEmbarazo);
    mesesTotalesEmbarazo = Math.min(mesesTotalesEmbarazo, 9);

    // Calcular meses retroactivos (desde inicio hasta mes anterior a la solicitud)
    const fechaMesAnteriorSolicitud = new Date(fechaIngreso.getFullYear(), fechaIngreso.getMonth() - 1, 1);
    let mesesRetroactivos = calcularMesesEntre(fechaInicio, fechaMesAnteriorSolicitud);
    mesesRetroactivos = Math.max(0, Math.min(mesesRetroactivos, mesesTotalesEmbarazo));

    // Calcular meses futuros
    let mesesFuturos = 0;
    if (fechaIngreso < fechaFinEmbarazo) {
        mesesFuturos = mesesTotalesEmbarazo - mesesRetroactivos;
    }

    // Generar desgloses con sueldo entero
    const desgloseRetroactivo = generarDesgloseMensual(fechaInicio, mesesRetroactivos, sueldoLimpio);

    let fechaInicioFuturo = new Date(fechaInicio);
    fechaInicioFuturo.setMonth(fechaInicioFuturo.getMonth() + mesesRetroactivos);
    const desgloseFuturo = generarDesgloseMensual(fechaInicioFuturo, mesesFuturos, sueldoLimpio);

    const montoTotalRetroactivo = desgloseRetroactivo.reduce((sum, mes) => sum + mes.monto, 0);
    const montoTotalFuturo = desgloseFuturo.reduce((sum, mes) => sum + mes.monto, 0);
    const montoTotalPagable = montoTotalRetroactivo + montoTotalFuturo;

    const desgloseMensualCompleto = [...desgloseRetroactivo, ...desgloseFuturo];

    return {
        tieneDerechos: true,
        tramo,
        montoMensual: desgloseMensualCompleto.length > 0 ? desgloseMensualCompleto[0].monto : montoMensual,
        montoPromedio: desgloseMensualCompleto.length > 0 ? Math.round(montoTotalPagable / desgloseMensualCompleto.length) : montoMensual,
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
        fechaInicioEmbarazo: `${fechaInicio.getFullYear()}-${String(fechaInicio.getMonth() + 1).padStart(2, '0')}-${String(fechaInicio.getDate()).padStart(2, '0')}`,
        fechaFinEmbarazo: `${fechaFinEmbarazo.getFullYear()}-${String(fechaFinEmbarazo.getMonth() + 1).padStart(2, '0')}-${String(fechaFinEmbarazo.getDate()).padStart(2, '0')}`,
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
