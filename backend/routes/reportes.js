/**
 * Rutas de Reportes
 * Ministerio de las Culturas, las Artes y el Patrimonio - Chile
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const db = require('../database');
const { generarFichaIndividualPDF } = require('../services/pdfGenerator');
const { generarInformeConsolidadoExcel } = require('../services/excelGenerator');
const { enviarFichaIndividual, enviarReporteConsolidado, obtenerHistorialCorreos, verificarConfiguracionSMTP } = require('../services/emailService');

const reportsDir = path.join(__dirname, '..', '..', 'reports');

/**
 * GET /api/reportes/ficha/:id
 * Generar y descargar ficha individual en PDF
 */
router.get('/ficha/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const solicitud = db.prepare('SELECT * FROM Solicitudes_Asignacion_Maternal WHERE id_solicitud = ?').get(id);

        if (!solicitud) {
            return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
        }

        const filename = `Ficha_${solicitud.rut_funcionaria.replace(/\./g, '')}_${Date.now()}.pdf`;
        const outputPath = path.join(reportsDir, filename);

        await generarFichaIndividualPDF(solicitud, outputPath);

        res.download(outputPath, filename, (err) => {
            if (err) console.error('Error al descargar:', err);
            // Opcional: eliminar después de descargar
            // fs.unlinkSync(outputPath);
        });
    } catch (error) {
        console.error('Error al generar ficha PDF:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/reportes/ficha/:id/enviar
 * Enviar ficha por correo
 */
router.post('/ficha/:id/enviar', async (req, res) => {
    try {
        const id = req.params.id;
        const { destinatarios } = req.body;

        const solicitud = db.prepare('SELECT * FROM Solicitudes_Asignacion_Maternal WHERE id_solicitud = ?').get(id);

        if (!solicitud) {
            return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
        }

        // Generar PDF
        const filename = `Ficha_${solicitud.rut_funcionaria.replace(/\./g, '')}_${Date.now()}.pdf`;
        const outputPath = path.join(reportsDir, filename);
        await generarFichaIndividualPDF(solicitud, outputPath);

        // Destinatarios por defecto: funcionaria + RRHH
        const emails = destinatarios || [solicitud.correo_electronico];

        const resultado = await enviarFichaIndividual(solicitud, outputPath, emails);

        res.json(resultado);
    } catch (error) {
        console.error('Error al enviar ficha:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/reportes/consolidado
 * Generar y descargar informe consolidado en Excel
 */
router.get('/consolidado', async (req, res) => {
    try {
        const { estado, departamento, fechaDesde, fechaHasta, busqueda } = req.query;

        let query = 'SELECT * FROM Solicitudes_Asignacion_Maternal WHERE 1=1';
        const params = [];

        if (estado) {
            query += ' AND estado_solicitud = ?';
            params.push(estado);
        }
        if (departamento) {
            query += ' AND departamento_unidad LIKE ?';
            params.push(`%${departamento}%`);
        }
        if (fechaDesde) {
            query += ' AND fecha_ingreso_solicitud >= ?';
            params.push(fechaDesde);
        }
        if (fechaHasta) {
            query += ' AND fecha_ingreso_solicitud <= ?';
            params.push(fechaHasta);
        }
        if (busqueda) {
            query += ' AND (nombre_completo LIKE ? OR rut_funcionaria LIKE ?)';
            params.push(`%${busqueda}%`, `%${busqueda}%`);
        }

        query += ' ORDER BY fecha_registro DESC';

        const solicitudes = db.prepare(query).all(params);

        // Asegurar que el directorio de reportes existe
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }

        const filename = `Informe_Consolidado_${new Date().toISOString().split('T')[0]}.xlsx`;
        const outputPath = path.join(reportsDir, filename);

        await generarInformeConsolidadoExcel(solicitudes, { estado, departamento, fechaDesde, fechaHasta }, outputPath);

        res.download(outputPath, filename);
    } catch (error) {
        console.error('Error al generar informe consolidado:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/reportes/consolidado/enviar
 * Enviar informe consolidado a jefatura
 */
router.post('/consolidado/enviar', async (req, res) => {
    try {
        const { destinatarios, filtros = {} } = req.body;

        if (!destinatarios || destinatarios.length === 0) {
            return res.status(400).json({ success: false, error: 'Se requieren destinatarios' });
        }

        // Obtener solicitudes
        const solicitudes = db.prepare('SELECT * FROM Solicitudes_Asignacion_Maternal ORDER BY fecha_registro DESC').all();

        // Generar Excel
        const filename = `Informe_Consolidado_${new Date().toISOString().split('T')[0]}.xlsx`;
        const outputPath = path.join(reportsDir, filename);
        await generarInformeConsolidadoExcel(solicitudes, filtros, outputPath);

        // Calcular resumen
        const resumen = {
            totalSolicitudes: solicitudes.length,
            aprobadas: solicitudes.filter(s => s.estado_solicitud === 'Aprobada').length,
            pendientes: solicitudes.filter(s => s.estado_solicitud === 'Ingresada' || s.estado_solicitud === 'En Revisión').length,
            montoTotal: solicitudes.reduce((sum, s) => sum + (s.monto_total_pagable || 0), 0)
        };

        const resultado = await enviarReporteConsolidado(outputPath, destinatarios, resumen);

        res.json(resultado);
    } catch (error) {
        console.error('Error al enviar informe consolidado:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/reportes/historial-correos
 * Obtener historial de correos enviados
 */
router.get('/historial-correos', (req, res) => {
    try {
        const historial = obtenerHistorialCorreos(req.query);
        res.json({ success: true, data: historial });
    } catch (error) {
        console.error('Error al obtener historial:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/reportes/config-smtp
 * Verificar configuración SMTP
 */
router.get('/config-smtp', (req, res) => {
    try {
        const config = verificarConfiguracionSMTP();
        res.json({ success: true, data: config });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
