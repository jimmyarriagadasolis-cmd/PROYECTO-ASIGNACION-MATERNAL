/**
 * Configuración de Firebase - TEMPLATE
 * Ministerio de las Culturas, las Artes y el Patrimonio - Chile
 *
 * INSTRUCCIONES:
 * 1. Copia este archivo como "firebase-config.js" en la misma carpeta
 * 2. Reemplaza los valores con los de tu proyecto Firebase
 *    (Firebase Console → Project Settings → General → Your apps → Web app)
 * 3. El archivo firebase-config.js está en .gitignore por seguridad
 */

const firebaseConfig = {
    apiKey: "TU_API_KEY_AQUI",
    authDomain: "TU_PROJECT_ID.firebaseapp.com",
    projectId: "TU_PROJECT_ID",
    storageBucket: "TU_PROJECT_ID.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123def456",
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Exportar instancias para uso global
const firebaseAuth = firebase.auth();
