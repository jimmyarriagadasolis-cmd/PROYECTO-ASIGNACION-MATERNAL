# Guía de Deployment a Firebase
## Sistema de Asignación Maternal

Esta guía te ayudará a desplegar la aplicación migrada a Firebase.

## Prerrequisitos

1. **Node.js** versión 18 o superior
2. **Cuenta de Google** para Firebase
3. **Firebase CLI** instalado globalmente

## Paso 1: Instalar Firebase CLI

```bash
npm install -g firebase-tools
```

## Paso 2: Login a Firebase

```bash
firebase login
```

Esto abrirá tu navegador para autenticarte con tu cuenta de Google.

## Paso 3: Crear Proyecto en Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Haz clic en "Agregar proyecto"
3. Nombre sugerido: `asignacion-maternal`
4. **IMPORTANTE**: Activa Google Analytics si lo deseas (opcional)
5. Haz clic en "Crear proyecto"

## Paso 4: Actualizar Plan a Blaze (Pago por Uso)

> **IMPORTANTE**: Firebase Functions requiere el plan Blaze para funcionar.

1. En Firebase Console, ve a "Actualizar plan"
2. Selecciona "Plan Blaze"
3. Configura límites de gasto si lo deseas (recomendado: $10-20/mes para empezar)

## Paso 5: Configurar el Proyecto Local

### 5.1. Inicializar Firebase en el proyecto

```bash
cd "c:\Users\jimmy\Documents\PROYECTO ASIGNACION MATERNAL"
firebase init
```

Cuando te pregunte:
- **¿Qué características quieres habilitar?** Selecciona:
  - ✅ Firestore
  - ✅ Functions
  - ✅ Hosting
- **¿Usar proyecto existente o crear uno nuevo?** → Usar proyecto existente
- **Selecciona proyecto:** → `asignacion-maternal` (el que creaste)
- **Firestore rules file:** → `firestore.rules` (ya existe)
- **Firestore indexes file:** → `firestore.indexes.json` (ya existe)
- **Functions language:** → JavaScript
- **ESLint:** → Yes
- **Instalar dependencias ahora:** → Yes
- **Public directory:** → `frontend`
- **Configure as single-page app:** → Yes
- **Set up automatic builds with GitHub:** → No

### 5.2. Actualizar configuración de Firebase en el frontend

1. Ve a Firebase Console → Project Settings → General
2. En "Your apps", haz clic en el ícono web (`</>`)
3. Registra la app con nombre: "Sistema Asignación Maternal Web"
4. Copia el objeto `firebaseConfig`
5. Abre `frontend/js/firebase-config.js`
6. Reemplaza los valores con los de tu proyecto:

```javascript
const firebaseConfig = {
  apiKey: "TU_API_KEY_AQUI",
  authDomain: "asignacion-maternal.firebaseapp.com",
  projectId: "asignacion-maternal",
  storageBucket: "asignacion-maternal.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456"
};
```

## Paso 6: Instalar Dependencias de Cloud Functions

```bash
cd functions
npm install
cd ..
```

## Paso 7: Crear Usuario Admin Inicial

Iremos a Firebase Console para crear el primer usuario:

1. Ve a Firebase Console → Authentication
2. Haz clic en "Get Started"
3. Habilita "Email/Password" como método de autenticación
4. Haz clic en "Add user"
5. Email: `admin@cultura.gob.cl`
6. Password: `admin123` (cámbialo después)
7. **Copia el UID del usuario** (lo necesitarás)

Ahora crea el documento del usuario en Firestore:

1. Ve a Firebase Console → Firestore Database
2. Haz clic en "Create database"
3. Selecciona modo "Production" (las reglas ya están configuradas)
4. Selecciona ubicación: `us-central1` (o la más cercana)
5. Haz clic en "Start collection"
6. ID de colección: `usuarios`
7. ID de documento: **PEGA EL UID QUE COPIASTE**
8. Agrega estos campos:
   - `username` (string): `admin`
   - `nombre_completo` (string): `Administrador del Sistema`
   - `email` (string): `admin@cultura.gob.cl`
   - `rol` (string): `administrador`
   - `departamento` (string): `TI`
   - `activo` (boolean): `true`
   - `fecha_creacion` (timestamp): *haz clic en el reloj para usar timestamp actual*

## Paso 8: Crear Configuración Inicial en Firestore

Crea la colección `configuracion` con estos documentos:

| Document ID | Campo: valor | Campo: fecha_actualizacion |
|-------------|--------------|----------------------------|
| tramo1_limite | 631976 | *timestamp actual* |
| tramo1_monto | 22007 | *timestamp actual* |
| tramo2_limite | 923067 | *timestamp actual* |
| tramo2_monto | 13505 | *timestamp actual* |
| tramo3_limite | 1439668 | *timestamp actual* |
| tramo3_monto | 4267 | *timestamp actual* |
| plazo_maximo_años | 5 | *timestamp actual* |
| meses_max_embarazo | 9 | *timestamp actual* |
| nombre_institucion | Ministerio de las Culturas, las Artes y el Patrimonio | *timestamp actual* |

## Paso 9: Desplegar a Firebase

```bash
# Desplegar todo (Firestore rules, Functions, Hosting)
firebase deploy

# O desplegar por partes:
firebase deploy --only firestore  # Solo reglas de Firestore
firebase deploy --only functions   # Solo Cloud Functions
firebase deploy --only hosting     # Solo el frontend
```

**Tiempo estimado**: 3-5 minutos

## Paso 10: Obtener la URL de Cloud Functions

Después del deploy, verás algo como:

```
✔  Deploy complete!

Functions:
  api(us-central1): https://us-central1-asignacion-maternal.cloudfunctions.net/api

Hosting URL: https://asignacion-maternal.web.app
```

### 10.1. Actualizar URL en el frontend

1. Copia la URL de Cloud Functions
2. Abre `frontend/js/app.js`
3. Busca la línea `const API_URL = ...`
4. Reemplázala con:

```javascript
const API_URL = 'https://us-central1-asignacion-maternal.cloudfunctions.net/api';
```

5. ¡NO olvides hacer re-deploy del hosting!

```bash
firebase deploy --only hosting
```

## Paso 11: Probar la Aplicación

1. Abre la **Hosting URL** en tu navegador: `https://asignacion-maternal.web.app`
2. Deberías ver la pantalla de login
3. Ingresa:
   - Usuario: `admin@cultura.gob.cl`
   - Contraseña: `admin123`
4. Deberías entrar al dashboard

## Solución de Problemas Comunes

### Error: "Firebase CLI not found"
```bash
npm install -g firebase-tools
```

### Error: "Permission denied" al instalar Firebase CLI
```bash
# En Windows, ejecuta PowerShell como Administrador
npm install -g firebase-tools
```

### Error: "Quota exceeded" en Cloud Functions
- Verifica que activaste el plan Blaze
- Revisa los límites en Firebase Console → Usage and billing

### Error de CORS en las Cloud Functions
- Las funciones ya tienen CORS habilitado
- Si persiste, verifica que la URL en `API_URL` sea correcta

### No puedo hacer login
- Verifica que creaste el usuario en Authentication
- Verifica que creaste el documento en Firestore/usuarios
- Verifica que el email coincide en ambos lados
- Abre la consola del navegador (F12) para ver errores

## Comandos Útiles

```bash
# Ver logs de Cloud Functions en tiempo real
firebase functions:log --only api

# Servir localmente (emuladores)
firebase emulators:start

# Ver proyectos de Firebase
firebase projects:list

# Cambiar de proyecto
firebase use asignacion-maternal
```

## Próximos Pasos

1. **Cambiar contraseña del admin**: Ve a Authentication en Firebase Console
2. **Configurar dominio personalizado**: Firebase Hosting → Add custom domain
3. **Configurar envío de emails**: Implementar SendGrid o Mailgun para reportes
4. **Generar PDFs/Excel**: Implementar servicios de pdfGenerator y excelGenerator
5. **Monitorear costos**: Firebase Console → Usage and billing

## Estructura de Costos Estimada (Plan Blaze)

Con uso moderado (<100 solicitudes/mes):
- **Firestore**: ~$0.50/mes
- **Cloud Functions**: ~$1-2/mes
- **Hosting**: Gratis (dentro de límites)
- **Authentication**: Gratis (hasta 50k usuarios)

**Total estimado**: $1.50 - $2.50/mes

## Soporte

Para problemas técnicos:
- [Documentación de Firebase](https://firebase.google.com/docs)
- [Stack Overflow - Firebase](https://stackoverflow.com/questions/tagged/firebase)
- Consola de Firebase → Support → Create case

---

**¡La aplicación está lista para usar en producción!** 🎉
