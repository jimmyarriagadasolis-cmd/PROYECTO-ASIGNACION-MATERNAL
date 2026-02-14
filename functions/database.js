const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const admin = require('firebase-admin');

// En un entorno de Google Cloud (como App Hosting), el SDK se inicializa 
// automáticamente con las credenciales del proyecto cuando no se pasan opciones.
// Evitamos la doble inicialización por si acaso.
if (admin.apps.length === 0) {
  console.log('Inicializando Firebase Admin SDK...');
  initializeApp();
}

// Obtener la instancia de la base de datos de Firestore.
const db = getFirestore();

// Exportar la base de datos (db) y el SDK de administración (admin) para ser usados en otras partes de la aplicación.
module.exports = { db, admin };
