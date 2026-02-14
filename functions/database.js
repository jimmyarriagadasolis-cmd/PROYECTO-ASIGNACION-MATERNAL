const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const admin = require('firebase-admin'); // Importar el SDK completo
const fs = require('fs');
const path = require('path');

// Evitar la doble inicialización.
if (admin.apps.length === 0) {
  // En el entorno de App Hosting, la inicialización es automática.
  if (process.env.GOOGLE_CLOUD_PROJECT) {
    console.log('Inicializando Firebase Admin SDK en el entorno de producción.');
    initializeApp();
  } else {
    // Para el entorno local, buscar la clave de servicio.
    console.log('Inicializando Firebase Admin SDK para el entorno local.');
    const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      initializeApp({
        credential: cert(serviceAccount)
      });
    } else {
      console.error('Error crítico: El archivo "serviceAccountKey.json" no se encontró en la carpeta /functions.');
      console.error('Este archivo es necesario para que el backend se comunique con los servicios de Firebase en un entorno local.');
      console.error('Por favor, descárgalo desde la configuración de tu proyecto en Firebase y colócalo en la carpeta "functions".');
      process.exit(1); // Detener el proceso si no se puede autenticar.
    }
  }
}

// Obtener la instancia de la base de datos de Firestore.
const db = getFirestore();

// Exportar tanto la base de datos (db) como el SDK de administración (admin).
// Esto permite que otras partes de la aplicación (como el middleware de autenticación) usen `admin.auth()`.
module.exports = { db, admin };
