/**
 * Rutas de Reportes - Versión Firestore
 * Ministerio de las Culturas, las Artes y el Patrimonio - Chile
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const os = require('os'); // Usaremos el directorio temporal del sistema operativo
const fs = require('fs');
const { db } = require('../database'); // Instancia de Firestore
const { generarFichaIndividualPDF } = require('../services/pdfGenerator');
const { generarInformeConsolidadoExcel } = require('../services/excelGenerator');
// Los servicios de emailService necesitarán ser adaptados si dependen de la BD
const { enviarFichaIndividual, enviarReporteConsolidado } = require('../services/emailService');

/**
 * GET /api/reportes/ficha/:id
 * Generar y descargar ficha individual en PDF desde Firestore
 */
router.get('/ficha/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const docRef = db.collection('Solicitudes_Asignacion_Maternal').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
        }
        const solicitud = { id: doc.id, ...doc.data() };

        const filename = `Ficha_${solicitud.rut_funcionaria.replace(/\./g, '')}_${Date.now()}.pdf`;
        // Usar el directorio temporal para guardar el archivo
        const outputPath = path.join(os.tmpdir(), filename);

        await generarFichaIndividualPDF(solicitud, outputPath);

        res.download(outputPath, filename, (err) => {
            if (err) console.error('Error al descargar:', err);
            // Limpiar el archivo temporal después de la descarga
            fs.unlinkSync(outputPath);
        });
    } catch (error) {
        console.error('Error al generar ficha PDF:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});

/**
 * POST /api/reportes/ficha/:id/enviar
 * Enviar ficha por correo desde Firestore
 */
router.post('/ficha/:id/enviar', async (req, res) => {
    try {
        const { id } = req.params;
        const { destinatarios } = req.body;
        
        const docRef = db.collection('Solicitudes_Asignacion_Maternal').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
        }
        const solicitud = { id: doc.id, ...doc.data() };
        
        const filename = `Ficha_${solicitud.rut_funcionaria.replace(/\./g, '')}_${Date.now()}.pdf`;
        const outputPath = path.join(os.tmpdir(), filename);
        await generarFichaIndividualPDF(solicitud, outputPath);

        const emails = destinatarios || [solicitud.correo_electronico];
        const resultado = await enviarFichaIndividual(solicitud, outputPath, emails);

        fs.unlinkSync(outputPath); // Limpiar el archivo temporal
        res.json(resultado);

    } catch (error) {
        console.error('Error al enviar ficha:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});

/**
 * GET /api/reportes/consolidado
 * Generar y descargar informe consolidado desde Firestore
 */
router.get('/consolidado', async (req, res) => {
    try {
        const { estado, departamento, fechaDesde, fechaHasta } = req.query;
        let query = db.collection('Solicitudes_Asignacion_Maternal');

        if (estado) query = query.where('estado_solicitud', '==', estado);
        if (departamento) query = query.where('departamento_unidad', '==', departamento);
        if (fechaDesde) query = query.where('fecha_ingreso_solicitud', '>=', fechaDesde);
        if (fechaHasta) query = query.where('fecha_ingreso_solicitud', '<=', fechaHasta);
        
        const snapshot = await query.orderBy('fecha_registro', 'desc').get();
        const solicitudes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const filename = `Informe_Consolidado_${new Date().toISOString().split('T')[0]}.xlsx`;
        const outputPath = path.join(os.tmpdir(), filename);

        await generarInformeConsolidadoExcel(solicitudes, { estado, departamento, fechaDesde, fechaHasta }, outputPath);

        res.download(outputPath, filename, (err) => {
            if (err) console.error('Error al descargar:', err);
            fs.unlinkSync(outputPath);
        });

    } catch (error) {
        console.error('Error al generar informe consolidado:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});

/**
 * POST /api/reportes/consolidado/enviar
 * Enviar informe consolidado desde Firestore
 */
router.post('/consolidado/enviar', async (req, res) => {
    try {
        const { destinatarios, filtros = {} } = req.body;

        if (!destinatarios || destinatarios.length === 0) {
            return res.status(400).json({ success: false, error: 'Se requieren destinatarios' });
        }

        const snapshot = await db.collection('Solicitudes_Asignacion_Maternal').orderBy('fecha_registro', 'desc').get();
        const solicitudes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const filename = `Informe_Consolidado_${new Date().toISOString().split('T')[0]}.xlsx`;
        const outputPath = path.join(os.tmpdir(), filename);
        await generarInformeConsolidadoExcel(solicitudes, filtros, outputPath);

        const resumen = {
            totalSolicitudes: solicitudes.length,
            aprobadas: solicitudes.filter(s => s.estado_solicitud === 'Aprobada').length,
            pendientes: solicitudes.filter(s => ['Ingresada', 'En Revisión'].includes(s.estado_solicitud)).length,
            montoTotal: solicitudes.reduce((sum, s) => sum + (s.monto_total_pagable || 0), 0)
        };

        const resultado = await enviarReporteConsolidado(outputPath, destinatarios, resumen);

        fs.unlinkSync(outputPath); // Limpiar
        res.json(resultado);

    } catch (error) {
        console.error('Error al enviar informe consolidado:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});

/**
 * GET /api/reportes/historial-correos
 * Obtener historial de correos desde Firestore
 */
router.get('/historial-correos', async (req, res) => {
    try {
        const snapshot = await db.collection('Historial_Correos').orderBy('fecha_envio', 'desc').limit(100).get();
        const historial = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json({ success: true, data: historial });
    } catch (error) {
        console.error('Error al obtener historial:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});


module.exports = router;
