/**
 * Sistema de Asignación Maternal - JavaScript Principal
 * Ministerio de las Culturas, las Artes y el Patrimonio - Chile
 */

// Estado de la aplicación
const state = {
    usuario: null,
    token: null,
    solicitudActual: null,
    solicitudes: []
};

const API_URL = '/api';

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNavigation();
    initForms();
    initModals();
    checkAuth();
});

// === TEMA ===
function initTheme() {
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);

    document.getElementById('btnTheme').addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
    });
}

// === NAVEGACIÓN ===
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            navigateTo(section);
        });
    });

    // Toggle sidebar en móvil
    document.getElementById('menuToggle').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
    });
}

function navigateTo(section) {
    // Actualizar navegación
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelector(`[data-section="${section}"]`).classList.add('active');

    // Mostrar sección
    document.querySelectorAll('.content-section').forEach(el => el.classList.remove('active'));
    document.getElementById(`section-${section}`).classList.add('active');

    // Actualizar título
    const titles = {
        'dashboard': 'Dashboard',
        'nueva-solicitud': 'Nueva Solicitud',
        'listado': 'Listado de Solicitudes',
        'reportes': 'Reportes',
        'configuracion': 'Configuración'
    };
    document.getElementById('pageTitle').textContent = titles[section] || section;

    // Cargar datos según sección
    if (section === 'dashboard') loadDashboard();
    if (section === 'listado') loadSolicitudes();
    if (section === 'reportes') loadHistorialCorreos();
    if (section === 'configuracion') loadConfiguracion();
    if (section === 'nueva-solicitud') loadDepartamentos();

    // Cerrar sidebar en móvil
    document.getElementById('sidebar').classList.remove('open');
}

// === AUTENTICACIÓN ===
function checkAuth() {
    const token = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');

    if (token && usuario) {
        state.token = token;
        state.usuario = usuario;
        hideLogin();
        updateUserInfo();
        loadDashboard();
    } else {
        showLogin();
    }
}

function showLogin() {
    document.getElementById('modalLogin').classList.add('active');
}

function hideLogin() {
    document.getElementById('modalLogin').classList.remove('active');
}

function updateUserInfo() {
    document.getElementById('userName').textContent = state.usuario.nombre_completo || state.usuario.username;
    document.getElementById('userRole').textContent = state.usuario.rol;
}

// === FORMULARIOS ===
function initForms() {
    // Login
    document.getElementById('formLogin').addEventListener('submit', handleLogin);

    // Logout
    document.getElementById('btnLogout').addEventListener('click', handleLogout);

    // Nueva solicitud
    document.getElementById('formSolicitud').addEventListener('submit', handleSubmitSolicitud);
    document.getElementById('btnCalcularPreview').addEventListener('click', calcularPreview);

    // RUT formatter
    document.getElementById('rut').addEventListener('input', formatRutInput);

    // Fecha ingreso por defecto: hoy
    document.getElementById('fechaIngresoSolicitud').valueAsDate = new Date();

    // Listado
    document.getElementById('btnBuscar').addEventListener('click', loadSolicitudes);
    document.getElementById('filtroEstado').addEventListener('change', loadSolicitudes);
    document.getElementById('btnExportarExcel').addEventListener('click', () => {
        window.location.href = `${API_URL}/reportes/consolidado?${getFilterParams()}`
    });

    // Reportes
    document.getElementById('btnGenerarFicha').addEventListener('click', generarFichaIndividual);
    document.getElementById('btnGenerarConsolidado').addEventListener('click', () => {
        window.location.href = `${API_URL}/reportes/consolidado`;
    });
    document.getElementById('btnEnviarJefatura').addEventListener('click', enviarReporteJefatura);

    // Configuración
    document.getElementById('formTramos').addEventListener('submit', guardarTramos);
    document.getElementById('formSMTP').addEventListener('submit', guardarSMTP);
}

async function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_URL}/usuarios/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            state.token = data.data.token;
            state.usuario = data.data.usuario;
            localStorage.setItem('token', state.token);
            localStorage.setItem('usuario', JSON.stringify(state.usuario));
            hideLogin();
            updateUserInfo();
            loadDashboard();
            showToast('Bienvenido al sistema', 'success');
        } else {
            showToast(data.error || 'Error de autenticación', 'error');
        }
    } catch (error) {
        showToast('Error de conexión', 'error');
        console.error(error);
    }
}

function handleLogout() {
    state.token = null;
    state.usuario = null;
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    showLogin();
    showToast('Sesión cerrada', 'info');
}

function formatRutInput(e) {
    let value = e.target.value.replace(/[^0-9kK]/g, '').toUpperCase();
    if (value.length > 1) {
        const dv = value.slice(-1);
        let body = value.slice(0, -1);
        body = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        value = body + '-' + dv;
    }
    e.target.value = value;
}

async function calcularPreview() {
    const form = document.getElementById('formSolicitud');
    const formData = new FormData(form);

    const datos = {
        fecha_inicio_embarazo: formData.get('fecha_inicio_embarazo'),
        fecha_nacimiento: formData.get('fecha_nacimiento') || null,
        fecha_ingreso_solicitud: formData.get('fecha_ingreso_solicitud'),
        sueldo_bruto_mensual: formData.get('sueldo_bruto_mensual')
    };

    if (!datos.fecha_inicio_embarazo || !datos.fecha_ingreso_solicitud || !datos.sueldo_bruto_mensual) {
        showToast('Complete fechas y sueldo para calcular', 'warning');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/solicitudes/calcular-preview`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });

        const data = await response.json();

        if (data.success) {
            mostrarPreviewCalculo(data.data);
        } else {
            showToast(data.error || 'Error en el cálculo', 'error');
        }
    } catch (error) {
        showToast('Error de conexión', 'error');
        console.error(error);
    }
}

function mostrarPreviewCalculo(calculo) {
    const preview = document.getElementById('previewCalculo');
    preview.style.display = 'block';

    document.getElementById('previewTramo').textContent = `Tramo ${calculo.tramo}`;
    document.getElementById('previewMontoMensual').textContent = formatMoney(calculo.montoMensual);
    document.getElementById('previewMesesRetro').textContent = `${calculo.mesesRetroactivos} meses`;
    document.getElementById('previewTotalRetro').textContent = formatMoney(calculo.montoTotalRetroactivo);
    document.getElementById('previewMesesFuturo').textContent = `${calculo.mesesFuturos || 0} meses`;
    document.getElementById('previewTotalFuturo').textContent = formatMoney(calculo.montoTotalFuturo || 0);
    document.getElementById('previewTotalPagar').textContent = formatMoney(calculo.montoTotalPagable);

    const alertas = document.getElementById('alertasCalculo');
    alertas.innerHTML = '';

    if (!calculo.tieneDerechos) {
        alertas.innerHTML = '<div class="alerta danger">⚠️ ' + calculo.mensaje + '</div>';
    }

    if (calculo.validacionPlazo && !calculo.validacionPlazo.valido) {
        alertas.innerHTML += '<div class="alerta warning">⚠️ ' + calculo.validacionPlazo.mensaje + '</div>';
    }
}

async function handleSubmitSolicitud(e) {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);
    const datos = Object.fromEntries(formData);
    datos.usuario_id = state.usuario?.id || 1;

    try {
        const response = await fetch(`${API_URL}/solicitudes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });

        const data = await response.json();

        if (data.success) {
            showToast('Solicitud creada exitosamente', 'success');
            form.reset();
            document.getElementById('previewCalculo').style.display = 'none';
            document.getElementById('fechaIngresoSolicitud').valueAsDate = new Date();
            navigateTo('listado');
        } else {
            if (data.errores) {
                data.errores.forEach(err => {
                    showToast(`${err.campo}: ${err.mensaje}`, 'error');
                });
            } else {
                showToast(data.error || 'Error al crear solicitud', 'error');
            }
        }
    } catch (error) {
        showToast('Error de conexión', 'error');
        console.error(error);
    }
}

// === DASHBOARD ===
async function loadDashboard() {
    try {
        const response = await fetch(`${API_URL}/solicitudes/estadisticas`);
        const data = await response.json();

        if (data.success) {
            const stats = data.data;

            // Actualizar tarjetas
            document.getElementById('totalSolicitudes').textContent = stats.totales.total_solicitudes || 0;
            document.getElementById('montoTotal').textContent = formatMoney(stats.totales.monto_total_acumulado || 0);

            const aprobadas = stats.porEstado.find(e => e.estado_solicitud === 'Aprobada');
            document.getElementById('solicitudesAprobadas').textContent = aprobadas?.cantidad || 0;

            const pendientes = stats.porEstado.filter(e =>
                e.estado_solicitud === 'Ingresada' || e.estado_solicitud === 'En Revisión'
            );
            document.getElementById('solicitudesPendientes').textContent =
                pendientes.reduce((sum, p) => sum + p.cantidad, 0);

            // Gráficos
            renderChartEstados(stats.porEstado);
            renderChartDepartamentos(stats.porDepartamento);
            loadActividadReciente();
        }
    } catch (error) {
        console.error('Error al cargar dashboard:', error);
    }
}

function renderChartEstados(porEstado) {
    const container = document.getElementById('chartEstados');
    const total = porEstado.reduce((sum, e) => sum + e.cantidad, 0) || 1;

    const colores = {
        'Ingresada': 'info',
        'En Revisión': 'warning',
        'Aprobada': 'success',
        'Pagada': 'primary',
        'Rechazada': 'danger'
    };

    container.innerHTML = porEstado.map(estado => `
        <div class="chart-bar">
            <span class="chart-bar-label">${estado.estado_solicitud}</span>
            <div class="chart-bar-track">
                <div class="chart-bar-fill ${colores[estado.estado_solicitud] || 'primary'}" 
                     style="width: ${(estado.cantidad / total * 100)}%">
                    ${estado.cantidad}
                </div>
            </div>
        </div>
    `).join('');
}

function renderChartDepartamentos(porDepartamento) {
    const container = document.getElementById('chartDepartamentos');
    const max = Math.max(...porDepartamento.map(d => d.cantidad)) || 1;

    container.innerHTML = porDepartamento.slice(0, 5).map((dept, i) => `
        <div class="chart-bar">
            <span class="chart-bar-label" title="${dept.departamento_unidad}">
                ${dept.departamento_unidad.substring(0, 15)}...
            </span>
            <div class="chart-bar-track">
                <div class="chart-bar-fill primary" style="width: ${(dept.cantidad / max * 100)}%">
                    ${dept.cantidad}
                </div>
            </div>
        </div>
    `).join('');
}

async function loadActividadReciente() {
    try {
        const response = await fetch(`${API_URL}/solicitudes?limit=5`);
        const data = await response.json();

        if (data.success) {
            const container = document.getElementById('actividadReciente');
            container.innerHTML = data.data.slice(0, 5).map(sol => `
                <div class="activity-item" style="display: flex; justify-content: space-between; padding: 12px; border-bottom: 1px solid var(--border-color);">
                    <div>
                        <strong>${sol.nombre_completo}</strong>
                        <span style="color: var(--text-muted); margin-left: 8px;">${sol.departamento_unidad}</span>
                    </div>
                    <div>
                        <span class="badge badge-${sol.estado_solicitud.toLowerCase().replace(' ', '-')}">${sol.estado_solicitud}</span>
                        <span style="color: var(--text-muted); margin-left: 8px;">${formatMoney(sol.monto_total_pagable)}</span>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error al cargar actividad:', error);
    }
}

// === LISTADO ===
function getFilterParams() {
    const estado = document.getElementById('filtroEstado').value;
    const busqueda = document.getElementById('filtroBusqueda').value;
    const params = new URLSearchParams();
    if (estado) params.append('estado', estado);
    if (busqueda) params.append('busqueda', busqueda);
    return params.toString();
}

async function loadSolicitudes() {
    try {
        const estado = document.getElementById('filtroEstado').value;
        let url = `${API_URL}/solicitudes`;
        if (estado) url += `?estado=${estado}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
            state.solicitudes = data.data;
            renderSolicitudes(data.data);
        }
    } catch (error) {
        console.error('Error al cargar solicitudes:', error);
    }
}

function renderSolicitudes(solicitudes) {
    const busqueda = document.getElementById('filtroBusqueda').value.toLowerCase();

    if (busqueda) {
        solicitudes = solicitudes.filter(s =>
            s.nombre_completo.toLowerCase().includes(busqueda) ||
            s.rut_funcionaria.toLowerCase().includes(busqueda)
        );
    }

    const tbody = document.getElementById('tbodySolicitudes');

    if (solicitudes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 40px; color: var(--text-muted);">No hay solicitudes registradas</td></tr>';
        return;
    }

    tbody.innerHTML = solicitudes.map(sol => `
        <tr>
            <td>${sol.id_solicitud}</td>
            <td>${sol.rut_funcionaria}</td>
            <td>${sol.nombre_completo}</td>
            <td>${sol.departamento_unidad}</td>
            <td>Tramo ${sol.tramo_asignacion}</td>
            <td>${formatMoney(sol.monto_total_pagable)}</td>
            <td><span class="badge badge-${getEstadoClass(sol.estado_solicitud)}">${sol.estado_solicitud}</span></td>
            <td>${formatDate(sol.fecha_ingreso_solicitud)}</td>
            <td class="actions">
                <button class="btn-icon view" onclick="verDetalle(${sol.id_solicitud})" title="Ver detalle">👁️</button>
                <button class="btn-icon edit" onclick="descargarPDF(${sol.id_solicitud})" title="Descargar PDF">📄</button>
            </td>
        </tr>
    `).join('');
}

function getEstadoClass(estado) {
    const clases = {
        'Ingresada': 'ingresada',
        'En Revisión': 'revision',
        'Aprobada': 'aprobada',
        'Pagada': 'pagada',
        'Rechazada': 'rechazada'
    };
    return clases[estado] || 'ingresada';
}

// === MODALES ===
function initModals() {
    // Cerrar modales
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').classList.remove('active');
        });
    });

    // Cerrar al hacer clic fuera
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal && modal.id !== 'modalLogin') {
                modal.classList.remove('active');
            }
        });
    });

    // Acciones del modal de detalle
    document.getElementById('btnDescargarPDF').addEventListener('click', () => {
        if (state.solicitudActual) descargarPDF(state.solicitudActual.id_solicitud);
    });

    document.getElementById('btnAprobar').addEventListener('click', () => {
        if (state.solicitudActual) cambiarEstado(state.solicitudActual.id_solicitud, 'aprobar');
    });

    document.getElementById('btnRechazar').addEventListener('click', () => {
        if (state.solicitudActual) {
            const motivo = prompt('Ingrese el motivo del rechazo:');
            if (motivo) cambiarEstado(state.solicitudActual.id_solicitud, 'rechazar', motivo);
        }
    });

    document.getElementById('btnEnviarCorreo').addEventListener('click', () => {
        if (state.solicitudActual) enviarFichaPorCorreo(state.solicitudActual.id_solicitud);
    });
}

async function verDetalle(id) {
    try {
        const response = await fetch(`${API_URL}/solicitudes/${id}`);
        const data = await response.json();

        if (data.success) {
            state.solicitudActual = data.data;
            renderDetalle(data.data);
            document.getElementById('modalDetalle').classList.add('active');
        }
    } catch (error) {
        showToast('Error al cargar detalle', 'error');
    }
}

function renderDetalle(sol) {
    const body = document.getElementById('modalDetalleBody');

    body.innerHTML = `
        <div class="detalle-grid">
            <div class="detalle-section">
                <h4>Datos Personales</h4>
                <div class="detalle-item"><label>Nombre:</label><span>${sol.nombre_completo}</span></div>
                <div class="detalle-item"><label>RUT:</label><span>${sol.rut_funcionaria}</span></div>
                <div class="detalle-item"><label>Departamento:</label><span>${sol.departamento_unidad}</span></div>
                <div class="detalle-item"><label>Correo:</label><span>${sol.correo_electronico}</span></div>
                <div class="detalle-item"><label>Teléfono:</label><span>${sol.telefono || 'No registrado'}</span></div>
            </div>
            
            <div class="detalle-section">
                <h4>Datos del Embarazo</h4>
                <div class="detalle-item"><label>Inicio Embarazo:</label><span>${formatDate(sol.fecha_inicio_embarazo)}</span></div>
                <div class="detalle-item"><label>Nacimiento:</label><span>${sol.fecha_nacimiento ? formatDate(sol.fecha_nacimiento) : 'Aún en embarazo'}</span></div>
                <div class="detalle-item"><label>Ingreso Solicitud:</label><span>${formatDate(sol.fecha_ingreso_solicitud)}</span></div>
            </div>
            
            <div class="detalle-section">
                <h4>Datos Económicos</h4>
                <div class="detalle-item"><label>Sueldo Bruto:</label><span>${formatMoney(sol.sueldo_bruto_mensual)}</span></div>
                <div class="detalle-item"><label>Tramo:</label><span>Tramo ${sol.tramo_asignacion}</span></div>
                <div class="detalle-item"><label>Monto Mensual:</label><span>${formatMoney(sol.monto_mensual_asignacion)}</span></div>
            </div>
            
            <div class="detalle-section">
                <h4>Cálculo de Asignación</h4>
                <div class="detalle-item"><label>Meses Retroactivos:</label><span>${sol.meses_retroactivos} meses</span></div>
                <div class="detalle-item"><label>Monto Retroactivo:</label><span>${formatMoney(sol.monto_total_retroactivo)}</span></div>
                <div class="detalle-item"><label>Meses Futuros:</label><span>${sol.meses_futuros || 0} meses</span></div>
                <div class="detalle-item"><label>Monto Futuro:</label><span>${formatMoney(sol.monto_total_futuro || 0)}</span></div>
            </div>
            
            <div class="detalle-section full">
                <h4>Estado de la Solicitud</h4>
                <div class="detalle-item"><label>Estado:</label><span class="badge badge-${getEstadoClass(sol.estado_solicitud)}">${sol.estado_solicitud}</span></div>
                <div class="detalle-item"><label>Fecha Registro:</label><span>${formatDate(sol.fecha_registro)}</span></div>
                ${sol.fecha_aprobacion ? `<div class="detalle-item"><label>Fecha Aprobación:</label><span>${formatDate(sol.fecha_aprobacion)}</span></div>` : ''}
                ${sol.observaciones ? `<div class="detalle-item"><label>Observaciones:</label><span>${sol.observaciones}</span></div>` : ''}
            </div>
        </div>
        
        <div class="detalle-total">
            <label>MONTO TOTAL A PAGAR</label>
            <span>${formatMoney(sol.monto_total_pagable)}</span>
        </div>
    `;
}

async function cambiarEstado(id, accion, motivo = null) {
    try {
        const body = { usuario_id: state.usuario?.id || 1 };
        if (motivo) body.motivo = motivo;

        const response = await fetch(`${API_URL}/solicitudes/${id}/${accion}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (data.success) {
            showToast(`Solicitud ${accion === 'aprobar' ? 'aprobada' : 'rechazada'} exitosamente`, 'success');
            document.getElementById('modalDetalle').classList.remove('active');
            loadSolicitudes();
            loadDashboard();
        } else {
            showToast(data.error, 'error');
        }
    } catch (error) {
        showToast('Error al cambiar estado', 'error');
    }
}

// === REPORTES ===
function descargarPDF(id) {
    window.location.href = `${API_URL}/reportes/ficha/${id}`;
}

function generarFichaIndividual() {
    const id = document.getElementById('inputIdFicha').value;
    if (!id) {
        showToast('Ingrese el ID de la solicitud', 'warning');
        return;
    }
    descargarPDF(id);
}

async function enviarFichaPorCorreo(id) {
    const sol = state.solicitudActual;
    if (!sol) return;

    try {
        const response = await fetch(`${API_URL}/reportes/ficha/${id}/enviar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ destinatarios: [sol.correo_electronico] })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Correo enviado exitosamente', 'success');
        } else {
            showToast(data.error || 'Error al enviar correo', 'error');
        }
    } catch (error) {
        showToast('Error de conexión', 'error');
    }
}

async function enviarReporteJefatura() {
    const email = document.getElementById('inputEmailJefatura').value;
    if (!email) {
        showToast('Ingrese el correo de jefatura', 'warning');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/reportes/consolidado/enviar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ destinatarios: [email] })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Reporte enviado exitosamente', 'success');
        } else {
            showToast(data.error || 'Error al enviar reporte', 'error');
        }
    } catch (error) {
        showToast('Error de conexión', 'error');
    }
}

async function loadHistorialCorreos() {
    try {
        const response = await fetch(`${API_URL}/reportes/historial-correos`);
        const data = await response.json();

        if (data.success) {
            const tbody = document.getElementById('tbodyHistorialCorreos');
            tbody.innerHTML = data.data.map(correo => `
                <tr>
                    <td>${formatDate(correo.fecha_envio)}</td>
                    <td>${correo.tipo_correo}</td>
                    <td>${correo.destinatarios}</td>
                    <td>${correo.asunto}</td>
                    <td><span class="badge badge-${correo.estado === 'enviado' ? 'aprobada' : correo.estado === 'fallido' ? 'rechazada' : 'ingresada'}">${correo.estado}</span></td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error al cargar historial:', error);
    }
}

// === CONFIGURACIÓN ===
async function loadConfiguracion() {
    try {
        const response = await fetch(`${API_URL}/config/tramos`);
        const data = await response.json();

        if (data.success) {
            const tramos = data.data;
            document.getElementById('tramo1Limite').value = tramos.tramo1.limite;
            document.getElementById('tramo1Monto').value = tramos.tramo1.monto;
            document.getElementById('tramo2Limite').value = tramos.tramo2.limite;
            document.getElementById('tramo2Monto').value = tramos.tramo2.monto;
            document.getElementById('tramo3Limite').value = tramos.tramo3.limite;
            document.getElementById('tramo3Monto').value = tramos.tramo3.monto;
        }

        // Verificar SMTP
        const smtpResponse = await fetch(`${API_URL}/reportes/config-smtp`);
        const smtpData = await smtpResponse.json();

        const smtpStatus = document.getElementById('smtpStatus');
        if (smtpData.success && smtpData.data.configurado) {
            smtpStatus.innerHTML = '<p style="color: var(--success-600);">✓ SMTP configurado: ' + smtpData.data.host + '</p>';
        } else {
            smtpStatus.innerHTML = '<p style="color: var(--warning-600);">⚠️ SMTP no configurado</p>';
        }
    } catch (error) {
        console.error('Error al cargar configuración:', error);
    }
}

async function loadDepartamentos() {
    try {
        const response = await fetch(`${API_URL}/config/departamentos`);
        const data = await response.json();

        if (data.success) {
            const datalist = document.getElementById('departamentos');
            datalist.innerHTML = data.data.map(d => `<option value="${d}">`).join('');
        }
    } catch (error) {
        console.error('Error al cargar departamentos:', error);
    }
}

async function guardarTramos(e) {
    e.preventDefault();

    const tramos = {
        tramo1: {
            limite: document.getElementById('tramo1Limite').value,
            monto: document.getElementById('tramo1Monto').value
        },
        tramo2: {
            limite: document.getElementById('tramo2Limite').value,
            monto: document.getElementById('tramo2Monto').value
        },
        tramo3: {
            limite: document.getElementById('tramo3Limite').value,
            monto: document.getElementById('tramo3Monto').value
        }
    };

    try {
        const response = await fetch(`${API_URL}/config/tramos/actualizar`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tramos)
        });

        const data = await response.json();

        if (data.success) {
            showToast('Tramos actualizados exitosamente', 'success');
        } else {
            showToast(data.error, 'error');
        }
    } catch (error) {
        showToast('Error al guardar', 'error');
    }
}

async function guardarSMTP(e) {
    e.preventDefault();

    const config = {
        smtp_host: document.getElementById('smtpHost').value,
        smtp_port: document.getElementById('smtpPort').value,
        smtp_user: document.getElementById('smtpUser').value,
        smtp_pass: document.getElementById('smtpPass').value
    };

    try {
        for (const [clave, valor] of Object.entries(config)) {
            if (valor) {
                await fetch(`${API_URL}/config/${clave}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ valor })
                });
            }
        }

        showToast('Configuración SMTP guardada', 'success');
        loadConfiguracion();
    } catch (error) {
        showToast('Error al guardar', 'error');
    }
}

// === UTILIDADES ===
function formatMoney(amount) {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0
    }).format(amount || 0);
}

function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CL');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = { success: '✓', error: '✗', warning: '⚠', info: 'ℹ' };
    toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
