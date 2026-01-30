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
 */
function generarFichaIndividualPDF(solicitud, outputPath) {
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

            // Logo del Ministerio
            const logoPath = path.join(__dirname, '..', '..', 'assets', 'logo_ministerio.png');
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, 50, 30, { width: 80 });
            }

            // Encabezado
            doc.fontSize(14)
                .fillColor(azulOscuro)
                .font('Helvetica-Bold')
                .text('MINISTERIO DE LAS CULTURAS, LAS ARTES Y EL PATRIMONIO', 140, 40, { align: 'left' });

            doc.fontSize(10)
                .fillColor(gris)
                .font('Helvetica')
                .text('Gobierno de Chile', 140, 58);

            doc.fontSize(12)
                .fillColor(azulClaro)
                .font('Helvetica-Bold')
                .text('CÁLCULO DE ASIGNACIÓN MATERNAL RETROACTIVA', 50, 100, { align: 'center' });

            // Línea divisoria
            doc.moveTo(50, 120).lineTo(562, 120).stroke(azulOscuro);

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
            campo('RUT', solicitud.rut_funcionaria);
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

            // Pie de página
            const fechaGeneracion = new Date().toLocaleString('es-CL');
            doc.fontSize(8)
                .fillColor(gris)
                .font('Helvetica')
                .text(`Documento generado el: ${fechaGeneracion}`, 50, 720);
            doc.text(`ID Solicitud: ${solicitud.id_solicitud}`, 50, 730);
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

module.exports = {
    generarFichaIndividualPDF,
    formatearFecha
};
