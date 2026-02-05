/**
 * Motor de Cálculo de Asignación Maternal
 * Ministerio de las Culturas, las Artes y el Patrimonio - Chile
 * 
 * Adaptado para Firebase - sin dependencia de database.js
 */

const admin = require("firebase-admin");

/**
 * Parsea una fecha en formato YYYY-MM-DD a un objeto Date local (evita desfase UTC)
 */
function parsearFechaLocal(fechaStr) {
    if (!fechaStr) return null;
    const [año, mes, día] = fechaStr.split("-").map(Number);
    return new Date(año, mes - 1, día);
}

/**
 * Obtiene la configuración de tramos históricos según la fecha
 * @param {Date} fecha - Fecha para la cual se necesitan los valores
 * @param {FirebaseFirestore.Firestore} db - Instancia de Firestore
 * @returns {Promise<object>} - Configuración de tramos vigente en esa fecha
 */
async function obtenerConfiguracionTramos(fecha = new Date(), db = null) {
    if (!db) db = admin.firestore();

    const yyyy = fecha.getFullYear();
    const mm = String(fecha.getMonth() + 1).padStart(2, "0");
    const dd = String(fecha.getDate()).padStart(2, "0");
    const fechaBusqueda = `${yyyy}-${mm}-${dd}`;

    // Buscar valores históricos para esta fecha
    const valoresHistoricosSnapshot = await db.collection("valores_historicos")
        .where("fecha_vigencia_desde", "<=", fechaBusqueda)
        .where("fecha_vigencia_hasta", ">=", fechaBusqueda)
        .orderBy("fecha_vigencia_desde", "desc")
        .limit(1)
        .get();

    if (!valoresHistoricosSnapshot.empty) {
        const valoresHistoricos = valoresHistoricosSnapshot.docs[0].data();
        return {
            tramo1: {
                min: valoresHistoricos.tramo1_ingreso_desde,
                limite: valoresHistoricos.tramo1_ingreso_hasta,
                monto: valoresHistoricos.tramo1_valor_unitario,
            },
            tramo2: {
                min: valoresHistoricos.tramo2_ingreso_desde,
                limite: valoresHistoricos.tramo2_ingreso_hasta,
                monto: valoresHistoricos.tramo2_valor_unitario,
            },
            tramo3: {
                min: valoresHistoricos.tram3_ingreso_desde,
                limite: valoresHistoricos.tramo3_ingreso_hasta,
                monto: valoresHistoricos.tramo3_valor_unitario,
            },
            leyReferencia: valoresHistoricos.ley_referencia,
            vigenciaDesde: valoresHistoricos.fecha_vigencia_desde,
            vigenciaHasta: valoresHistoricos.fecha_vigencia_hasta,
        };
    }

    // Fallback: usar valores actuales de la colección configuracion
    console.warn(`⚠️ No se  encontraron valores históricos para ${fechaBusqueda}, usando valores actuales`);
    const configSnapshot = await db.collection("configuracion")
        .where(admin.firestore.FieldPath.documentId(), "in", [
            "tramo1_limite", "tramo1_monto",
            "tramo2_limite", "tramo2_monto",
            "tramo3_limite", "tramo3_monto",
        ])
        .get();

    const config = {};
    configSnapshot.forEach((doc) => {
        config[doc.id] = parseFloat(doc.data().valor);
    });

    return {
        tramo1: { limite: config.tramo1_limite, monto: config.tramo1_monto },
        tramo2: { limite: config.tramo2_limite, monto: config.tramo2_monto },
        tramo3: { limite: config.tramo3_limite, monto: config.tramo3_monto },
    };
}

/**
 * Determina el tramo de asignación según el sueldo imponible promedio y la fecha
 */
async function determinarTramo(sueldoImponible, fecha = new Date(), db = null) {
    const config = await obtenerConfiguracionTramos(fecha, db);

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
async function generarDesgloseMensual(fechaInicio, cantidadMeses, sueldoImponible, db = null) {
    const desglose = [];
    const fecha = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth(), 1);

    const nombresMeses = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
    ];

    for (let i = 0; i < cantidadMeses; i++) {
        const { montoMensual, tramo, config } = await determinarTramo(sueldoImponible, fecha, db);

        desglose.push({
            mes: nombresMeses[fecha.getMonth()],
            año: fecha.getFullYear(),
            mesAño: `${nombresMeses[fecha.getMonth()]} ${fecha.getFullYear()}`,
            monto: montoMensual,
            tramo: tramo,
            fecha: `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-01`,
            leyVigente: config.leyReferencia || "Valores actuales por defecto",
            detalleCalculo: tramo === 4 ?
                `Sueldo (${formatearMoneda(sueldoImponible)}) excede Tramo 3` :
                `Sueldo (${formatearMoneda(sueldoImponible)}) en Tramo ${tramo} (Límite: ${formatearMoneda(config[`tramo${tramo}`].limite)})`,
            vigenciaRango: `${config.vigenciaDesde || "N/A"} a ${config.vigenciaHasta || "N/A"}`,
        });
        fecha.setMonth(fecha.getMonth() + 1);
    }

    return desglose;
}

/**
 * Valida si la solicitud está dentro del plazo legal (5 años)
 */
async function validarPlazoLegal(fechaInicioEmbarazo, fechaIngresoSolicitud, db = null) {
    if (!db) db = admin.firestore();

    const configDoc = await db.collection("configuracion").doc("plazo_maximo_años").get();
    const plazoMaximoAños = parseInt(configDoc.exists ? configDoc.data().valor : 5);

    const diferenciaAños = (fechaIngresoSolicitud - fechaInicioEmbarazo) / (1000 * 60 * 60 * 24 * 365.25);

    if (diferenciaAños > plazoMaximoAños) {
        return {
            valido: false,
            mensaje: `La solicitud supera el plazo legal de ${plazoMaximoAños} años.`,
        };
    }

    return { valido: true, mensaje: "" };
}

/**
 * Calcula la asignación maternal completa con valores históricos
 * @param {object} datos - Datos de la solicitud
 * @param {FirebaseFirestore.Firestore} db - Instancia de Firestore
 * @returns {Promise<object>} - Resultado del cálculo completo
 */
async function calcularAsignacionMaternal(datos, db = null) {
    const {
        fechaInicioEmbarazo: fechaInicioStr,
        fechaNacimiento: fechaNacStr,
        fechaIngresoSolicitud: fechaIngresoStr,
        sueldoBrutoMensual,
    } = datos;

    if (!db) db = admin.firestore();

    // Usar parsing local para evitar desfase UTC
    const fechaInicio = parsearFechaLocal(fechaInicioStr);
    const fechaIngreso = parsearFechaLocal(fechaIngresoStr);
    const fechaNacimiento = parsearFechaLocal(fechaNacStr);

    // Determinar tramo inicial y asegurar sueldo como entero
    const sueldoLimpio = Math.floor(parseFloat(sueldoBrutoMensual) || 0);
    const { tramo, montoMensual, config } = await determinarTramo(sueldoLimpio, fechaInicio, db);

    if (tramo === 4) {
        return {
            tieneDerechos: false,
            tramo: 4,
            montoMensual: 0,
            mensaje: "Sin derecho a asignación maternal (sueldo superior al límite del Tramo 3)",
            mesesRetroactivos: 0,
            montoTotalRetroactivo: 0,
            mesesFuturos: 0,
            montoTotalFuturo: 0,
            montoTotalPagable: 0,
            desgloseMensual: [],
        };
    }

    // Validar plazo legal
    const validacionPlazo = await validarPlazoLegal(fechaInicio, fechaIngreso, db);

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
    const desgloseRetroactivo = await generarDesgloseMensual(fechaInicio, mesesRetroactivos, sueldoLimpio, db);

    let fechaInicioFuturo = new Date(fechaInicio);
    fechaInicioFuturo.setMonth(fechaInicioFuturo.getMonth() + mesesRetroactivos);
    const desgloseFuturo = await generarDesgloseMensual(fechaInicioFuturo, mesesFuturos, sueldoLimpio, db);

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
        fechaInicioEmbarazo: `${fechaInicio.getFullYear()}-${String(fechaInicio.getMonth() + 1).padStart(2, "0")}-${String(fechaInicio.getDate()).padStart(2, "0")}`,
        fechaFinEmbarazo: `${fechaFinEmbarazo.getFullYear()}-${String(fechaFinEmbarazo.getMonth() + 1).padStart(2, "0")}-${String(fechaFinEmbarazo.getDate()).padStart(2, "0")}`,
        configuracionVigente: config,
    };
}

/**
 * Formatea un número como moneda chilena
 */
function formatearMoneda(numero) {
    return new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: "CLP",
        minimumFractionDigits: 0,
    }).format(numero);
}

/**
 * Convierte número a palabras en español
 */
function numeroAPalabras(numero) {
    const unidades = ["", "un", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];
    const decenas = ["", "diez", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
    const centenas = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];

    if (numero === 0) return "cero";
    if (numero === 100) return "cien";

    let resultado = "";

    if (numero >= 1000000) {
        const millones = Math.floor(numero / 1000000);
        resultado += (millones === 1 ? "un millón " : numeroAPalabras(millones) + " millones ");
        numero %= 1000000;
    }

    if (numero >= 1000) {
        const miles = Math.floor(numero / 1000);
        resultado += (miles === 1 ? "mil " : numeroAPalabras(miles) + " mil ");
        numero %= 1000;
    }

    if (numero >= 100) {
        resultado += centenas[Math.floor(numero / 100)] + " ";
        numero %= 100;
    }

    if (numero >= 10) {
        if (numero < 20) {
            const especiales = ["diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve"];
            resultado += especiales[numero - 10];
            return resultado.trim() + " pesos";
        }
        resultado += decenas[Math.floor(numero / 10)];
        numero %= 10;
        if (numero > 0) resultado += " y ";
    }

    if (numero > 0) {
        resultado += unidades[numero];
    }

    return resultado.trim() + " pesos";
}

module.exports = {
    calcularAsignacionMaternal,
    determinarTramo,
    validarPlazoLegal,
    formatearMoneda,
    numeroAPalabras,
    obtenerConfiguracionTramos,
};
