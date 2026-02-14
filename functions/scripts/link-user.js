/**
 * Script de único uso para vincular un usuario de Firebase Auth con su perfil en Firestore.
 */

const { admin, db } = require('../database');

// --- Configuración ---
// El email del usuario en Firebase Authentication que quieres vincular.
const USER_EMAIL_TO_LINK = 'jimmyarriagada.solis@gmail.com'; 
// ---------------------

async function linkUser() {
  if (!USER_EMAIL_TO_LINK) {
    console.error('Error: Debes especificar el email del usuario a vincular en la variable USER_EMAIL_TO_LINK.');
    return;
  }

  try {
    console.log(`Buscando al usuario de Firebase Auth con el email: ${USER_EMAIL_TO_LINK}...`);

    // 1. Obtener el usuario de Firebase Authentication para conseguir su UID.
    const userRecord = await admin.auth().getUserByEmail(USER_EMAIL_TO_LINK);
    const uid = userRecord.uid;
    console.log(`✓ Usuario de Firebase encontrado. UID: ${uid}`);

    // 2. Buscar el documento de perfil correspondiente en la colección 'Usuarios' de Firestore.
    console.log(`Buscando perfil en Firestore con el email: ${USER_EMAIL_TO_LINK}...`);
    const usuariosRef = db.collection('Usuarios');
    const snapshot = await usuariosRef.where('email', '==', USER_EMAIL_TO_LINK).limit(1).get();

    if (snapshot.empty) {
      console.error(`Error: No se encontró ningún perfil en la colección 'Usuarios' con el email ${USER_EMAIL_TO_LINK}.`);
      console.error('Verifica que el email en la base de datos sea correcto.');
      return;
    }

    const userDoc = snapshot.docs[0];
    console.log(`✓ Perfil de Firestore encontrado. ID del Documento: ${userDoc.id}`);

    // 3. Actualizar el documento del perfil para añadir el campo 'firebase_uid'.
    console.log(`Actualizando el documento para añadir el campo 'firebase_uid'...`);
    await userDoc.ref.update({
      firebase_uid: uid
    });

    console.log('¡Éxito! El usuario ha sido vinculado correctamente.');
    console.log(`El usuario ${USER_EMAIL_TO_LINK} (UID: ${uid}) ahora está enlazado a su perfil en Firestore.`);

  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error(`Error: No se encontró ningún usuario en Firebase Authentication con el email: ${USER_EMAIL_TO_LINK}.`);
      console.error('Asegúrate de que el usuario ya ha sido creado en el panel de Firebase Authentication.');
    } else {
      console.error('Ocurrió un error inesperado:', error);
    }
  }
}

// Ejecutar el script
linkUser();
