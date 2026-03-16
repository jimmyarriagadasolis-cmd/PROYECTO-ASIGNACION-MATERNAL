/**
 * Sistema de Asignación Maternal - JavaScript Principal (Firebase-only)
 * Ministerio de las Culturas, las Artes y el Patrimonio - Chile
 */

const state = {
    usuario: null, // El objeto del usuario autenticado (de nuestra BD)
    solicitudActual: null,
    solicitudes: []
};

const API_URL = window.location.origin + '/api';

/**
 * Fetch autenticado: Usa SIEMPRE el token de Firebase.
 */
async function authFetch(url, options = {}) {
    if (!options.headers) options.headers = {};

    const user = firebase.auth().currentUser;
    if (user) {
        try {
            // Forzar la actualización del token para asegurar que no ha expirado.
            const idToken = await user.getIdToken(true);
            options.headers['Authorization'] = 'Bearer ' + idToken;
        } catch (error) {
            console.error("Error al obtener el token de Firebase:", error);
            handleLogout(); // Si el token falla, la sesión ya no es válida.
            return Promise.reject(new Error("Sesión de Firebase inválida."));
        }
    } else {
        // Si no hay usuario, no se debería intentar una llamada autenticada.
        return Promise.reject(new Error("Usuario no autenticado."));
    }

    return fetch(url, options);
}

// === INICIALIZACIÓN DE LA APP ===
function initApp() {
    // Primero, configurar el listener de autenticación.
    // Esto es lo más importante.
    setupAuthListener();
    
    // Luego, inicializar el resto de componentes de la UI.
    initTheme();
    initNavigation();
    initForms();
    initModals();
}

// Asegurarse de que el DOM está cargado antes de ejecutar el script.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// === AUTENTICACIÓN (LÓGICA CENTRALIZADA) ===

/**
 * Configura el "vigilante" de Firebase. Esta es la única fuente de verdad
 * sobre si un usuario está autenticado o no.
 */
function setupAuthListener() {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            // SI hay un usuario de Firebase, obtenemos su perfil de nuestra base de datos.
            console.log("Firebase user detected. Fetching profile...");
            try {
                const response = await authFetch(`${API_URL}/usuarios/me`);
                const data = await response.json();

                if (response.ok && data.success) {
                    state.usuario = data.data;
                    uiSetAuthenticated(data.data); // Actualizar UI a estado "logueado"
                } else {
                    console.error("No se pudo obtener el perfil del usuario desde el backend:", data.error);
                    showToast(data.error || "Tu usuario no tiene un perfil válido en el sistema.", 'error');
                    handleLogout(); // Si no hay perfil, no puede usar el sistema.
                }
            } catch (error) {
                console.error("Error crítico al verificar sesión:", error);
                uiSetUnauthenticated();
            }
        } else {
            // NO hay usuario de Firebase, mostrar el login.
            console.log("No Firebase user. Setting UI to unauthenticated.");
            uiSetUnauthenticated();
        }
    });
}

/**
 * Maneja el envío del formulario de login.
 */
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
        showToast('Verificando credenciales...', 'info');
        // El campo "username" se trata como el email para Firebase.
        const email = username.includes('@') ? username : `${username}@cultura.gob.cl`;
        await firebase.auth().signInWithEmailAndPassword(email, password);
        // Si el login es exitoso, el `onAuthStateChanged` se activará y hará el resto.
    } catch (error) {
        console.error("Fallo el inicio de sesión:", error.code);
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            showToast('Usuario o contraseña incorrectos.', 'error');
        } else {
            showToast('Error de autenticación. Revisa tu conexión.', 'error');
        }
    }
}

/**
 * Cierra la sesión de Firebase.
 */
function handleLogout() {
    firebase.auth().signOut().then(() => {
        showToast('Sesión cerrada exitosamente.', 'info');
        // El `onAuthStateChanged` se activará y limpiará la UI.
    });
}

// === FUNCIONES DE UI PARA AUTENTICACIÓN ===

function uiSetAuthenticated(usuario) {
    hideLogin();
    updateUserInfo(usuario);
    navigateTo('dashboard'); // Navegar al dashboard como página principal.
}

function uiSetUnauthenticated() {
    state.usuario = null;
    showLogin();
}

function showLogin() {
    document.getElementById('modalLogin').classList.add('active');
}

function hideLogin() {
    document.getElementById('modalLogin').classList.remove('active');
}

function updateUserInfo(usuario) {
    if (!usuario) return;
    document.getElementById('userName').textContent = usuario.nombre_completo || usuario.email;
    document.getElementById('userRole').textContent = usuario.rol;
}


// ===================================================================
// EL RESTO DEL CÓDIGO PERMANECE MAYORMENTE IGUAL
// ===================================================================


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
            if (state.usuario) { // Solo permitir navegación si está logueado
                const section = item.dataset.section;
                navigateTo(section);
            }
        });
    });

    document.getElementById('menuToggle').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
    });
}

function navigateTo(section) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const activeNavItem = document.querySelector(`[data-section="${section}"]`);
    if (activeNavItem) activeNavItem.classList.add('active');

    document.querySelectorAll('.content-section').forEach(el => el.classList.remove('active'));
    const activeSection = document.getElementById(`section-${section}`);
    if (activeSection) activeSection.classList.add('active');

    const titles = {
        'dashboard': 'Dashboard',
        'nueva-solicitud': 'Nueva Solicitud',
        'listado': 'Listado de Solicitudes',
        'reportes': 'Reportes',
        'configuracion': 'Configuración'
    };
    document.getElementById('pageTitle').textContent = titles[section] || 'Dashboard';

    if (state.usuario) {
        if (section === 'dashboard') loadDashboard();
        if (section === 'listado') loadSolicitudes();
        if (section === 'reportes') loadHistorialCorreos();
        if (section === 'configuracion') loadConfiguracion();
        if (section === 'nueva-solicitud') loadDepartamentos();
    }

    document.getElementById('sidebar').classList.remove('open');
}

// === FORMULARIOS ===
function initForms() {
    document.getElementById('formLogin').addEventListener('submit', handleLogin);
    document.getElementById('btnLogout').addEventListener('click', handleLogout);
    document.getElementById('formSolicitud').addEventListener('submit', handleSubmitSolicitud);
    document.getElementById('btnCalcularPreview').addEventListener('click', calcularPreview);
    document.getElementById('rut').addEventListener('input', formatRutInput);
    document.getElementById('fechaIngresoSolicitud').valueAsDate = new Date();
    initAutocompleteFuncionario();
    document.getElementById('btnBuscar').addEventListener('click', loadSolicitudes);
    document.getElementById('filtroEstado').addEventListener('change', loadSolicitudes);
    document.getElementById('btnExportarExcel').addEventListener('click', async () => {
        try {
            const response = await authFetch(`${API_URL}/reportes/consolidado?${getFilterParams()}`);
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `Consolidado_${new Date().toISOString().split('T')[0]}.xlsx`;
                document.body.appendChild(a); a.click(); a.remove();
                window.URL.revokeObjectURL(url);
            } else { showToast('Error al exportar Excel', 'error'); }
        } catch (error) { showToast('Error al exportar', 'error'); }
    });
    document.getElementById('btnGenerarFicha').addEventListener('click', generarFichaIndividual);
    document.getElementById('btnGenerarConsolidado').addEventListener('click', async () => {
        try {
            const response = await authFetch(`${API_URL}/reportes/consolidado`);
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `Consolidado_${new Date().toISOString().split('T')[0]}.xlsx`;
                document.body.appendChild(a); a.click(); a.remove();
                window.URL.revokeObjectURL(url);
            } else { showToast('Error al generar consolidado', 'error'); }
        } catch (error) { showToast('Error al generar', 'error'); }
    });
    document.getElementById('btnEnviarJefatura').addEventListener('click', enviarReporteJefatura);
    document.getElementById('formTramos').addEventListener('submit', guardarTramos);
    document.getElementById('formSMTP').addEventListener('submit', guardarSMTP);
    document.getElementById('btnCargarFuncionarios').addEventListener('click', cargarFuncionarios);
    document.getElementById('btnVerificarFuncionarios').addEventListener('click', verificarFuncionarios);
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

// === AUTOCOMPLETE FUNCIONARIOS ===
let acTimeout = null;
let acActiveIndex = -1;

function initAutocompleteFuncionario() {
    const input = document.getElementById('buscarFuncionario');
    const dropdown = document.getElementById('autocompleteResults');
    if (!input || !dropdown) return;

    input.addEventListener('input', () => {
        clearTimeout(acTimeout);
        const q = input.value.trim();
        if (q.length < 2) { dropdown.style.display = 'none'; return; }
        acTimeout = setTimeout(() => buscarFuncionarios(q), 300);
    });

    input.addEventListener('keydown', (e) => {
        const items = dropdown.querySelectorAll('.autocomplete-item');
        if (!items.length || dropdown.style.display === 'none') return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            acActiveIndex = Math.min(acActiveIndex + 1, items.length - 1);
            items.forEach((it, i) => it.classList.toggle('active', i === acActiveIndex));
            items[acActiveIndex]?.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            acActiveIndex = Math.max(acActiveIndex - 1, 0);
            items.forEach((it, i) => it.classList.toggle('active', i === acActiveIndex));
            items[acActiveIndex]?.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (acActiveIndex >= 0 && items[acActiveIndex]) items[acActiveIndex].click();
        } else if (e.key === 'Escape') {
            dropdown.style.display = 'none';
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#buscarFuncionario') && !e.target.closest('#autocompleteResults')) {
            dropdown.style.display = 'none';
        }
    });
}

async function buscarFuncionarios(query) {
    const dropdown = document.getElementById('autocompleteResults');
    try {
        const response = await authFetch(`${API_URL}/funcionarios/buscar?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        acActiveIndex = -1;
        if (data.success && data.data.length > 0) {
            dropdown.innerHTML = data.data.map(f => `
                <div class="autocomplete-item" onclick='seleccionarFuncionario(${JSON.stringify(f).replace(/'/g, "&#39;")})'>
                    <span class="ac-name">${f.nombre_completo}</span>
                    <div class="ac-details">
                        <span class="ac-rut">${f.rut}</span>
                        <span>${f.area || ''}</span>
                        <span>${f.cargo || ''}</span>
                    </div>
                </div>
            `).join('');
        } else {
            dropdown.innerHTML = '<div class="autocomplete-no-results">No se encontraron funcionarios</div>';
        }
        dropdown.style.display = 'block';
    } catch (error) {
        console.error('Error buscando funcionarios:', error);
        dropdown.style.display = 'none';
    }
}

function seleccionarFuncionario(f) {
    document.getElementById('buscarFuncionario').value = `${f.nombre_completo} - ${f.rut}`;
    document.getElementById('autocompleteResults').style.display = 'none';

    // Autocomplete form fields
    document.getElementById('rut').value = f.rut || '';
    document.getElementById('nombre').value = f.nombre_completo || '';
    document.getElementById('departamento').value = f.area || '';

    // Show additional info card
    const infoDiv = document.getElementById('infoFuncionario');
    const detalleDiv = document.getElementById('funcionarioDetalle');
    if (infoDiv && detalleDiv) {
        detalleDiv.innerHTML = `
            <span><strong>Cargo:</strong> ${f.cargo || 'N/A'}</span>
            <span><strong>Grado:</strong> ${f.grado || 'N/A'}</span>
            <span><strong>Calidad:</strong> ${f.calidad_juridica || 'N/A'}</span>
            <span><strong>Tipo:</strong> ${f.tipo_funcionario || 'N/A'}</span>
            <span><strong>Cargas:</strong> ${f.num_cargas ?? 'N/A'}</span>
            <span><strong>Genero:</strong> ${f.genero === 'F' ? 'Femenino' : f.genero === 'M' ? 'Masculino' : f.genero || 'N/A'}</span>
        `;
        infoDiv.style.display = 'block';
    }

    showToast(`Funcionario/a ${f.nombre_completo} seleccionado/a`, 'success');
}

async function calcularPreview() {
    const form = document.getElementById('formSolicitud');
    const formData = new FormData(form);
    const datos = {
        fecha_inicio_embarazo: formData.get('fecha_inicio_embarazo'),
        fecha_nacimiento: formData.get('fecha_nacimiento') || null,
        fecha_ingreso_solicitud: formData.get('fecha_ingreso_solicitud'),
        sueldo_bruto_mensual: (formData.get('sueldo_bruto_mensual') || '').toString().replace(/\./g, '')
    };

    if (!datos.fecha_inicio_embarazo || !datos.fecha_ingreso_solicitud || !datos.sueldo_bruto_mensual) {
        showToast('Complete fechas y sueldo para calcular', 'warning');
        return;
    }

    try {
        const response = await authFetch(`${API_URL}/solicitudes/calcular-preview`, {
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
        showToast('Error de conexión con el servidor.', 'error');
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
        alertas.innerHTML = `<div class="alerta danger">⚠️ ${calculo.mensaje}</div>`;
    }
    if (calculo.validacionPlazo && !calculo.validacionPlazo.valido) {
        alertas.innerHTML += `<div class="alerta warning">⚠️ ${calculo.validacionPlazo.mensaje}</div>`;
    }
}

async function handleSubmitSolicitud(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const datos = Object.fromEntries(formData);

    if (datos.sueldo_bruto_mensual) {
        datos.sueldo_bruto_mensual = datos.sueldo_bruto_mensual.toString().replace(/\./g, '');
    }

    datos.usuario_id = state.usuario?.id;

    try {
        const response = await authFetch(`${API_URL}/solicitudes`, {
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
            const errorMsg = data.errores ? data.errores.map(e => e.mensaje).join(', ') : data.error;
            showToast(errorMsg || 'Error al crear la solicitud', 'error');
        }
    } catch (error) {
        showToast('Error de conexión al guardar.', 'error');
        console.error(error);
    }
}

// === DASHBOARD, LISTADO, MODALES, REPORTES, ETC. ===
// (Estas funciones no necesitan cambios significativos, ya que usan `authFetch`)

async function loadDashboard() {
    try {
        const response = await authFetch(`${API_URL}/solicitudes/estadisticas`);
        const data = await response.json();
        if (data.success) {
            const stats = data.data;
            document.getElementById('totalSolicitudes').textContent = stats.totales.total_solicitudes || 0;
            document.getElementById('montoTotal').textContent = formatMoney(stats.totales.monto_total_acumulado || 0);
            const aprobadas = stats.porEstado.find(e => e.estado_solicitud === 'Aprobada');
            document.getElementById('solicitudesAprobadas').textContent = aprobadas?.cantidad || 0;
            const pendientes = stats.porEstado.filter(e => e.estado_solicitud === 'Ingresada' || e.estado_solicitud === 'En Revisión');
            document.getElementById('solicitudesPendientes').textContent = pendientes.reduce((sum, p) => sum + p.cantidad, 0);
            renderChartEstados(stats.porEstado);
            renderChartDepartamentos(stats.porDepartamento);
            loadActividadReciente();
        }
    } catch (error) { console.error('Error al cargar dashboard:', error); }
}

function renderChartEstados(porEstado) {
    const container = document.getElementById('chartEstados');
    const total = porEstado.reduce((sum, e) => sum + e.cantidad, 0) || 1;
    const colores = {
        'Ingresada': 'info', 'En Revisión': 'warning',
        'Aprobada': 'success', 'Pagada': 'primary', 'Rechazada': 'danger'
    };
    container.innerHTML = porEstado.map(estado => `
        <div class="chart-bar"><span class="chart-bar-label">${estado.estado_solicitud}</span>
            <div class="chart-bar-track">
                <div class="chart-bar-fill ${colores[estado.estado_solicitud] || 'primary'}" style="width: ${(estado.cantidad / total * 100)}%">${estado.cantidad}</div>
            </div>
        </div>`).join('');
}

function renderChartDepartamentos(porDepartamento) {
    const container = document.getElementById('chartDepartamentos');
    const max = Math.max(...porDepartamento.map(d => d.cantidad)) || 1;
    container.innerHTML = porDepartamento.slice(0, 5).map(dept => `
        <div class="chart-bar"><span class="chart-bar-label" title="${dept.departamento_unidad}">${dept.departamento_unidad.substring(0, 15)}...</span>
            <div class="chart-bar-track">
                <div class="chart-bar-fill primary" style="width: ${(dept.cantidad / max * 100)}%">${dept.cantidad}</div>
            </div>
        </div>`).join('');
}

async function loadActividadReciente() {
    try {
        const response = await authFetch(`${API_URL}/solicitudes?limit=5`);
        const data = await response.json();
        if (data.success) {
            const container = document.getElementById('actividadReciente');
            container.innerHTML = data.data.slice(0, 5).map(sol => `
                <div class="activity-item" style="display: flex; justify-content: space-between; padding: 12px; border-bottom: 1px solid var(--border-color);">
                    <div><strong>${sol.nombre_completo}</strong><span style="color: var(--text-muted); margin-left: 8px;">${sol.departamento_unidad}</span></div>
                    <div><span class="badge badge-${getEstadoClass(sol.estado_solicitud)}">${sol.estado_solicitud}</span><span style="color: var(--text-muted); margin-left: 8px;">${formatMoney(sol.monto_total_pagable)}</span></div>
                </div>`).join('');
        }
    } catch (error) { console.error('Error al cargar actividad:', error); }
}

function getFilterParams() {
    const params = new URLSearchParams();
    const estado = document.getElementById('filtroEstado').value;
    if (estado) params.append('estado', estado);
    const busqueda = document.getElementById('filtroBusqueda').value;
    if (busqueda) params.append('busqueda', busqueda);
    return params.toString();
}

async function loadSolicitudes() {
    try {
        const response = await authFetch(`${API_URL}/solicitudes?${getFilterParams()}`);
        const data = await response.json();
        if (data.success) {
            state.solicitudes = data.data;
            renderSolicitudes(data.data);
        }
    } catch (error) { console.error('Error al cargar solicitudes:', error); }
}

function renderSolicitudes(solicitudes) {
    const tbody = document.getElementById('tbodySolicitudes');
    if (solicitudes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 40px; color: var(--text-muted);">No hay solicitudes registradas</td></tr>';
        return;
    }
    tbody.innerHTML = solicitudes.map(sol => `
        <tr>
            <td>${sol.id.substring(0, 8)}...</td><td>${sol.rut_funcionaria}</td><td>${sol.nombre_completo}</td>
            <td>${sol.departamento_unidad}</td><td>Tramo ${sol.tramo_asignacion}</td><td>${formatMoney(sol.monto_total_pagable)}</td>
            <td><span class="badge badge-${getEstadoClass(sol.estado_solicitud)}">${sol.estado_solicitud}</span></td>
            <td>${formatDate(sol.fecha_ingreso_solicitud)}</td>
            <td class="actions">
                <button class="btn-icon view" onclick="verDetalle('${sol.id}')" title="Ver detalle">👁️</button>
                <button class="btn-icon edit" onclick="descargarPDF('${sol.id}')" title="Descargar PDF">📄</button>
            </td>
        </tr>`).join('');
}

function getEstadoClass(estado) {
    const clases = {
        'Ingresada': 'ingresada', 'En Revisión': 'revision', 'Aprobada': 'aprobada',
        'Pagada': 'pagada', 'Rechazada': 'rechazada'
    };
    return clases[estado] || 'ingresada';
}

function initModals() {
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => btn.closest('.modal').classList.remove('active'));
    });
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal && modal.id !== 'modalLogin') {
                modal.classList.remove('active');
            }
        });
    });
    document.getElementById('btnDescargarPDF').addEventListener('click', () => state.solicitudActual && descargarPDF(state.solicitudActual.id));
    document.getElementById('btnAprobar').addEventListener('click', () => state.solicitudActual && cambiarEstado(state.solicitudActual.id, 'Aprobada'));
    document.getElementById('btnRechazar').addEventListener('click', () => {
        if (state.solicitudActual) {
            const motivo = prompt('Ingrese el motivo del rechazo:');
            if (motivo) cambiarEstado(state.solicitudActual.id, 'Rechazada', motivo);
        }
    });
    document.getElementById('btnEnviarCorreo').addEventListener('click', () => state.solicitudActual && enviarFichaPorCorreo(state.solicitudActual.id));
}

async function verDetalle(id) {
    try {
        const response = await authFetch(`${API_URL}/solicitudes/${id}`);
        const data = await response.json();
        if (data.success) {
            state.solicitudActual = data.data;
            renderDetalle(data.data);
            document.getElementById('modalDetalle').classList.add('active');
        }
    } catch (error) { showToast('Error al cargar detalle', 'error'); }
}

function renderDetalle(sol) {
    const body = document.getElementById('modalDetalleBody');
    body.innerHTML = `
        <div class="detalle-grid">
             <div class="detalle-section"><h4>Datos Personales</h4> <div class="detalle-item"><label>Nombre:</label><span>${sol.nombre_completo}</span></div> <div class="detalle-item"><label>RUT:</label><span>${sol.rut_funcionaria}</span></div> <div class="detalle-item"><label>Departamento:</label><span>${sol.departamento_unidad}</span></div> <div class="detalle-item"><label>Correo:</label><span>${sol.correo_electronico}</span></div> <div class="detalle-item"><label>Teléfono:</label><span>${sol.telefono || 'No registrado'}</span></div></div>
             <div class="detalle-section"><h4>Datos del Embarazo</h4> <div class="detalle-item"><label>Inicio Embarazo:</label><span>${formatDate(sol.fecha_inicio_embarazo)}</span></div> <div class="detalle-item"><label>Nacimiento:</label><span>${sol.fecha_nacimiento ? formatDate(sol.fecha_nacimiento) : 'Aún en embarazo'}</span></div> <div class="detalle-item"><label>Ingreso Solicitud:</label><span>${formatDate(sol.fecha_ingreso_solicitud)}</span></div></div>
             <div class="detalle-section"><h4>Datos Económicos</h4> <div class="detalle-item"><label>Sueldo Bruto:</label><span>${formatMoney(sol.sueldo_bruto_mensual)}</span></div> <div class="detalle-item"><label>Tramo:</label><span>Tramo ${sol.tramo_asignacion}</span></div> <div class="detalle-item"><label>Monto Mensual:</label><span>${formatMoney(sol.monto_mensual_asignacion)}</span></div></div>
             <div class="detalle-section"><h4>Cálculo de Asignación</h4> <div class="detalle-item"><label>Meses Retroactivos:</label><span>${sol.meses_retroactivos} meses</span></div> <div class="detalle-item"><label>Monto Retroactivo:</label><span>${formatMoney(sol.monto_total_retroactivo)}</span></div> <div class="detalle-item"><label>Meses Futuros:</label><span>${sol.meses_futuros || 0} meses</span></div> <div class="detalle-item"><label>Monto Futuro:</label><span>${formatMoney(sol.monto_total_futuro || 0)}</span></div></div>
             <div class="detalle-section full"><h4>Estado de la Solicitud</h4> <div class="detalle-item"><label>Estado:</label><span class="badge badge-${getEstadoClass(sol.estado_solicitud)}">${sol.estado_solicitud}</span></div> <div class="detalle-item"><label>Fecha Registro:</label><span>${formatDate(sol.fecha_registro)}</span></div> ${sol.fecha_aprobacion ? `<div class="detalle-item"><label>Fecha Aprobación:</label><span>${formatDate(sol.fecha_aprobacion)}</span></div>` : ''} ${sol.observaciones ? `<div class="detalle-item"><label>Observaciones:</label><span>${sol.observaciones}</span></div>` : ''}</div>
        </div>
        <div class="detalle-total"><label>MONTO TOTAL A PAGAR</label><span>${formatMoney(sol.monto_total_pagable)}</span></div>`;
}

async function cambiarEstado(id, estado, motivo = null) {
    try {
        const body = { estado, usuario_id: state.usuario?.id || 'sistema' };
        if (motivo) body.motivo = motivo;
        const response = await authFetch(`${API_URL}/solicitudes/${id}/cambiar-estado`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = await response.json();
        if (data.success) {
            showToast(`Solicitud ${estado.toLowerCase()}`, 'success');
            document.getElementById('modalDetalle').classList.remove('active');
            loadSolicitudes();
            loadDashboard();
        } else {
            showToast(data.error, 'error');
        }
    } catch (error) { showToast('Error al cambiar estado', 'error'); }
}

async function descargarPDF(id) {
    try {
        const response = await authFetch(`${API_URL}/reportes/ficha/${id}`);
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Ficha_${id}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } else {
            showToast('Error al descargar PDF', 'error');
        }
    } catch (error) { showToast('Error al descargar PDF', 'error'); console.error(error); }
}

function generarFichaIndividual() {
    const input = document.getElementById('inputIdFicha').value.trim();
    if (!input) {
        showToast('Ingrese ID de solicitud o RUT', 'warning');
        return;
    }

    // Determinar si es ID numérico o RUT
    const isNumeric = /^\d+$/.test(input);
    
    if (isNumeric) {
        // Es ID de solicitud - generar directamente
        descargarPDF(input);
    } else {
        // Es RUT - buscar solicitudes de esta funcionaria
        buscarSolicitudesPorRut(input);
    }
}

async function buscarSolicitudesPorRut(rut) {
    try {
        // Normalizar RUT
        const rutNormalizado = rut.replace(/[^0-9kK]/g, '').toUpperCase();
        
        // Buscar solicitudes por RUT
        const response = await authFetch(`${API_URL}/solicitudes?rut=${encodeURIComponent(rutNormalizado)}`);
        const data = await response.json();
        
        const resultadosDiv = document.getElementById('fichaResultados');
        const busquedaDiv = document.getElementById('fichaBusqueda');
        
        if (data.success && data.data.length > 0) {
            // Mostrar resultados
            busquedaDiv.style.display = 'block';
            resultadosDiv.innerHTML = data.data.map(sol => `
                <div class="ficha-result-item" onclick="descargarPDF(${sol.id})">
                    <div class="ficha-id">Solicitud #${sol.id}</div>
                    <div class="ficha-info">
                        ${sol.nombre_completo} - ${sol.estado_solicitud} - ${formatMoney(sol.monto_total_pagable)}
                    </div>
                </div>
            `).join('');
            
            showToast(`Se encontraron ${data.data.length} solicitudes para este RUT`, 'success');
        } else {
            // No se encontraron solicitudes
            busquedaDiv.style.display = 'block';
            resultadosDiv.innerHTML = '<p style="color: var(--warning-600);">No se encontraron solicitudes para este RUT</p>';
            showToast('No se encontraron solicitudes para este RUT', 'warning');
        }
    } catch (error) {
        showToast('Error al buscar solicitudes', 'error');
        console.error(error);
    }
}

async function enviarFichaPorCorreo(id) {
    if (!state.solicitudActual) return;
    try {
        const response = await authFetch(`${API_URL}/reportes/ficha/${id}/enviar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ destinatarios: [state.solicitudActual.correo_electronico] }) });
        const data = await response.json();
        if (data.success) showToast('Correo enviado', 'success');
        else showToast(data.error || 'Error al enviar', 'error');
    } catch (error) { showToast('Error de conexión', 'error'); }
}

async function enviarReporteJefatura() {
    const email = document.getElementById('inputEmailJefatura').value;
    if (!email) { showToast('Ingrese el correo', 'warning'); return; }
    try {
        const response = await authFetch(`${API_URL}/reportes/consolidado/enviar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ destinatarios: [email] }) });
        const data = await response.json();
        if (data.success) showToast('Reporte enviado', 'success');
        else showToast(data.error || 'Error al enviar', 'error');
    } catch (error) { showToast('Error de conexión', 'error'); }
}

async function loadHistorialCorreos() {
    try {
        const response = await authFetch(`${API_URL}/reportes/historial-correos`);
        const data = await response.json();
        if (data.success) {
            document.getElementById('tbodyHistorialCorreos').innerHTML = data.data.map(correo => `
                <tr><td>${formatDate(correo.fecha_envio)}</td><td>${correo.tipo_correo}</td><td>${correo.destinatarios}</td><td>${correo.asunto}</td><td><span class="badge badge-${correo.estado === 'enviado' ? 'aprobada' : 'rechazada'}">${correo.estado}</span></td></tr>`).join('');
        }
    } catch (error) { console.error('Error al cargar historial:', error); }
}

async function loadConfiguracion() {
    try {
        const [tramosRes, smtpRes] = await Promise.all([
            authFetch(`${API_URL}/config/tramos`),
            authFetch(`${API_URL}/reportes/config-smtp`)
        ]);
        const tramosData = await tramosRes.json();
        if (tramosData.success) {
            const t = tramosData.data;
            document.getElementById('tramo1Limite').value = t.tramoA?.limite_renta || t.tramo1?.limite || '';
            document.getElementById('tramo1Monto').value = t.tramoA?.monto_asignacion || t.tramo1?.monto || '';
            document.getElementById('tramo2Limite').value = t.tramoB?.limite_renta || t.tramo2?.limite || '';
            document.getElementById('tramo2Monto').value = t.tramoB?.monto_asignacion || t.tramo2?.monto || '';
            document.getElementById('tramo3Limite').value = t.tramoC?.limite_renta || t.tramo3?.limite || '';
            document.getElementById('tramo3Monto').value = t.tramoC?.monto_asignacion || t.tramo3?.monto || '';
        }
        const smtpData = await smtpRes.json();
        const smtpStatus = document.getElementById('smtpStatus');
        if (smtpData.success && smtpData.data.configurado) {
            smtpStatus.innerHTML = `<p style="color: var(--success-600);">✓ SMTP configurado: ${smtpData.data.host}</p>`;
        } else {
            smtpStatus.innerHTML = '<p style="color: var(--warning-600);">⚠️ SMTP no configurado</p>';
        }
        
        // Verificar estado de funcionarios
        verificarFuncionarios();
    } catch (error) { console.error('Error al cargar config:', error); }
}

async function loadDepartamentos() {
    try {
        const response = await authFetch(`${API_URL}/config/departamentos`);
        const data = await response.json();
        if (data.success) {
            document.getElementById('departamentos').innerHTML = data.data.map(d => `<option value="${d}"></option>`).join('');
        }
    } catch (error) { console.error('Error al cargar departamentos:', error); }
}

async function guardarTramos(e) {
    e.preventDefault();
    const tramos = {
        tramo1: { limite: document.getElementById('tramo1Limite').value, monto: document.getElementById('tramo1Monto').value },
        tramo2: { limite: document.getElementById('tramo2Limite').value, monto: document.getElementById('tramo2Monto').value },
        tramo3: { limite: document.getElementById('tramo3Limite').value, monto: document.getElementById('tramo3Monto').value }
    };
    try {
        const tramosFirestore = {
            tramoA: { limite_renta: parseInt(tramos.tramo1.limite), monto_asignacion: parseInt(tramos.tramo1.monto) },
            tramoB: { limite_renta: parseInt(tramos.tramo2.limite), monto_asignacion: parseInt(tramos.tramo2.monto) },
            tramoC: { limite_renta: parseInt(tramos.tramo3.limite), monto_asignacion: parseInt(tramos.tramo3.monto) }
        };
        const response = await authFetch(`${API_URL}/config/tramos`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tramosFirestore) });
        const data = await response.json();
        if (data.success) showToast('Tramos actualizados', 'success');
        else showToast(data.error, 'error');
    } catch (error) { showToast('Error al guardar', 'error'); }
}

async function guardarSMTP(e) {
    e.preventDefault();
    const config = {
        smtp_host: document.getElementById('smtpHost').value, smtp_port: document.getElementById('smtpPort').value,
        smtp_user: document.getElementById('smtpUser').value, smtp_pass: document.getElementById('smtpPass').value
    };
    try {
        for (const [clave, valor] of Object.entries(config)) {
            if (valor) {
                await authFetch(`${API_URL}/config/${clave}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ valor }) });
            }
        }
        showToast('Configuración SMTP guardada', 'success');
        loadConfiguracion();
    } catch (error) { showToast('Error al guardar', 'error'); }
}

// === UTILIDADES ===
function formatMoney(amount) {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(amount || 0);
}

function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    // Firestore Timestamps have toDate(), strings are parsed directly
    if (dateStr._seconds || dateStr.seconds) {
        const ts = dateStr._seconds || dateStr.seconds;
        return new Date(ts * 1000).toLocaleDateString('es-CL');
    }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'N/A';
    const utcDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    return utcDate.toLocaleDateString('es-CL', { timeZone: 'UTC' });
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: '✓', error: '✗', warning: '⚠', info: 'ℹ' };
    toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// === FUNCIONES DE SEMBRADO ===
async function verificarFuncionarios() {
    try {
        const response = await authFetch(`${API_URL}/seed/funcionarios/status`);
        const data = await response.json();
        if (data.success) {
            const count = data.data.totalFuncionarios;
            const countEl = document.getElementById('funcionariosCount');
            const lastUpdateEl = document.getElementById('funcionariosLastUpdate');
            
            if (count > 0) {
                countEl.innerHTML = `✅ ${count} funcionarios cargados`;
                countEl.style.color = 'var(--success-600)';
                lastUpdateEl.textContent = new Date().toLocaleString('es-CL');
                showToast(`Base de datos tiene ${count} funcionarios`, 'success');
            } else {
                countEl.innerHTML = '❌ Sin datos';
                countEl.style.color = 'var(--danger-600)';
                lastUpdateEl.textContent = 'Nunca';
                showToast('No hay funcionarios cargados', 'warning');
            }
        }
    } catch (error) {
        showToast('Error al verificar estado', 'error');
        console.error(error);
    }
}

async function cargarFuncionarios() {
    const btn = document.getElementById('btnCargarFuncionarios');
    const progressDiv = document.getElementById('seedProgress');
    const progressFill = document.getElementById('progressFill');
    const seedLog = document.getElementById('seedLog');
    
    if (!confirm('⚠️ ¿Estás seguro de cargar los 1276 funcionarios desde Funcionarios.xlsx?\n\nEsta operación puede tardar varios minutos y sobreescribirá datos existentes.')) {
        return;
    }
    
    try {
        // Deshabilitar botón y mostrar progreso
        btn.disabled = true;
        btn.textContent = '⏳ Cargando...';
        progressDiv.style.display = 'block';
        progressFill.style.width = '10%';
        seedLog.textContent = '🚀 Iniciando sembrado de funcionarios...\n';
        
        // Simular progreso mientras espera respuesta
        let progressInterval = setInterval(() => {
            const current = parseInt(progressFill.style.width) || 10;
            if (current < 90) {
                progressFill.style.width = (current + 5) + '%';
                seedLog.textContent += `Procesando... ${current + 5}%\n`;
            }
        }, 2000);
        
        const response = await authFetch(`${API_URL}/seed/funcionarios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        clearInterval(progressInterval);
        const data = await response.json();
        
        if (data.success) {
            progressFill.style.width = '100%';
            seedLog.textContent += `✅ ${data.message}\n`;
            seedLog.textContent += `📊 Total procesado: ${data.data.totalProcessed}\n`;
            seedLog.textContent += `✅ Escritos: ${data.data.totalWritten}\n`;
            seedLog.textContent += `❌ Errores: ${data.data.errors}\n`;
            
            if (data.data.errors > 0 && data.data.errors.length > 0) {
                seedLog.textContent += '\n⚠️ Primeros errores:\n';
                data.data.errors.forEach(err => {
                    seedLog.textContent += `- ${err.nombre} (${err.rut}): ${err.error}\n`;
                });
            }
            
            showToast(`¡Sembrado completado! ${data.data.totalWritten} funcionarios cargados`, 'success');
            
            // Actualizar estado
            setTimeout(() => {
                verificarFuncionarios();
                progressDiv.style.display = 'none';
            }, 3000);
        } else {
            seedLog.textContent += `❌ Error: ${data.error}\n`;
            showToast(data.error, 'error');
        }
    } catch (error) {
        seedLog.textContent += `❌ Error de conexión: ${error.message}\n`;
        showToast('Error al cargar funcionarios', 'error');
        console.error(error);
    } finally {
        btn.disabled = false;
        btn.textContent = '🚀 Cargar Funcionarios desde Excel';
    }
}
