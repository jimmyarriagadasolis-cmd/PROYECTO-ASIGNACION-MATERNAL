/**
 * Generador de Excel para Informes Consolidados - Firebase Cloud Functions
 * Ministerio de las Culturas, las Artes y el Patrimonio - Chile
 */

const ExcelJS = require("exceljs");
const { formatearMoneda } = require("./calculoAsignacion");

/**
 * Genera un Excel con el informe consolidado
 * @param {Array} solicitudes - Array de solicitudes
 * @param {object} filtros - Filtros aplicados
 * @param {string} outputPath - Ruta de salida (debe ser /tmp/ en Cloud Functions)
 */
async function generarInformeConsolidadoExcel(solicitudes, filtros, outputPath) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Sistema de Asignación Maternal";
    workbook.created = new Date();

    // Hoja 1: Resumen Ejecutivo
    const resumenSheet = workbook.addWorksheet("Resumen Ejecutivo", {
        properties: { tabColor: { argb: "1a365d" } },
    });
    await crearResumenEjecutivo(resumenSheet, solicitudes, filtros);

    // Hoja 2: Listado Detallado
    const listadoSheet = workbook.addWorksheet("Listado Detallado", {
        properties: { tabColor: { argb: "3182ce" } },
    });
    await crearListadoDetallado(listadoSheet, solicitudes);

    // Hoja 3: Por Departamento
    const deptSheet = workbook.addWorksheet("Por Departamento", {
        properties: { tabColor: { argb: "38a169" } },
    });
    await crearResumenPorDepartamento(deptSheet, solicitudes);

    await workbook.xlsx.writeFile(outputPath);
    return outputPath;
}

async function crearResumenEjecutivo(sheet, solicitudes, filtros) {
    const tituloStyle = {
        font: { bold: true, size: 16, color: { argb: "1a365d" } },
        alignment: { horizontal: "center" },
    };
    const subtituloStyle = {
        font: { bold: true, size: 12, color: { argb: "4a5568" } },
    };
    const headerStyle = {
        font: { bold: true, color: { argb: "FFFFFF" } },
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: "1a365d" } },
        alignment: { horizontal: "center" },
    };

    sheet.mergeCells("A1:F1");
    sheet.getCell("A1").value = "MINISTERIO DE LAS CULTURAS, LAS ARTES Y EL PATRIMONIO";
    sheet.getCell("A1").style = tituloStyle;

    sheet.mergeCells("A2:F2");
    sheet.getCell("A2").value = "RESUMEN EJECUTIVO - ASIGNACIÓN MATERNAL";
    sheet.getCell("A2").style = subtituloStyle;

    sheet.mergeCells("A3:F3");
    sheet.getCell("A3").value = `Generado: ${new Date().toLocaleString("es-CL")}`;
    sheet.getCell("A3").style = { font: { italic: true, color: { argb: "718096" } } };

    sheet.getCell("A5").value = "ESTADÍSTICAS GENERALES";
    sheet.getCell("A5").style = subtituloStyle;

    const totalSolicitudes = solicitudes.length;
    const montoTotalAcumulado = solicitudes.reduce((sum, s) => sum + (s.monto_total_pagable || 0), 0);
    const totalRetroactivos = solicitudes.reduce((sum, s) => sum + (s.monto_total_retroactivo || 0), 0);
    const totalFuturos = solicitudes.reduce((sum, s) => sum + (s.monto_total_futuro || 0), 0);

    const statsData = [
        ["Total de solicitudes registradas", totalSolicitudes],
        ["Monto total acumulado", formatearMoneda(montoTotalAcumulado)],
        ["Total retroactivos pendientes", formatearMoneda(totalRetroactivos)],
        ["Total futuros a pagar", formatearMoneda(totalFuturos)],
    ];

    let row = 6;
    statsData.forEach(([etiqueta, valor]) => {
        sheet.getCell(`A${row}`).value = etiqueta;
        sheet.getCell(`B${row}`).value = valor;
        sheet.getCell(`A${row}`).style = { font: { bold: true } };
        row++;
    });

    row += 2;
    sheet.getCell(`A${row}`).value = "DESGLOSE POR ESTADO";
    sheet.getCell(`A${row}`).style = subtituloStyle;
    row++;

    const porEstado = {};
    solicitudes.forEach((s) => {
        if (!porEstado[s.estado_solicitud]) {
            porEstado[s.estado_solicitud] = { cantidad: 0, monto: 0 };
        }
        porEstado[s.estado_solicitud].cantidad++;
        porEstado[s.estado_solicitud].monto += s.monto_total_pagable || 0;
    });

    sheet.getCell(`A${row}`).value = "Estado";
    sheet.getCell(`B${row}`).value = "Cantidad";
    sheet.getCell(`C${row}`).value = "Monto Total";
    sheet.getRow(row).eachCell((cell) => cell.style = headerStyle);
    row++;

    Object.entries(porEstado).forEach(([estado, data]) => {
        sheet.getCell(`A${row}`).value = estado;
        sheet.getCell(`B${row}`).value = data.cantidad;
        sheet.getCell(`C${row}`).value = formatearMoneda(data.monto);
        row++;
    });

    sheet.columns = [
        { width: 35 }, { width: 20 }, { width: 20 },
        { width: 15 }, { width: 15 }, { width: 15 },
    ];
}

async function crearListadoDetallado(sheet, solicitudes) {
    const headers = [
        "ID", "RUT", "Nombre", "Departamento", "Tramo",
        "Monto Mensual", "Meses Retro.", "Monto Retro.",
        "Meses Fut.", "Monto Fut.", "Total", "Estado", "Fecha Solicitud",
    ];

    const headerRow = sheet.addRow(headers);
    headerRow.eachCell((cell) => {
        cell.style = {
            font: { bold: true, color: { argb: "FFFFFF" } },
            fill: { type: "pattern", pattern: "solid", fgColor: { argb: "1a365d" } },
            alignment: { horizontal: "center" },
            border: {
                top: { style: "thin" }, bottom: { style: "thin" },
                left: { style: "thin" }, right: { style: "thin" },
            },
        };
    });

    solicitudes.forEach((s) => {
        const row = sheet.addRow([
            s.id_solicitud || s.id,
            s.rut_funcionaria,
            s.nombre_completo,
            s.departamento_unidad,
            `Tramo ${s.tramo_asignacion}`,
            s.monto_mensual_asignacion,
            s.meses_retroactivos,
            s.monto_total_retroactivo,
            s.meses_futuros || 0,
            s.monto_total_futuro || 0,
            s.monto_total_pagable,
            s.estado_solicitud,
            s.fecha_ingreso_solicitud,
        ]);
        row.eachCell((cell) => {
            cell.border = {
                top: { style: "thin" }, bottom: { style: "thin" },
                left: { style: "thin" }, right: { style: "thin" },
            };
        });
    });

    const totalRow = sheet.addRow([
        "", "", "", "TOTALES", "",
        solicitudes.reduce((sum, s) => sum + (s.monto_mensual_asignacion || 0), 0),
        solicitudes.reduce((sum, s) => sum + (s.meses_retroactivos || 0), 0),
        solicitudes.reduce((sum, s) => sum + (s.monto_total_retroactivo || 0), 0),
        solicitudes.reduce((sum, s) => sum + (s.meses_futuros || 0), 0),
        solicitudes.reduce((sum, s) => sum + (s.monto_total_futuro || 0), 0),
        solicitudes.reduce((sum, s) => sum + (s.monto_total_pagable || 0), 0),
        `${solicitudes.length} solicitudes`,
        "",
    ]);
    totalRow.eachCell((cell) => {
        cell.style = {
            font: { bold: true },
            fill: { type: "pattern", pattern: "solid", fgColor: { argb: "e2e8f0" } },
            border: { top: { style: "medium" }, bottom: { style: "medium" } },
        };
    });

    [6, 8, 10, 11].forEach((col) => {
        sheet.getColumn(col).numFmt = "\"$\"#,##0";
    });

    sheet.columns = [
        { width: 8 }, { width: 15 }, { width: 30 }, { width: 25 },
        { width: 10 }, { width: 15 }, { width: 12 }, { width: 18 },
        { width: 12 }, { width: 15 }, { width: 18 }, { width: 15 }, { width: 15 },
    ];

    sheet.autoFilter = {
        from: "A1",
        to: `M${solicitudes.length + 1}`,
    };
}

async function crearResumenPorDepartamento(sheet, solicitudes) {
    const porDepartamento = {};
    solicitudes.forEach((s) => {
        const dept = s.departamento_unidad || "Sin Departamento";
        if (!porDepartamento[dept]) {
            porDepartamento[dept] = { cantidad: 0, monto: 0 };
        }
        porDepartamento[dept].cantidad++;
        porDepartamento[dept].monto += s.monto_total_pagable || 0;
    });

    sheet.mergeCells("A1:C1");
    sheet.getCell("A1").value = "RESUMEN POR DEPARTAMENTO";
    sheet.getCell("A1").style = {
        font: { bold: true, size: 14, color: { argb: "1a365d" } },
    };

    const headerRow = sheet.addRow(["Departamento/Unidad", "Cantidad", "Monto Total"]);
    headerRow.eachCell((cell) => {
        cell.style = {
            font: { bold: true, color: { argb: "FFFFFF" } },
            fill: { type: "pattern", pattern: "solid", fgColor: { argb: "38a169" } },
        };
    });

    const datosOrdenados = Object.entries(porDepartamento)
        .sort((a, b) => b[1].monto - a[1].monto);

    datosOrdenados.forEach(([dept, data]) => {
        sheet.addRow([dept, data.cantidad, data.monto]);
    });

    sheet.getColumn(3).numFmt = "\"$\"#,##0";
    sheet.columns = [{ width: 40 }, { width: 15 }, { width: 20 }];
}

module.exports = {
    generarInformeConsolidadoExcel,
};
