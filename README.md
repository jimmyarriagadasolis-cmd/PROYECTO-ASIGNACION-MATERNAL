# Sistema de Gestión de Asignación Maternal
## Ministerio de las Culturas, las Artes y el Patrimonio - Chile

Sistema local para gestionar solicitudes de asignación maternal, con cálculo automático de montos retroactivos, generación de informes PDF/Excel y envío de reportes por correo.

---

## Requisitos Previos

- **Node.js** versión 18 o superior
- **npm** (incluido con Node.js)

### Instalación de Node.js

1. Descargar desde: https://nodejs.org/
2. Ejecutar el instalador
3. Verificar instalación:
   ```bash
   node --version
   npm --version
   ```

---

## Instalación del Sistema

1. **Abrir una terminal** en la carpeta del proyecto:
   ```
   C:\Users\jimmy\Documents\PROYECTO ASIGNACION MATERNAL
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Iniciar el servidor**:
   ```bash
   npm start
   ```

4. **Abrir el navegador** en:
   ```
   http://localhost:3000
   ```

---

## Credenciales por Defecto

| Usuario | Contraseña |
|---------|------------|
| admin   | admin123   |

> ⚠️ **Importante**: Cambie la contraseña del administrador después del primer inicio.

---

## Estructura del Proyecto

```
PROYECTO ASIGNACION MATERNAL/
├── backend/
│   ├── server.js              # Servidor Express
│   ├── database.js            # Base de datos SQLite
│   ├── routes/                # Rutas de la API
│   │   ├── solicitudes.js
│   │   ├── usuarios.js
│   │   ├── reportes.js
│   │   └── config.js
│   ├── services/              # Lógica de negocios
│   │   ├── calculoAsignacion.js
│   │   ├── pdfGenerator.js
│   │   ├── excelGenerator.js
│   │   └── emailService.js
│   └── utils/
│       └── validaciones.js
├── frontend/
│   ├── index.html
│   ├── css/styles.css
│   └── js/app.js
├── data/                      # Base de datos SQLite
├── reports/                   # PDFs y Excel generados
├── assets/                    # Logo y recursos
└── package.json
```

---

## Funcionalidades

### 1. Dashboard
- Estadísticas de solicitudes
- Gráficos por estado y departamento
- Actividad reciente

### 2. Nueva Solicitud
- Formulario de registro completo
- Validación de RUT chileno
- Cálculo automático de asignación
- Vista previa antes de guardar

### 3. Listado de Solicitudes
- Filtros por estado
- Búsqueda por nombre o RUT
- Exportación a Excel
- Acciones: ver, aprobar, rechazar

### 4. Reportes
- Ficha individual en PDF
- Informe consolidado en Excel
- Envío por correo electrónico

### 5. Configuración
- Valores de tramos actualizables
- Configuración SMTP para correos

---

## Valores de Asignación 2026

| Tramo | Límite Superior | Monto Mensual |
|-------|-----------------|---------------|
| 1     | $631.976        | $22.007       |
| 2     | $905.941        | $13.505       |
| 3     | $1.439.668      | $4.267        |
| 4     | Superior        | $0            |

---

## Soporte

Para consultas técnicas, contactar al equipo de TI del Ministerio.

---

*Desarrollado para el Ministerio de las Culturas, las Artes y el Patrimonio - Gobierno de Chile*
