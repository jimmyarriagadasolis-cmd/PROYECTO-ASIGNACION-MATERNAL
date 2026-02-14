# Guía de Deployment a Firebase App Hosting
## Sistema de Asignación Maternal

Esta guía despliega la aplicación usando **Firebase App Hosting** (Cloud Run),
que es la opción moderna y recomendada para apps fullstack con Express.js.

### ¿Por qué App Hosting en vez de Hosting + Cloud Functions?

| Aspecto | Hosting + Functions (antiguo) | App Hosting (este proyecto) |
|---------|-------------------------------|----------------------------|
| Backend | Cloud Functions (cold starts) | Cloud Run (contenedor completo) |
| Deploy | `firebase deploy` manual | Git-connected, CI/CD automático |
| Arquitectura | Frontend separado del backend | Express sirve todo (como local) |
| Escalado | Limitado por Functions | Automático con Cloud Run |

## Prerrequisitos

1. **Node.js** versión 20 o superior
2. **Cuenta de Google** para Firebase
3. **Firebase CLI** v13+ instalado globalmente
4. **Repositorio Git** (GitHub recomendado) — App Hosting se conecta a tu repo

## Paso 1: Instalar Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```

## Paso 2: Crear Proyecto en Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Haz clic en "Agregar proyecto"
3. Nombre sugerido: `asignacion-maternal`
4. Haz clic en "Crear proyecto"
5. **Actualizar a Plan Blaze** (requerido para App Hosting / Cloud Run)

## Paso 3: Habilitar Servicios en Firebase Console

### 3.1. Firestore Database
1. Firebase Console → Firestore Database → "Create database"
2. Modo: **Production**
3. Ubicación: `us-central1` (o la más cercana a Chile: `southamerica-east1`)

### 3.2. Authentication
1. Firebase Console → Authentication → "Get Started"
2. Habilita **Email/Password** como método de autenticación

### 3.3. Registrar Web App
1. Firebase Console → Project Settings → General
2. En "Your apps", haz clic en el ícono web (`</>`)
3. Nombre: "Sistema Asignación Maternal"
4. **Copia el objeto `firebaseConfig`** (lo necesitarás en el paso 5)

## Paso 4: Configurar el Proyecto Local

### 4.1. Inicializar Firebase

```bash
firebase init
```

Selecciona:
- ✅ **Firestore** (reglas e índices)
- ✅ **App Hosting** (nuevo)

Cuando pregunte:
- **Firestore rules file:** → `firestore.rules` (ya existe)
- **Firestore indexes file:** → `firestore.indexes.json` (ya existe)
- **App Hosting backend:** → Conectar a tu repositorio GitHub

### 4.2. Crear firebase-config.js para el frontend

```bash
copy frontend\js\firebase-config.template.js frontend\js\firebase-config.js
```

Edita `frontend/js/firebase-config.js` con los valores de tu proyecto:

```javascript
const firebaseConfig = {
  apiKey: "TU_API_KEY_AQUI",
  authDomain: "asignacion-maternal.firebaseapp.com",
  projectId: "asignacion-maternal",
  storageBucket: "asignacion-maternal.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456"
};
firebase.initializeApp(firebaseConfig);
const firebaseAuth = firebase.auth();
```

> `firebase-config.js` está en `.gitignore`. El template está en `firebase-config.template.js`.

## Paso 5: Instalar Dependencias

```bash
npm install
```

Esto instala todas las dependencias incluyendo `firebase-admin` para el backend.

## Paso 6: Crear Usuario Admin Inicial

### 6.1. En Firebase Authentication
1. Firebase Console → Authentication → "Add user"
2. Email: `admin@cultura.gob.cl`
3. Password: `admin123` (cámbialo después)
4. **Copia el UID del usuario**

### 6.2. En Firestore
1. Firebase Console → Firestore → "Start collection"
2. Colección: `usuarios`
3. ID de documento: **PEGA EL UID**
4. Campos:
   - `username` (string): `admin`
   - `nombre_completo` (string): `Administrador del Sistema`
   - `email` (string): `admin@cultura.gob.cl`
   - `rol` (string): `administrador`
   - `departamento` (string): `TI`
   - `activo` (boolean): `true`
   - `fecha_creacion` (timestamp): *timestamp actual*

## Paso 7: Poblar Datos Iniciales en Firestore

### 7.1. Valores Históricos (23 períodos 2018-2026)

```bash
npm run seed
```

### 7.2. Configuración de Tramos

Crea la colección `configuracion` en Firestore con estos documentos:

| Document ID | Campo: valor |
|-------------|-------------|
| tramo1_limite | 631976 |
| tramo1_monto | 22007 |
| tramo2_limite | 923067 |
| tramo2_monto | 13505 |
| tramo3_limite | 1439668 |
| tramo3_monto | 4267 |
| plazo_maximo_años | 5 |
| meses_max_embarazo | 9 |
| nombre_institucion | Ministerio de las Culturas, las Artes y el Patrimonio |

Cada documento debe tener el campo `valor` (string) y opcionalmente `fecha_actualizacion` (timestamp).

## Paso 8: Desplegar Reglas de Firestore

```bash
firebase deploy --only firestore
```

## Paso 9: Desplegar con App Hosting

App Hosting se despliega automáticamente al hacer push a tu repositorio conectado.

```bash
git add .
git commit -m "Deploy Firebase App Hosting"
git push origin main
```

Firebase App Hosting detectará el push y:
1. Ejecutará `npm install`
2. Ejecutará `npm run build` (no-op para Express)
3. Iniciará `npm start` → `node backend-firebase/server.js`
4. El servidor Express escuchará en `process.env.PORT` (asignado por Cloud Run)

### Deploy manual (sin Git)

```bash
firebase apphosting:backends:create --project asignacion-maternal
```

## Paso 10: Verificar el Deploy

Después del deploy, la URL será algo como:
```
https://asignacion-maternal--backend-xxxxx.us-central1.hosted.app
```

1. Abre la URL en tu navegador
2. Ingresa: `admin@cultura.gob.cl` / `admin123`
3. Deberías ver el dashboard

## Arquitectura del Proyecto

```
├── apphosting.yaml              ← Configuración de App Hosting (Cloud Run)
├── firestore.rules              ← Reglas de seguridad Firestore
├── firestore.indexes.json       ← Índices compuestos
├── package.json                 ← start: backend-firebase, dev: backend local
│
├── backend/                     ← Backend LOCAL (Express + SQLite)
│   ├── server.js                ← npm run dev (desarrollo local)
│   ├── database.js              ← SQLite con sql.js
│   ├── routes/                  ← Rutas con queries SQL
│   └── services/                ← Cálculo, PDF, Excel, Email
│
├── backend-firebase/            ← Backend PRODUCCIÓN (Express + Firestore)
│   ├── server.js                ← npm start (App Hosting / Cloud Run)
│   ├── middleware/auth.js       ← Firebase Auth token verification
│   ├── routes/                  ← Rutas con Firestore queries
│   ├── services/                ← Cálculo, PDF, Excel, Email (Firestore)
│   ├── utils/validaciones.js    ← Validación de RUT, email, etc.
│   └── scripts/                 ← Seed de datos iniciales
│
├── frontend/                    ← Frontend (HTML/CSS/JS vanilla)
│   ├── index.html               ← Carga Firebase SDK dinámicamente
│   ├── js/app.js                ← Dual mode: Firebase Auth o JWT local
│   ├── js/firebase-config.template.js
│   └── css/styles.css
│
└── functions/                   ← (Legacy) Cloud Functions - ya no se usa
```

## Desarrollo Local

El backend local (SQLite) sigue funcionando sin cambios:

```bash
npm run dev
# → http://localhost:3000 (Express + SQLite + JWT)
```

## Solución de Problemas

### No puedo hacer login
- Verifica que creaste el usuario en Authentication
- Verifica que creaste el documento en Firestore/usuarios con el mismo UID
- Abre la consola del navegador (F12) para ver errores

### Error en App Hosting build
- Verifica que `package.json` tiene scripts `build` y `start`
- Verifica que `apphosting.yaml` existe en la raíz del proyecto

### Error de permisos en Firestore
- Verifica que desplegaste las reglas: `firebase deploy --only firestore`
- Verifica que el usuario tiene el campo `rol` correcto en Firestore

### Ver logs del servidor
```bash
# Logs de App Hosting / Cloud Run
gcloud run logs read --project asignacion-maternal

# O desde Firebase Console → App Hosting → Logs
```

## Comandos Útiles

```bash
# Desarrollo local (SQLite)
npm run dev

# Poblar datos en Firestore
npm run seed

# Deploy reglas Firestore
firebase deploy --only firestore

# Ver proyectos
firebase projects:list

# Emuladores locales (Firestore + Auth)
firebase emulators:start --only firestore,auth
```

## Estructura de Costos Estimada (Plan Blaze)

Con uso moderado (<100 solicitudes/mes):
- **Cloud Run (App Hosting)**: ~$0-2/mes (escala a cero)
- **Firestore**: ~$0.50/mes
- **Authentication**: Gratis (hasta 50k usuarios)

**Total estimado**: $0.50 - $2.50/mes

> Los servicios de PDF (pdfkit), Excel (exceljs) y email (nodemailer)
> están completamente implementados. Los archivos temporales se escriben
> en `/tmp/` como requiere Cloud Run.

## Soporte

- [Firebase App Hosting Docs](https://firebase.google.com/docs/app-hosting)
- [Firebase Console](https://console.firebase.google.com/)
- [Stack Overflow - Firebase](https://stackoverflow.com/questions/tagged/firebase)
