/**
 * Script para Cambiar la Contraseña de un Usuario en Firebase Authentication
 * 
 * Ejecución: node functions/scripts/change-password.js <email_del_usuario> <nueva_contraseña>
 * 
 * Ejemplo:
 * node functions/scripts/change-password.js jdoe@email.com "nuevaContraseñaSuperSegura123"
 */

const { getAuth } = require('firebase-admin/auth');
require('../database'); // Inicializa la conexión con Firebase

async function changePassword() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error('Error: Faltan argumentos.');
        console.error('Uso: node functions/scripts/change-password.js <email_del_usuario> <nueva_contraseña>');
        process.exit(1);
    }

    const [email, newPassword] = args;

    if (!newPassword || newPassword.length < 8) {
        console.error('Error: La nueva contraseña debe tener al menos 8 caracteres.');
        process.exit(1);
    }

    const auth = getAuth();

    try {
        console.log(`Buscando al usuario con email "${email}"...`);
        const userRecord = await auth.getUserByEmail(email);
        
        await auth.updateUser(userRecord.uid, {
            password: newPassword
        });

        console.log('============================================================');
        console.log(`✅ Contraseña del usuario "${email}" actualizada exitosamente.`);
        console.log('============================================================');

    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            console.error(`Error: No se encontró ningún usuario con el email "${email}".`);
        } else {
            console.error('Error al cambiar la contraseña:', error);
        }
        process.exit(1);
    }
}

changePassword();
