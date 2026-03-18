/**
 * Generador de PDF para Fichas Individuales
 * Ministerio de las Culturas, las Artes y el Patrimonio - Chile
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { formatearMoneda, numeroAPalabras } = require('./calculoAsignacion');

/**
 * Genera un PDF de ficha individual
 * @param {object} solicitud - Datos completos de la solicitud
 * @param {string} outputPath - Ruta donde guardar el PDF
 * @param {object} usuario - Datos del usuario que genera el documento (opcional)
 */
function generarFichaIndividualPDF(solicitud, outputPath, usuario = null) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'LETTER',
                margins: { top: 50, bottom: 50, left: 50, right: 50 }
            });

            const stream = fs.createWriteStream(outputPath);
            doc.pipe(stream);

            // Colores institucionales
            const azulOscuro = '#1a365d';
            const azulClaro = '#3182ce';
            const gris = '#4a5568';
            const azulFondo = '#f0f7ff';

            // Logo del Ministerio - intentar desde assets local primero
            let logoPath = path.join(__dirname, '..', 'assets', 'logo_ministerio.png');
            if (!fs.existsSync(logoPath)) {
                logoPath = path.join(__dirname, '..', '..', 'assets', 'logo_ministerio.png');
            }
            
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, 50, 30, { width: 100, height: 100 });
            }

            // Encabezado mejorado
            doc.fontSize(16)
                .fillColor(azulOscuro)
                .font('Helvetica-Bold')
                .text('MINISTERIO DE LAS CULTURAS, LAS ARTES Y EL', 160, 35, { align: 'left' });
            
            doc.fontSize(16)
                .text('PATRIMONIO', 160, 52, { align: 'left' });

            doc.fontSize(10)
                .fillColor(gris)
                .font('Helvetica')
                .text('Gobierno de Chile', 160, 72);

            // Número de solicitud destacado
            doc.fontSize(10)
                .fillColor(azulClaro)
                .font('Helvetica-Bold')
                .text(`Solicitud N° ${solicitud.id_numerico || solicitud.id}`, 450, 35, { align: 'right' });

            doc.fontSize(14)
                .fillColor(azulClaro)
                .font('Helvetica-Bold')
                .text('CÁLCULO DE ASIGNACIÓN MATERNAL RETROACTIVA', 50, 110, { align: 'center' });

            // Línea divisoria más gruesa
            doc.lineWidth(2);
            doc.moveTo(50, 135).lineTo(562, 135).stroke(azulOscuro);
            doc.lineWidth(1);

            let y = 140;

            // Función helper para secciones
            const seccion = (titulo) => {
                doc.fontSize(11)
                    .fillColor(azulOscuro)
                    .font('Helvetica-Bold')
                    .text(titulo, 50, y);
                y += 5;
                doc.moveTo(50, y).lineTo(250, y).stroke(azulClaro);
                y += 10;
            };

            // Función helper para campos
            const campo = (etiqueta, valor) => {
                doc.fontSize(9)
                    .fillColor(gris)
                    .font('Helvetica-Bold')
                    .text(etiqueta + ':', 50, y, { continued: true })
                    .font('Helvetica')
                    .fillColor('#000')
                    .text('  ' + (valor || 'N/A'));
                y += 15;
            };

            // Datos de la Funcionaria
            seccion('DATOS DE LA FUNCIONARIA');
            campo('Nombre', solicitud.nombre_completo);
            campo('RUT', formatearRut(solicitud.rut_funcionaria));
            campo('Departamento/Unidad', solicitud.departamento_unidad);
            campo('Correo Institucional', solicitud.correo_electronico);
            campo('Teléfono', solicitud.telefono || 'No registrado');

            y += 10;

            // Período de Embarazo
            seccion('PERÍODO DE EMBARAZO');
            campo('Fecha Inicio Embarazo', formatearFecha(solicitud.fecha_inicio_embarazo));
            campo('Fecha Nacimiento', solicitud.fecha_nacimiento ? formatearFecha(solicitud.fecha_nacimiento) : 'Aún en embarazo');
            campo('Fecha Ingreso Solicitud', formatearFecha(solicitud.fecha_ingreso_solicitud));

            y += 10;

            // Datos Económicos
            seccion('DATOS ECONÓMICOS');
            campo('Sueldo Bruto Mensual', formatearMoneda(solicitud.sueldo_bruto_mensual));
            campo('Tramo de Ingresos', `Tramo ${solicitud.tramo_asignacion}`);
            campo('Monto Mensual Asignación', formatearMoneda(solicitud.monto_mensual_asignacion));

            y += 10;

            // Cálculo de Retroactividad
            seccion('CÁLCULO DE RETROACTIVIDAD');
            campo('Cantidad Meses Retroactivos', `${solicitud.meses_retroactivos} meses`);
            campo('Monto Retroactivo Total', formatearMoneda(solicitud.monto_total_retroactivo));

            if (solicitud.meses_futuros > 0) {
                campo('Meses Futuros Pendientes', `${solicitud.meses_futuros} meses`);
                campo('Monto Futuro Total', formatearMoneda(solicitud.monto_total_futuro));
            }

            y += 10;

            // Desglose Mensual
            const desglose = typeof solicitud.desglose_mensual === 'string'
                ? JSON.parse(solicitud.desglose_mensual)
                : solicitud.desglose_mensual;

            if (desglose && desglose.length > 0) {
                seccion('DESGLOSE MENSUAL');

                // Tabla de desglose
                const colMes = 50;
                const colMonto = 200;

                doc.fontSize(9)
                    .fillColor(azulOscuro)
                    .font('Helvetica-Bold');
                doc.text('Mes/Año', colMes, y);
                doc.text('Monto', colMonto, y);
                y += 5;
                doc.moveTo(50, y).lineTo(300, y).stroke(gris);
                y += 8;

                doc.font('Helvetica').fillColor('#000');
                desglose.forEach((item, index) => {
                    if (y > 650) {
                        doc.addPage();
                        y = 50;
                    }
                    doc.text(item.mesAño, colMes, y);
                    doc.text(formatearMoneda(item.monto), colMonto, y);
                    y += 12;
                });

                y += 5;
                doc.moveTo(50, y).lineTo(300, y).stroke(gris);
                y += 8;
                doc.font('Helvetica-Bold');
                doc.text('SUBTOTAL', colMes, y);
                doc.text(formatearMoneda(solicitud.monto_total_retroactivo + solicitud.monto_total_futuro), colMonto, y);
            }

            y += 20;

            // Resumen Financiero
            if (y > 600) {
                doc.addPage();
                y = 50;
            }

            // Cuadro de resumen
            doc.rect(50, y, 512, 80)
                .fillAndStroke('#f7fafc', azulOscuro);

            doc.fontSize(12)
                .fillColor(azulOscuro)
                .font('Helvetica-Bold')
                .text('RESUMEN FINANCIERO', 60, y + 10);

            doc.fontSize(10)
                .fillColor(gris)
                .font('Helvetica');
            doc.text(`Monto Total Retroactivo: ${formatearMoneda(solicitud.monto_total_retroactivo)}`, 60, y + 30);
            doc.text(`Monto Total Futuro: ${solicitud.monto_total_futuro > 0 ? formatearMoneda(solicitud.monto_total_futuro) : 'N/A'}`, 60, y + 45);

            doc.fontSize(12)
                .fillColor(azulOscuro)
                .font('Helvetica-Bold')
                .text(`MONTO TOTAL A PAGAR: ${formatearMoneda(solicitud.monto_total_pagable)}`, 60, y + 65);

            y += 100;

            // Estado de la Solicitud
            seccion('ESTADO DE LA SOLICITUD');
            campo('Estado Actual', solicitud.estado_solicitud);
            campo('Fecha de Aprobación', solicitud.fecha_aprobacion ? formatearFecha(solicitud.fecha_aprobacion) : 'Pendiente');
            if (solicitud.observaciones) {
                campo('Observaciones', solicitud.observaciones);
            }

            y += 20;

            // Datos del funcionario que generó el documento
            if (usuario) {
                if (y > 650) {
                    doc.addPage();
                    y = 50;
                }
                
                doc.fontSize(10)
                    .fillColor(azulOscuro)
                    .font('Helvetica-Bold')
                    .text('DOCUMENTO GENERADO POR:', 50, y);
                y += 15;
                
                doc.fontSize(9)
                    .fillColor(gris)
                    .font('Helvetica');
                doc.text(`Funcionario: ${usuario.nombre || 'N/A'}`, 50, y);
                y += 12;
                doc.text(`RUT: ${usuario.rut || 'N/A'}`, 50, y);
                y += 12;
                doc.text(`Cargo: ${usuario.cargo || 'N/A'}`, 50, y);
                y += 12;
                doc.text(`Departamento: ${usuario.departamento || 'N/A'}`, 50, y);
                y += 20;
            }

            // Pie de página
            const fechaGeneracion = new Date().toLocaleString('es-CL', { 
                dateStyle: 'long', 
                timeStyle: 'short' 
            });
            doc.fontSize(8)
                .fillColor(gris)
                .font('Helvetica')
                .text(`Documento generado el: ${fechaGeneracion}`, 50, 720);
            doc.text(`Solicitud N° ${solicitud.id_numerico || solicitud.id}`, 50, 730);
            doc.text('Sistema de Asignaciones 1.0 - Ministerio de las Culturas', 280, 730);

            doc.end();

            stream.on('finish', () => resolve(outputPath));
            stream.on('error', reject);

        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Formatea una fecha al formato chileno
 */
function formatearFecha(fecha) {
    if (!fecha) return 'N/A';
    const d = new Date(fecha);
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
}

/**
 * Normaliza un RUT eliminando ceros iniciales
 * @param {string} rut 
 * @returns {string} - RUT sin ceros iniciales
 */
function normalizarRut(rut) {
    if (!rut) return '';
    const rutLimpio = rut.replace(/\./g, '').replace(/-/g, '').trim().toUpperCase();
    const cuerpo = rutLimpio.slice(0, -1);
    const dv = rutLimpio.slice(-1);
    
    // Eliminar ceros iniciales del cuerpo
    const cuerpoSinCeros = cuerpo.replace(/^0+/, '');
    
    return cuerpoSinCeros + dv;
}

/**
 * Formatea un RUT al formato XX.XXX.XXX-X (sin ceros iniciales)
 * @param {string} rut 
 * @returns {string}
 */
function formatearRut(rut) {
    // Primero normalizar eliminando ceros iniciales
    const rutNormalizado = normalizarRut(rut);
    const cuerpo = rutNormalizado.slice(0, -1);
    const dv = rutNormalizado.slice(-1);

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

module.exports = {
    generarFichaIndividualPDF,
    formatearFecha,
    normalizarRut,
    formatearRut
};
