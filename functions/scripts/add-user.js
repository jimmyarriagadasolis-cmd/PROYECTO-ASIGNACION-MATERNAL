/**
 * Script para Añadir un Nuevo Usuario (Firebase Auth + Firestore)
 * 
 * Crea un usuario en Firebase Authentication y guarda sus datos adicionales
 * en la colección 'Usuarios' de Firestore, usando el UID como enlace.
 * 
 * Ejecución: node functions/scripts/add-user.js <username> <nombre_completo> <email> <rol> <departamento>
 */

const { db } = require('../database');
const { getAuth } = require('firebase-admin/auth');
const crypto = require('crypto');

async function addUser() {
    const args = process.argv.slice(2);
    if (args.length < 5) {
        console.error('Uso: node functions/scripts/add-user.js <username> <nombre_completo> <email> <rol> <departamento>');
        process.exit(1);
    }

    const [username, nombre_completo, email, rol, departamento] = args;
    const auth = getAuth();
    const tempPassword = crypto.randomBytes(8).toString('hex');

    try {
        // 1. Crear el usuario en Firebase Authentication
        console.log(`Creando usuario para "${email}" en Firebase Authentication...`);
        const userRecord = await auth.createUser({
            email: email,
            password: tempPassword,
            displayName: nombre_completo,
            disabled: false
        });

        console.log(`✅ Usuario creado en Auth con UID: ${userRecord.uid}`);

        // 2. Guardar datos adicionales en Firestore usando el UID como ID del documento
        console.log('Guardando datos de perfil en Firestore...');
        await db.collection('Usuarios').doc(userRecord.uid).set({
            username,
            nombre_completo,
            email,
            rol,
            departamento,
            activo: true,
            fecha_creacion: new Date()
        });
        console.log('✅ Datos de perfil guardados en Firestore.');
        console.log('\n============================================================');
        console.log('            CREDENCIALES DEL NUEVO USUARIO');
        console.log('============================================================');
        console.log(`   Usuario (para login): ${email}`);
        console.log(`   Contraseña temporal: ${tempPassword}`);
        console.log('============================================================\n');

    } catch (error) {
        if (error.code === 'auth/email-already-exists') {
            console.error(`Error: El email "${email}" ya está registrado en Firebase Authentication.`);
            console.error('Por favor, utiliza un email diferente o elimina el usuario existente.');
        } else {
            console.error('Error al crear el usuario:', error);
        }
        process.exit(1);
    }
}

addUser();
