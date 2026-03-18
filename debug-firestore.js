// Script para verificar estructura de datos en Firestore
// Ejecutar en la consola de Firebase: https://console.firebase.google.com/project/asignacion-maternal/firestore

(async function() {
    console.log('🔍 Verificando estructura de datos en Firestore...');
    
    try {
        const db = firebase.firestore();
        
        // Obtener algunos documentos de ejemplo
        const snapshot = await db.collection('Funcionarios').limit(5).get();
        
        console.log(`📊 Total documentos en colección: ${snapshot.size}`);
        
        snapshot.forEach(doc => {
            const data = doc.data();
            console.log('\n📄 Documento encontrado:');
            console.log(`  - ID: ${doc.id}`);
            console.log(`  - RUT: ${data.rut}`);
            console.log(`  - Nombre: ${data.nombre_completo}`);
            console.log(`  - Área: ${data.area}`);
            
            // Verificar si el ID coincide con el RUT normalizado
            const normalizedRut = data.rut ? data.rut.replace(/[^0-9kK]/gi, '').toUpperCase() : 'N/A';
            const idMatches = doc.id === normalizedRut;
            console.log(`  - ID coincide con RUT normalizado: ${idMatches ? '✅' : '❌'}`);
            console.log(`  - RUT normalizado: ${normalizedRut}`);
        });
        
        // Buscar un RUT específico si existe
        console.log('\n🔍 Buscando RUT específico 047599636...');
        const specificDoc = await db.collection('Funcionarios').doc('047599636').get();
        if (specificDoc.exists) {
            console.log('✅ Documento encontrado por ID:');
            console.log('  - Datos:', specificDoc.data());
        } else {
            console.log('❌ Documento NO encontrado por ID');
            
            // Intentar buscar por campo rut
            const querySnapshot = await db.collection('Funcionarios')
                .where('rut', '==', '04.759.963-6')
                .get();
            
            if (!querySnapshot.empty) {
                console.log('✅ Documento encontrado por campo rut:');
                querySnapshot.forEach(doc => {
                    console.log(`  - ID: ${doc.id}, RUT: ${doc.data().rut}`);
                });
            } else {
                console.log('❌ Documento NO encontrado por campo rut');
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
})();
