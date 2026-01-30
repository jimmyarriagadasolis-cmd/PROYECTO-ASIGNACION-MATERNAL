/**
 * Servicio de Correo Electrónico
 * Ministerio de las Culturas, las Artes y el Patrimonio - Chile
 */

const nodemailer = require('nodemailer');
const db = require('../database');
const path = require('path');

/**
 * Obtiene la configuración SMTP de la base de datos
 */
function obtenerConfigSMTP() {
    const config = {};
    const rows = db.prepare('SELECT clave, valor FROM Configuracion WHERE clave LIKE ?').all('smtp%');
    rows.forEach(row => {
        config[row.clave] = row.valor;
    });
    return {
        host: config.smtp_host || '',
        port: parseInt(config.smtp_port) || 587,
        user: config.smtp_user || '',
        pass: config.smtp_pass || ''
    };
}

/**
 * Crea el transporter de nodemailer
 */
function crearTransporter() {
    const smtpConfig = obtenerConfigSMTP();

    if (!smtpConfig.host || !smtpConfig.user) {
        return null; // SMTP no configurado
    }

    return nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.port === 465,
        auth: {
            user: smtpConfig.user,
            pass: smtpConfig.pass
        }
    });
}

/**
 * Envía un correo con la ficha individual
 * @param {object} solicitud - Datos de la solicitud
 * @param {string} pdfPath - Ruta al PDF generado
 * @param {Array} destinatarios - Lista de correos
 */
async function enviarFichaIndividual(solicitud, pdfPath, destinatarios) {
    const transporter = crearTransporter();

    if (!transporter) {
        // Registrar como pendiente si SMTP no está configurado
        registrarEnvioCorreo(solicitud.id_solicitud, 'ficha_individual', destinatarios.join(', '),
            'Ficha de Asignación Maternal', 'pendiente', 'SMTP no configurado');
        return { success: false, error: 'El servidor de correo no está configurado' };
    }

    const nombreInstitucion = db.prepare('SELECT valor FROM Configuracion WHERE clave = ?')
        .get('nombre_institucion')?.valor || 'Ministerio de las Culturas';

    const mailOptions = {
        from: `"${nombreInstitucion}" <${obtenerConfigSMTP().user}>`,
        to: destinatarios.join(', '),
        subject: `Ficha de Asignación Maternal - ${solicitud.nombre_completo}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #1a365d; color: white; padding: 20px; text-align: center;">
                    <h2 style="margin: 0;">${nombreInstitucion}</h2>
                    <p style="margin: 5px 0 0 0;">Gobierno de Chile</p>
                </div>
                
                <div style="padding: 20px; border: 1px solid #e2e8f0;">
                    <h3 style="color: #1a365d;">Ficha de Asignación Maternal</h3>
                    
                    <p>Estimado/a,</p>
                    
                    <p>Se adjunta la ficha de cálculo de asignación maternal correspondiente a:</p>
                    
                    <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                        <tr style="background-color: #f7fafc;">
                            <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Funcionaria:</strong></td>
                            <td style="padding: 10px; border: 1px solid #e2e8f0;">${solicitud.nombre_completo}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>RUT:</strong></td>
                            <td style="padding: 10px; border: 1px solid #e2e8f0;">${solicitud.rut_funcionaria}</td>
                        </tr>
                        <tr style="background-color: #f7fafc;">
                            <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Departamento:</strong></td>
                            <td style="padding: 10px; border: 1px solid #e2e8f0;">${solicitud.departamento_unidad}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Estado:</strong></td>
                            <td style="padding: 10px; border: 1px solid #e2e8f0;">${solicitud.estado_solicitud}</td>
                        </tr>
                        <tr style="background-color: #edf2f7;">
                            <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Monto Total:</strong></td>
                            <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 18px; color: #1a365d;">
                                <strong>$${solicitud.monto_total_pagable?.toLocaleString('es-CL') || 0}</strong>
                            </td>
                        </tr>
                    </table>
                    
                    <p>Para más detalles, revise el documento PDF adjunto.</p>
                    
                    <p style="color: #718096; font-size: 12px; margin-top: 30px;">
                        Este es un mensaje automático generado por el Sistema de Gestión de Asignación Maternal.<br>
                        Por favor no responda a este correo.
                    </p>
                </div>
                
                <div style="background-color: #f7fafc; padding: 15px; text-align: center; font-size: 12px; color: #718096;">
                    <p style="margin: 0;">${nombreInstitucion}</p>
                    <p style="margin: 5px 0 0 0;">Sistema de Gestión de Asignación Maternal</p>
                </div>
            </div>
        `,
        attachments: [
            {
                filename: `Ficha_Asignacion_${solicitud.rut_funcionaria.replace(/\./g, '')}.pdf`,
                path: pdfPath
            }
        ]
    };

    try {
        await transporter.sendMail(mailOptions);
        registrarEnvioCorreo(solicitud.id_solicitud, 'ficha_individual', destinatarios.join(', '),
            mailOptions.subject, 'enviado');
        return { success: true, message: 'Correo enviado exitosamente' };
    } catch (error) {
        registrarEnvioCorreo(solicitud.id_solicitud, 'ficha_individual', destinatarios.join(', '),
            mailOptions.subject, 'fallido', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Envía el reporte consolidado a jefatura
 * @param {string} excelPath - Ruta al Excel generado
 * @param {Array} destinatarios - Lista de correos de jefatura
 * @param {object} resumen - Datos del resumen
 */
async function enviarReporteConsolidado(excelPath, destinatarios, resumen) {
    const transporter = crearTransporter();

    if (!transporter) {
        registrarEnvioCorreo(null, 'reporte_consolidado', destinatarios.join(', '),
            'Reporte Consolidado', 'pendiente', 'SMTP no configurado');
        return { success: false, error: 'El servidor de correo no está configurado' };
    }

    const nombreInstitucion = db.prepare('SELECT valor FROM Configuracion WHERE clave = ?')
        .get('nombre_institucion')?.valor || 'Ministerio de las Culturas';

    const fechaActual = new Date().toLocaleDateString('es-CL');

    const mailOptions = {
        from: `"${nombreInstitucion}" <${obtenerConfigSMTP().user}>`,
        to: destinatarios.join(', '),
        subject: `Reporte Consolidado de Asignación Maternal - ${fechaActual}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #1a365d; color: white; padding: 20px; text-align: center;">
                    <h2 style="margin: 0;">${nombreInstitucion}</h2>
                    <p style="margin: 5px 0 0 0;">Reporte Consolidado de Asignación Maternal</p>
                </div>
                
                <div style="padding: 20px; border: 1px solid #e2e8f0;">
                    <h3 style="color: #1a365d;">Resumen Ejecutivo - ${fechaActual}</h3>
                    
                    <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                        <tr style="background-color: #1a365d; color: white;">
                            <th style="padding: 12px; text-align: left;">Indicador</th>
                            <th style="padding: 12px; text-align: right;">Valor</th>
                        </tr>
                        <tr style="background-color: #f7fafc;">
                            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Total de solicitudes</td>
                            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${resumen.totalSolicitudes || 0}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Solicitudes aprobadas</td>
                            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${resumen.aprobadas || 0}</td>
                        </tr>
                        <tr style="background-color: #f7fafc;">
                            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Solicitudes pendientes</td>
                            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${resumen.pendientes || 0}</td>
                        </tr>
                        <tr style="background-color: #edf2f7; font-weight: bold;">
                            <td style="padding: 12px; border-bottom: 2px solid #1a365d;">Monto Total Acumulado</td>
                            <td style="padding: 12px; border-bottom: 2px solid #1a365d; text-align: right; font-size: 16px; color: #1a365d;">
                                $${resumen.montoTotal?.toLocaleString('es-CL') || 0}
                            </td>
                        </tr>
                    </table>
                    
                    <p>Se adjunta el archivo Excel con el detalle completo de todas las solicitudes.</p>
                </div>
                
                <div style="background-color: #f7fafc; padding: 15px; text-align: center; font-size: 12px; color: #718096;">
                    <p style="margin: 0;">Mensaje automático - Sistema de Gestión de Asignación Maternal</p>
                </div>
            </div>
        `,
        attachments: [
            {
                filename: `Reporte_Consolidado_${fechaActual.replace(/\//g, '-')}.xlsx`,
                path: excelPath
            }
        ]
    };

    try {
        await transporter.sendMail(mailOptions);
        registrarEnvioCorreo(null, 'reporte_consolidado', destinatarios.join(', '),
            mailOptions.subject, 'enviado');
        return { success: true, message: 'Reporte enviado exitosamente' };
    } catch (error) {
        registrarEnvioCorreo(null, 'reporte_consolidado', destinatarios.join(', '),
            mailOptions.subject, 'fallido', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Registra el envío de correo en la base de datos
 */
function registrarEnvioCorreo(solicitudId, tipo, destinatarios, asunto, estado, error = null) {
    db.prepare(`
        INSERT INTO Historial_Correos (solicitud_id, tipo_correo, destinatarios, asunto, estado, error_mensaje)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(solicitudId, tipo, destinatarios, asunto, estado, error);
}

/**
 * Obtiene el historial de correos enviados
 */
function obtenerHistorialCorreos(filtros = {}) {
    let query = 'SELECT * FROM Historial_Correos WHERE 1=1';
    const params = [];

    if (filtros.solicitud_id) {
        query += ' AND solicitud_id = ?';
        params.push(filtros.solicitud_id);
    }

    if (filtros.tipo) {
        query += ' AND tipo_correo = ?';
        params.push(filtros.tipo);
    }

    if (filtros.estado) {
        query += ' AND estado = ?';
        params.push(filtros.estado);
    }

    query += ' ORDER BY fecha_envio DESC LIMIT 100';

    return db.prepare(query).all(params);
}

/**
 * Verifica si el SMTP está configurado
 */
function verificarConfiguracionSMTP() {
    const config = obtenerConfigSMTP();
    return {
        configurado: !!(config.host && config.user && config.pass),
        host: config.host,
        port: config.port,
        user: config.user ? config.user.substring(0, 5) + '...' : ''
    };
}

module.exports = {
    enviarFichaIndividual,
    enviarReporteConsolidado,
    obtenerHistorialCorreos,
    verificarConfiguracionSMTP,
    obtenerConfigSMTP
};
