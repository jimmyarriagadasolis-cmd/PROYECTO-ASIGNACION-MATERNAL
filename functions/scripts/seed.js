/**
 * Script de Siembra (Seeding) para Firestore
 * 
 * Ejecución: node functions/scripts/seed.js
 * 
 * Este script inicializa la base de datos de Firestore con los datos esenciales:
 * 1. Un usuario administrador.
 * 2. La configuración de los tramos de asignación.
 */

const { db } = require('../database'); // Importa la instancia de Firestore inicializada
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

async function seedDatabase() {
    console.log('Iniciando el proceso de siembra en Firestore...');

    try {
        // 1. Crear Usuario Administrador
        console.log('Verificando/Creando usuario admin...');
        const adminUsername = 'admin';
        const adminRef = db.collection('Usuarios').where('username', '==', adminUsername);
        const adminSnapshot = await adminRef.get();

        if (adminSnapshot.empty) {
            const tempPassword = crypto.randomBytes(8).toString('hex');
            const passwordHash = bcrypt.hashSync(tempPassword, 10);

            await db.collection('Usuarios').add({
                username: adminUsername,
                password_hash: passwordHash,
                nombre_completo: 'Administrador del Sistema',
                email: 'admin@cultura.gob.cl',
                rol: 'Administrador',
                departamento: 'Tecnologías de la Información',
                activo: true,
                fecha_creacion: new Date()
            });
            console.log('************************************************************');
            console.log('Usuario "admin" creado exitosamente.');
            console.log(`Contraseña temporal: ${tempPassword}`);
            console.log('¡Guarda esta contraseña en un lugar seguro!');
            console.log('************************************************************');
        } else {
            console.log('El usuario "admin" ya existe. No se realizaron cambios.');
        }

        // 2. Crear Configuración de Tramos
        console.log('Verificando/Creando configuración de tramos...');
        const tramosRef = db.collection('Configuracion').doc('tramos');
        const tramosDoc = await tramosRef.get();

        if (!tramosDoc.exists) {
            // Valores según la ley 21.647 a Diciembre 2023. 
            // Es importante que el cliente pueda actualizarlos desde el frontend.
            await tramosRef.set({
                tramoA: { limite_renta: 543598, monto_asignacion: 20328 },
                tramoB: { limite_renta: 794045, monto_asignacion: 12475 },
                tramoC: { limite_renta: 1238450, monto_asignacion: 3942 },
                tramoD: { limite_renta: Infinity, monto_asignacion: 0 },
                fecha_vigencia: '2023-12-01',
                fuente: 'Ley 21.647'
            });
            console.log('Configuración de tramos creada exitosamente.');
        } else {
            console.log('La configuración de tramos ya existe. No se realizaron cambios.');
        }

        console.log('\nSiembra de datos completada exitosamente.');

    } catch (error) {
        console.error('Error durante la siembra de la base de datos:', error);
        process.exit(1); // Salir con código de error
    }
}

// IIFE para ejecutar la función asíncrona
(async () => {
    await seedDatabase();
})();
