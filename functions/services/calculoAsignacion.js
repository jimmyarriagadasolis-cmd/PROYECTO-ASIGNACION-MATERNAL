/**
 * Motor de Cálculo de Asignación Maternal - VERSIÓN FIRESTORE
 * Ministerio de las Culturas, las Artes y el Patrimonio - Chile
 * Versión Firestore (App Hosting / Cloud Run)
 */

const { db } = require('../database'); // Importar la instancia de Firestore

/**
 * Parsea una fecha en formato YYYY-MM-DD a un objeto Date local (evita desfase UTC)
 */
function parsearFechaLocal(fechaStr) {
    if (!fechaStr) return null;
    const [año, mes, día] = fechaStr.split('-').map(Number);
    return new Date(año, mes - 1, día);
}

/**
 * Obtiene la configuración de tramos históricos según la fecha (versión Firestore)
 * @param {Date} fecha - Fecha para la cual se necesitan los valores
 * @returns {Promise<object>} - Configuración de tramos vigente en esa fecha
 */
async function obtenerConfiguracionTramos(fecha = new Date()) {
    const fechaBusqueda = fecha.toISOString().split('T')[0]; // Formato 'YYYY-MM-DD'

    const historicosRef = db.collection('Valores_Asignacion_Historicos');
    const snapshot = await historicosRef
        .where('fecha_vigencia_desde', '<=', fechaBusqueda)
        .orderBy('fecha_vigencia_desde', 'desc')
        .get();

    let valoresHistoricos = null;
    if (!snapshot.empty) {
        // Filtrar en memoria para la segunda condición del rango de fechas
        for (const doc of snapshot.docs) {
            const data = doc.data();
            if (data.fecha_vigencia_hasta >= fechaBusqueda) {
                valoresHistoricos = data;
                break; // Encontramos el más reciente y válido
            }
        }
    }

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

    // Fallback: usar valores actuales de la colección Configuracion
    console.warn(`⚠️ No se encontraron valores históricos para ${fechaBusqueda}, usando valores actuales`);
    const configRef = db.collection('Configuracion');
    const configSnapshot = await configRef.get();
    const config = {};
    configSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.clave && data.clave.startsWith('tramo')) {
            config[data.clave] = parseFloat(data.valor);
        }
    });

    return {
        tramo1: { limite: config.tramo1_limite, monto: config.tramo1_monto },
        tramo2: { limite: config.tramo2_limite, monto: config.tramo2_monto },
        tramo3: { limite: config.tramo3_limite, monto: config.tramo3_monto }
    };
}

/**
 * Determina el tramo de asignación según el sueldo imponible y la fecha (versión async)
 */
async function determinarTramo(sueldoImponible, fecha = new Date()) {
    const config = await obtenerConfiguracionTramos(fecha);

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
 * Genera el desglose mensual de pagos con valores históricos correctos (versión async)
 */
async function generarDesgloseMensual(fechaInicio, cantidadMeses, sueldoImponible) {
    const desglose = [];
    const fecha = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth(), 1);

    const nombresMeses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    for (let i = 0; i < cantidadMeses; i++) {
        const { montoMensual, tramo, config } = await determinarTramo(sueldoImponible, fecha);

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
 * Valida si la solicitud está dentro del plazo legal (5 años) (versión Firestore)
 */
async function validarPlazoLegal(fechaInicioEmbarazo, fechaIngresoSolicitud) {
    const configRef = db.collection('Configuracion').where('clave', '==', 'plazo_maximo_años').limit(1);
    const snapshot = await configRef.get();
    
    let plazoMaximoAños = 5; // Valor por defecto
    if (!snapshot.empty) {
        plazoMaximoAños = parseInt(snapshot.docs[0].data().valor || 5);
    }

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
 * Calcula la asignación maternal completa con valores históricos (versión async/Firestore)
 * @param {object} datos - Datos de la solicitud
 * @returns {Promise<object>} - Resultado del cálculo completo
 */
async function calcularAsignacionMaternal(datos) {
    const {
        fechaInicioEmbarazo: fechaInicioStr,
        fechaNacimiento: fechaNacStr,
        fechaIngresoSolicitud: fechaIngresoStr,
        sueldoBrutoMensual
    } = datos;

    const fechaInicio = parsearFechaLocal(fechaInicioStr);
    const fechaIngreso = parsearFechaLocal(fechaIngresoStr);
    const fechaNacimiento = parsearFechaLocal(fechaNacStr);

    const sueldoLimpio = Math.floor(parseFloat(sueldoBrutoMensual) || 0);
    const { tramo, montoMensual, config } = await determinarTramo(sueldoLimpio, fechaInicio);

    if (tramo === 4) {
        return {
            tieneDerechos: false,
            tramo: 4,
            mensaje: 'Sin derecho a asignación maternal (sueldo superior al límite del Tramo 3)',
            // ... resto de campos en cero
        };
    }

    const validacionPlazo = await validarPlazoLegal(fechaInicio, fechaIngreso);

    let fechaFinEmbarazo = fechaNacimiento ? new Date(fechaNacimiento) : new Date(fechaInicio);
    if (!fechaNacimiento) {
        fechaFinEmbarazo.setMonth(fechaFinEmbarazo.getMonth() + 9);
    }

    let mesesTotalesEmbarazo = Math.min(calcularMesesEntre(fechaInicio, fechaFinEmbarazo), 9);
    const fechaMesAnteriorSolicitud = new Date(fechaIngreso.getFullYear(), fechaIngreso.getMonth() - 1, 1);
    let mesesRetroactivos = Math.max(0, Math.min(calcularMesesEntre(fechaInicio, fechaMesAnteriorSolicitud), mesesTotalesEmbarazo));
    let mesesFuturos = (fechaIngreso < fechaFinEmbarazo) ? mesesTotalesEmbarazo - mesesRetroactivos : 0;

    const desgloseRetroactivo = await generarDesgloseMensual(fechaInicio, mesesRetroactivos, sueldoLimpio);
    let fechaInicioFuturo = new Date(fechaInicio);
    fechaInicioFuturo.setMonth(fechaInicioFuturo.getMonth() + mesesRetroactivos);
    const desgloseFuturo = await generarDesgloseMensual(fechaInicioFuturo, mesesFuturos, sueldoLimpio);

    const montoTotalRetroactivo = desgloseRetroactivo.reduce((sum, mes) => sum + mes.monto, 0);
    const montoTotalFuturo = desgloseFuturo.reduce((sum, mes) => sum + mes.monto, 0);
    const montoTotalPagable = montoTotalRetroactivo + montoTotalFuturo;
    const desgloseMensualCompleto = [...desgloseRetroactivo, ...desgloseFuturo];

    return {
        tieneDerechos: true,
        tramo,
        montoPromedio: desgloseMensualCompleto.length > 0 ? Math.round(montoTotalPagable / desgloseMensualCompleto.length) : montoMensual,
        mesesTotalesEmbarazo,
        mesesRetroactivos,
        montoTotalRetroactivo,
        mesesFuturos,
        montoTotalFuturo,
        montoTotalPagable,
        desgloseMensual: desgloseMensualCompleto,
        validacionPlazo
        // ... otros campos informativos
    };
}

function formatearMoneda(numero) {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(numero);
}

function numeroAPalabras(numero) {
    // Lógica sin cambios...
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
