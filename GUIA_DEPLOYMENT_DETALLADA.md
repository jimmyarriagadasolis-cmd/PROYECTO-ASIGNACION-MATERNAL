# Guía Detallada de Deployment a Firebase App Hosting
## Sistema de Asignación Maternal - Ministerio de las Culturas

Esta es una guía **paso a paso** con explicaciones detalladas de cada acción.

---

## PASO 1: Instalar Firebase CLI

### ¿Qué es Firebase CLI?
Es la herramienta de línea de comandos que te permite conectar tu proyecto local con Firebase en la nube.

### Cómo hacerlo:

**En Windows (PowerShell como Administrador):**

```powershell
npm install -g firebase-tools
```

Espera a que termine (puede tomar 1-2 minutos).

**Verificar que se instaló correctamente:**

```powershell
firebase --version
```

Deberías ver algo como: `firebase-tools/13.5.0` (el número de versión puede variar)

### ¿Qué pasó?
- Instalaste la herramienta `firebase` globalmente en tu computadora
- Ahora puedes usar comandos como `firebase login`, `firebase deploy`, etc. desde cualquier carpeta

---

## PASO 2: Autenticarte con Google

### ¿Por qué?
Firebase necesita saber quién eres para conectar tu proyecto local con tu cuenta de Google.

### Cómo hacerlo:

```powershell
firebase login
```

**Esto abrirá tu navegador automáticamente.** Verás una pantalla de Google pidiendo permiso.

1. Haz clic en tu cuenta de Google (o crea una si no tienes)
2. Haz clic en "Permitir" cuando Firebase pida permisos
3. Verás un mensaje: "Success! Logged in as tu@email.com"
4. Cierra la ventana del navegador y vuelve a PowerShell

**Verificar que estás autenticado:**

```powershell
firebase projects:list
```

Deberías ver una lista de tus proyectos Firebase (si tienes alguno).

---

## PASO 3: Crear Proyecto en Firebase Console

### ¿Qué es Firebase Console?
Es el panel de control en línea donde configuras tu proyecto Firebase.

### Cómo hacerlo:

1. Abre tu navegador y ve a: https://console.firebase.google.com/

2. Haz clic en el botón **"Crear proyecto"** (o **"Add project"** si está en inglés)

3. Completa el formulario:
   - **Nombre del proyecto:** `asignacion-maternal`
   - **ID del proyecto:** Se genera automáticamente (algo como `asignacion-maternal-abc123`)
   - **Aceptar términos:** Marca la casilla
   - Haz clic en **"Continuar"**

4. En la siguiente pantalla:
   - **Google Analytics:** Puedes desactivarlo (no es necesario)
   - Haz clic en **"Crear proyecto"**

5. Espera a que se cree (puede tomar 1-2 minutos)

6. Cuando veas el dashboard, haz clic en **"Continuar"**

### ¿Qué pasó?
- Creaste un proyecto Firebase en la nube
- Este proyecto tendrá su propia base de datos Firestore, autenticación, etc.

---

## PASO 4: Actualizar a Plan Blaze (Pago por Uso)

### ¿Por qué?
Firebase App Hosting (Cloud Run) requiere el plan Blaze. El plan gratuito no lo soporta.

### Costo
- **Primeros $5 USD/mes son gratis**
- Después pagas solo por lo que uses
- Con <100 solicitudes/mes: ~$0.50-2/mes

### Cómo hacerlo:

1. En Firebase Console, ve a **"Actualizar plan"** (esquina superior derecha)

2. Selecciona **"Plan Blaze"**

3. Completa tu información de pago (tarjeta de crédito)

4. Haz clic en **"Comprar"**

5. Espera a que se actualice (unos segundos)

### ¿Qué pasó?
- Tu proyecto ahora puede usar Cloud Run (App Hosting)
- Firebase te cobrará solo por lo que uses

---

## PASO 5: Habilitar Servicios en Firebase Console

### 5.1 Crear Firestore Database

**¿Qué es Firestore?**
Es la base de datos en la nube donde se guardarán todas las solicitudes, usuarios, etc.

**Cómo hacerlo:**

1. En Firebase Console, en el menú izquierdo, ve a **"Firestore Database"**

2. Haz clic en **"Crear base de datos"**

3. Selecciona:
   - **Modo:** "Production" (no "Test mode")
   - **Ubicación:** `us-central1` (o `southamerica-east1` si quieres más cerca de Chile)

4. Haz clic en **"Crear"**

5. Espera a que se cree (puede tomar 1-2 minutos)

### 5.2 Habilitar Authentication (Autenticación)

**¿Qué es?**
Es el sistema que verifica que los usuarios sean quiénes dicen ser (login/contraseña).

**Cómo hacerlo:**

1. En Firebase Console, en el menú izquierdo, ve a **"Authentication"**

2. Haz clic en **"Get Started"** (o "Comenzar")

3. En la lista de métodos, busca **"Email/Password"**

4. Haz clic en él y actívalo (el switch debe estar en azul)

5. Haz clic en **"Guardar"**

### 5.3 Registrar tu Aplicación Web

**¿Qué es?**
Es registrar tu app en Firebase para que pueda comunicarse con los servicios.

**Cómo hacerlo:**

1. En Firebase Console, ve a **"Project Settings"** (engranaje, esquina superior derecha)

2. En la pestaña **"General"**, desplázate hacia abajo

3. En la sección **"Your apps"**, haz clic en el ícono web: `</>`

4. Completa:
   - **App nickname:** "Sistema Asignación Maternal"
   - Deja el resto como está

5. Haz clic en **"Register app"**

6. **IMPORTANTE:** Copia el objeto `firebaseConfig` que aparece (es un bloque de código JSON)

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyD...",
  authDomain: "asignacion-maternal.firebaseapp.com",
  projectId: "asignacion-maternal",
  storageBucket: "asignacion-maternal.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456"
};
```

7. Haz clic en **"Continuar a la consola"**

### ¿Qué pasó?
- Habilitaste Firestore (base de datos)
- Habilitaste Authentication (login)
- Registraste tu app web y obtuviste las credenciales

---

## PASO 6: Configurar el Proyecto Local

### 6.1 Crear firebase-config.js

**¿Qué es?**
Es un archivo que contiene las credenciales de tu proyecto Firebase. El frontend lo usa para conectarse a Firebase.

**Cómo hacerlo:**

1. Abre PowerShell en la carpeta del proyecto:

```powershell
cd "F:\respaldo JM\Proyectos\AM\PROYECTO-ASIGNACION-MATERNAL"
```

2. Copia el archivo template:

```powershell
copy frontend\js\firebase-config.template.js frontend\js\firebase-config.js
```

3. Abre el archivo creado con un editor de texto:

```powershell
notepad frontend\js\firebase-config.js
```

4. Reemplaza los valores con los que copiaste en el Paso 5.3:

```javascript
const firebaseConfig = {
  apiKey: "PEGA_TU_API_KEY_AQUI",
  authDomain: "asignacion-maternal.firebaseapp.com",
  projectId: "asignacion-maternal",
  storageBucket: "asignacion-maternal.appspot.com",
  messagingSenderId: "PEGA_TU_MESSAGING_SENDER_ID",
  appId: "PEGA_TU_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const firebaseAuth = firebase.auth();
```

5. Guarda el archivo (Ctrl+S)

### 6.2 Instalar Dependencias

**¿Qué son?**
Son las librerías que necesita tu proyecto (Express, Firebase Admin, etc.).

**Cómo hacerlo:**

```powershell
npm install
```

Espera a que termine (puede tomar 2-3 minutos). Deberías ver:
```
added 130 packages, and audited 380 packages
```

### ¿Qué pasó?
- Creaste el archivo de configuración de Firebase
- Instalaste todas las dependencias necesarias

---

## PASO 7: Crear Usuario Admin en Firebase

### 7.1 Crear Usuario en Authentication

**Cómo hacerlo:**

1. En Firebase Console, ve a **"Authentication"**

2. En la pestaña **"Users"**, haz clic en **"Add user"** (o "Agregar usuario")

3. Completa:
   - **Email:** `admin@cultura.gob.cl`
   - **Password:** `admin123` (cámbialo después en producción)

4. Haz clic en **"Add user"**

5. **IMPORTANTE:** Copia el **UID** del usuario (es un código largo como `abc123def456...`)

### 7.2 Crear Documento del Usuario en Firestore

**¿Por qué?**
Firestore necesita un documento con los datos del usuario (nombre, rol, departamento, etc.).

**Cómo hacerlo:**

1. En Firebase Console, ve a **"Firestore Database"**

2. Haz clic en **"Start collection"** (o "Crear colección")

3. Completa:
   - **Collection ID:** `usuarios`
   - Haz clic en **"Next"**

4. En "Document ID", pega el **UID que copiaste** en el paso anterior

5. Haz clic en **"Next"**

6. Ahora agrega los campos. Para cada uno, haz clic en **"Add field"**:

| Campo | Tipo | Valor |
|-------|------|-------|
| `username` | string | `admin` |
| `nombre_completo` | string | `Administrador del Sistema` |
| `email` | string | `admin@cultura.gob.cl` |
| `rol` | string | `administrador` |
| `departamento` | string | `TI` |
| `activo` | boolean | `true` |
| `fecha_creacion` | timestamp | *haz clic en el reloj para usar la fecha/hora actual* |

7. Haz clic en **"Save"**

### ¿Qué pasó?
- Creaste un usuario en Authentication (para login)
- Creaste un documento en Firestore con los datos del usuario

---

## PASO 8: Poblar Datos Iniciales en Firestore

### 8.1 Valores Históricos (23 períodos 2018-2026)

**¿Qué son?**
Son los valores de los tramos de asignación para cada año. El sistema los usa para calcular correctamente.

**Cómo hacerlo:**

```powershell
npm run seed
```

Este comando ejecuta un script que crea automáticamente la colección `valores_historicos` en Firestore.

**Deberías ver algo como:**
```
Conectando a Firestore...
Limpiando colección valores_historicos...
Seeding 23 períodos...
✓ Seed completado exitosamente
```

### 8.2 Configuración de Tramos

**¿Qué son?**
Son los límites y montos de cada tramo de asignación.

**Cómo hacerlo:**

1. En Firebase Console, ve a **"Firestore Database"**

2. Haz clic en **"Start collection"** (si no existe)

3. Completa:
   - **Collection ID:** `configuracion`
   - Haz clic en **"Next"**

4. Crea cada documento. Para cada uno:
   - **Document ID:** (el nombre de la configuración, ej: `tramo1_limite`)
   - Agrega el campo `valor` (string)
   - Haz clic en **"Save"**

**Documentos a crear:**

```
tramo1_limite         → valor: "631976"
tramo1_monto          → valor: "22007"
tramo2_limite         → valor: "923067"
tramo2_monto          → valor: "13505"
tramo3_limite         → valor: "1439668"
tramo3_monto          → valor: "4267"
plazo_maximo_años     → valor: "5"
meses_max_embarazo    → valor: "9"
nombre_institucion    → valor: "Ministerio de las Culturas, las Artes y el Patrimonio"
```

### ¿Qué pasó?
- Poblaste Firestore con los datos iniciales que necesita el sistema

---

## PASO 9: Desplegar Reglas de Firestore

### ¿Qué son las reglas?
Son las reglas de seguridad que definen quién puede leer/escribir en Firestore.

**Cómo hacerlo:**

```powershell
firebase deploy --only firestore
```

Espera a que termine. Deberías ver:
```
✔  Deploy complete!
```

### ¿Qué pasó?
- Desplegaste las reglas de seguridad de Firestore desde el archivo `firestore.rules`

---

## PASO 10: Conectar App Hosting a tu Repositorio GitHub

### ¿Por qué GitHub?
App Hosting se despliega automáticamente cada vez que haces push a tu repositorio. Es CI/CD automático.

### Cómo hacerlo:

1. En Firebase Console, ve a **"App Hosting"** (en el menú izquierdo)

2. Haz clic en **"Create backend"** (o "Crear backend")

3. Selecciona **"GitHub"** como fuente

4. Haz clic en **"Authorize with GitHub"**

5. Se abrirá GitHub. Haz login si es necesario

6. Autoriza Firebase a acceder a tus repositorios

7. Selecciona:
   - **Repository:** Tu repositorio (ej: `usuario/PROYECTO-ASIGNACION-MATERNAL`)
   - **Branch:** `main` (o `master`, la rama principal)

8. Haz clic en **"Create backend"**

9. Firebase creará un archivo `firebase.json` automáticamente (o lo actualizará)

### ¿Qué pasó?
- Conectaste tu repositorio GitHub con Firebase App Hosting
- Ahora cada vez que hagas `git push`, Firebase desplegará automáticamente

---

## PASO 11: Hacer Push a GitHub

### ¿Por qué?
App Hosting se despliega automáticamente cuando haces push. Es el trigger para el deployment.

**Cómo hacerlo:**

1. Abre PowerShell en la carpeta del proyecto

2. Verifica que tienes cambios:

```powershell
git status
```

Deberías ver archivos modificados/nuevos.

3. Agrega todos los cambios:

```powershell
git add .
```

4. Crea un commit:

```powershell
git commit -m "Deploy Firebase App Hosting - Backend Firestore"
```

5. Haz push a GitHub:

```powershell
git push origin main
```

(Si tu rama principal es `master`, usa `git push origin master`)

6. Espera a que termine

### ¿Qué pasó?
- Subiste tus cambios a GitHub
- Firebase App Hosting detectó el push automáticamente
- Comenzó el deployment

---

## PASO 12: Monitorear el Deployment

### ¿Cómo sé si se está desplegando?

**Opción 1: Firebase Console**

1. Ve a **"App Hosting"** en Firebase Console

2. Verás un estado como:
   - 🟡 **Building** (compilando)
   - 🟡 **Deploying** (desplegando)
   - 🟢 **Live** (en vivo)

3. Espera a que llegue a **"Live"** (puede tomar 3-5 minutos)

**Opción 2: Línea de comandos**

```powershell
firebase apphosting:backends:list --project asignacion-maternal
```

### ¿Qué pasó?
- Firebase está compilando tu código
- Está creando un contenedor Docker
- Está desplegando a Cloud Run

---

## PASO 13: Obtener la URL de tu Aplicación

### Cómo hacerlo:

1. En Firebase Console, ve a **"App Hosting"**

2. Cuando el estado sea **"Live"**, verás una URL como:
   ```
   https://asignacion-maternal--backend-xxxxx.us-central1.hosted.app
   ```

3. Copia esa URL

### ¿Qué pasó?
- Tu aplicación está en vivo en la nube
- Esa URL es donde accederán los usuarios

---

## PASO 14: Probar la Aplicación

### Cómo hacerlo:

1. Abre tu navegador

2. Ve a la URL que obtuviste en el Paso 13

3. Deberías ver la pantalla de login

4. Ingresa:
   - **Email:** `admin@cultura.gob.cl`
   - **Contraseña:** `admin123`

5. Haz clic en **"Ingresar"**

6. Deberías ver el dashboard

### ¿Qué pasó?
- Verificaste que tu aplicación funciona en producción
- El login funciona con Firebase Authentication
- Los datos se guardan en Firestore

---

## PASO 15: Cambiar la Contraseña del Admin (Importante)

### ¿Por qué?
`admin123` es una contraseña débil. Debes cambiarla por seguridad.

**Cómo hacerlo:**

1. En Firebase Console, ve a **"Authentication"**

2. En la pestaña **"Users"**, busca el usuario `admin@cultura.gob.cl`

3. Haz clic en el ícono de los tres puntos (⋮) al lado del usuario

4. Selecciona **"Edit password"** (o "Editar contraseña")

5. Ingresa una contraseña fuerte (ej: `Asignacion2024!Maternal`)

6. Haz clic en **"Update password"**

### ¿Qué pasó?
- Cambiaste la contraseña a algo más seguro

---

## PASO 16: Configurar SMTP para Envío de Correos (Opcional)

### ¿Qué es SMTP?
Es el protocolo para enviar correos. Si quieres que el sistema envíe reportes por correo, necesitas configurarlo.

**Cómo hacerlo:**

1. Abre tu aplicación en la URL de App Hosting

2. Haz login como admin

3. Ve a **"Configuración"** (en el menú superior)

4. En la sección **"Configuración SMTP"**, completa:
   - **Servidor SMTP:** `smtp.cultura.gob.cl` (o el de tu institución)
   - **Puerto:** `587`
   - **Usuario:** Tu email
   - **Contraseña:** Tu contraseña de correo

5. Haz clic en **"Guardar Configuración"**

### ¿Qué pasó?
- Configuraste el servidor de correo
- Ahora el sistema puede enviar reportes por email

---

## PASO 17: Monitorear Costos

### ¿Cuánto cuesta?

Con uso moderado (<100 solicitudes/mes):
- **Cloud Run (App Hosting):** ~$0-2/mes
- **Firestore:** ~$0.50/mes
- **Authentication:** Gratis (hasta 50k usuarios)

**Total:** ~$0.50-2.50/mes

### Cómo monitorear:

1. En Firebase Console, ve a **"Usage and billing"**

2. Verás un desglose de costos por servicio

3. Puedes establecer alertas de presupuesto si quieres

---

## SOLUCIÓN DE PROBLEMAS

### "No puedo hacer login"

**Posibles causas:**

1. **El usuario no existe en Authentication**
   - Solución: Crea el usuario en Firebase Console → Authentication

2. **El documento del usuario no existe en Firestore**
   - Solución: Crea el documento en Firestore con el UID del usuario

3. **El email no coincide**
   - Solución: Verifica que el email en Authentication y Firestore sean iguales

4. **Las reglas de Firestore están mal**
   - Solución: Ejecuta `firebase deploy --only firestore`

### "Error al conectar a Firestore"

**Posibles causas:**

1. **No habilitaste Firestore**
   - Solución: Ve a Firebase Console → Firestore Database → Create database

2. **Las reglas de Firestore deniegan acceso**
   - Solución: Verifica el archivo `firestore.rules` y despliégalo

3. **El proyecto no está en plan Blaze**
   - Solución: Actualiza a plan Blaze en Firebase Console

### "El deployment se queda en 'Building'"

**Posibles causas:**

1. **Error en el código**
   - Solución: Revisa los logs en Firebase Console → App Hosting → Logs

2. **Falta alguna dependencia**
   - Solución: Ejecuta `npm install` localmente y haz push nuevamente

3. **Timeout**
   - Solución: Espera más tiempo (puede tomar 5-10 minutos en la primera vez)

---

## RESUMEN RÁPIDO

| Paso | Acción | Comando/Ubicación |
|------|--------|-------------------|
| 1 | Instalar Firebase CLI | `npm install -g firebase-tools` |
| 2 | Login | `firebase login` |
| 3 | Crear proyecto | Firebase Console |
| 4 | Plan Blaze | Firebase Console → Upgrade |
| 5 | Habilitar servicios | Firebase Console → Firestore, Auth |
| 6 | Configurar local | `npm install`, crear `firebase-config.js` |
| 7 | Crear admin | Firebase Console → Auth + Firestore |
| 8 | Seed datos | `npm run seed` |
| 9 | Deploy reglas | `firebase deploy --only firestore` |
| 10 | Conectar GitHub | Firebase Console → App Hosting |
| 11 | Push | `git push origin main` |
| 12 | Monitorear | Firebase Console → App Hosting |
| 13 | Obtener URL | Firebase Console → App Hosting |
| 14 | Probar | Abre la URL en el navegador |
| 15 | Cambiar contraseña | Firebase Console → Auth |
| 16 | SMTP (opcional) | App → Configuración |

---

## PREGUNTAS FRECUENTES

**P: ¿Cuánto tiempo toma el deployment?**
R: La primera vez puede tomar 5-10 minutos. Las siguientes veces 2-3 minutos.

**P: ¿Puedo seguir usando el backend local?**
R: Sí. Usa `npm run dev` para desarrollo local. `npm start` es solo para App Hosting.

**P: ¿Qué pasa si hago un cambio?**
R: Haz `git push` y Firebase desplegará automáticamente en 2-3 minutos.

**P: ¿Puedo usar un dominio personalizado?**
R: Sí. Firebase Console → App Hosting → Custom domain.

**P: ¿Cómo veo los logs del servidor?**
R: Firebase Console → App Hosting → Logs.

---

**¡Listo! Ahora tienes una guía detallada paso a paso.** 🎉
