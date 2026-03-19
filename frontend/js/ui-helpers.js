/**
 * UI Helpers - Loading States y Error Handling Centralizado
 * GET SHIT DONE - Mejoras UX/UI
 */

class UIHelper {
    constructor() {
        this.loadingStates = new Map();
        this.errorMessages = {
            network: 'Error de conexión. Verifica tu internet.',
            server: 'Error del servidor. Intenta nuevamente.',
            auth: 'Sesión expirada. Inicia sesión nuevamente.',
            validation: 'Verifica los datos ingresados.',
            default: 'Ocurrió un error inesperado.'
        };
    }

    // Loading States
    setLoading(elementId, loading = true) {
        const element = document.getElementById(elementId);
        if (!element) return;

        if (loading) {
            this.loadingStates.set(elementId, element.innerHTML);
            element.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <span>Procesando...</span>
                </div>
            `;
            element.disabled = true;
        } else {
            element.innerHTML = this.loadingStates.get(elementId) || '';
            element.disabled = false;
            this.loadingStates.delete(elementId);
        }
    }

    // Error Handling Centralizado
    handleError(error, context = '') {
        console.error(`❌ Error ${context}:`, error);
        
        let message = this.errorMessages.default;
        
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            message = 'Usuario o contraseña incorrectos.';
        } else if (error.code === 'auth/network-request-failed') {
            message = this.errorMessages.network;
        } else if (error.message.includes('fetch')) {
            message = this.errorMessages.network;
        } else if (error.status >= 500) {
            message = this.errorMessages.server;
        } else if (error.status === 401) {
            message = this.errorMessages.auth;
        } else if (error.status === 400) {
            message = this.errorMessages.validation;
        }

        this.showToast(message, 'error');
        return message;
    }

    // Toast Notifications Mejoradas
    showToast(message, type = 'info', duration = 5000) {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'polite');
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">${icons[type] || icons.info}</span>
                <span class="toast-message">${message}</span>
                <button class="toast-close" aria-label="Cerrar notificación" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        toastContainer.appendChild(toast);

        // Auto-remove
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, duration);

        // Focus management for accessibility
        toast.focus();
    }

    // Debounce para prevenir múltiples clicks
    debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Form Validation Helper
    validateForm(formId) {
        const form = document.getElementById(formId);
        if (!form) return { valid: false, errors: ['Formulario no encontrado'] };

        const errors = [];
        const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
        
        inputs.forEach(input => {
            if (!input.value.trim()) {
                errors.push(`El campo ${input.name || input.id} es requerido`);
                input.classList.add('error');
            } else {
                input.classList.remove('error');
            }

            // Validaciones específicas
            if (input.type === 'email' && input.value) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(input.value)) {
                    errors.push('El correo electrónico no es válido');
                    input.classList.add('error');
                }
            }
        });

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Progress Indicator
    showProgress(current, total, message = '') {
        const progressBar = document.getElementById('progressBar');
        if (!progressBar) return;

        const percentage = Math.round((current / total) * 100);
        progressBar.innerHTML = `
            <div class="progress-content">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percentage}%"></div>
                </div>
                <div class="progress-text">
                    <span>${message}</span>
                    <span>${current}/${total} (${percentage}%)</span>
                </div>
            </div>
        `;
    }
}

// Instancia global
const uiHelper = new UIHelper();

// Exportar para uso global
window.uiHelper = uiHelper;
window.showToast = (message, type, duration) => uiHelper.showToast(message, type, duration);
