/**
 * Servicio para generar IDs correlativos para solicitudes
 * Ministerio de las Culturas, las Artes y el Patrimonio - Chile
 */

const { db } = require('../database');

/**
 * Obtiene el siguiente ID correlativo para solicitudes
 * @returns {Promise<number>} Siguiente ID disponible
 */
async function getNextSolicitudId() {
    try {
        // Referencia al documento contador
        const contadorRef = db.collection('Contadores').doc('solicitudes');
        
        // Transacción atómica para garantizar unicidad
        const result = await db.runTransaction(async (transaction) => {
            const contadorDoc = await transaction.get(contadorRef);
            
            let currentId = 0;
            
            if (contadorDoc.exists) {
                currentId = contadorDoc.data().ultimo_id || 0;
            } else {
                // Si no existe, crear el documento con ID inicial
                transaction.set(contadorRef, {
                    ultimo_id: 0,
                    created_at: new Date(),
                    collection: 'Solicitudes_Asignacion_Maternal'
                });
            }
            
            // Incrementar el ID
            const nextId = currentId + 1;
            
            // Actualizar el contador
            transaction.update(contadorRef, {
                ultimo_id: nextId,
                updated_at: new Date()
            });
            
            return nextId;
        });
        
        console.log(`🔢 Generado ID correlativo: ${result}`);
        return result;
        
    } catch (error) {
        console.error('❌ Error al generar ID correlativo:', error);
        throw new Error('No se pudo generar el ID correlativo');
    }
}

/**
 * Reinicia el contador de IDs (solo para uso administrativo)
 * @param {number} nuevoId - Nuevo valor inicial del contador
 */
async function resetContadorSolicitudes(nuevoId = 0) {
    try {
        const contadorRef = db.collection('Contadores').doc('solicitudes');
        
        await contadorRef.set({
            ultimo_id: nuevoId,
            reset_at: new Date(),
            collection: 'Solicitudes_Asignacion_Maternal',
            reset_by: 'admin'
        });
        
        console.log(`🔄 Contador reiniciado a: ${nuevoId}`);
        return true;
        
    } catch (error) {
        console.error('❌ Error al reiniciar contador:', error);
        throw new Error('No se pudo reiniciar el contador');
    }
}

/**
 * Obtiene el estado actual del contador
 * @returns {Promise<Object>} Estado del contador
 */
async function getContadorEstado() {
    try {
        const contadorDoc = await db.collection('Contadores').doc('solicitudes').get();
        
        if (contadorDoc.exists) {
            const data = contadorDoc.data();
            return {
                ultimo_id: data.ultimo_id || 0,
                siguiente_id: (data.ultimo_id || 0) + 1,
                created_at: data.created_at,
                updated_at: data.updated_at,
                reset_at: data.reset_at
            };
        } else {
            return {
                ultimo_id: 0,
                siguiente_id: 1,
                created_at: null,
                updated_at: null,
                reset_at: null
            };
        }
        
    } catch (error) {
        console.error('❌ Error al obtener estado del contador:', error);
        throw new Error('No se pudo obtener el estado del contador');
    }
}

/**
 * Asigna IDs correlativos a solicitudes existentes que no tienen ID numérico
 * @returns {Promise<Object>} Resultado de la migración
 */
async function asignarIdsExistente() {
    try {
        console.log('🔄 Iniciando migración de IDs correlativos...');
        
        // Obtener todas las solicitudes ordenadas por fecha de creación
        const snapshot = await db.collection('Solicitudes_Asignacion_Maternal')
            .orderBy('fecha_registro', 'asc')
            .get();
        
        const solicitudes = snapshot.docs;
        const contadorRef = db.collection('Contadores').doc('solicitudes');
        
        let actualizadas = 0;
        let errores = 0;
        
        // Procesar en lotes para evitar timeouts
        const batchSize = 100;
        
        for (let i = 0; i < solicitudes.length; i += batchSize) {
            const batch = db.batch();
            const batchSolicitudes = solicitudes.slice(i, i + batchSize);
            
            for (const doc of batchSolicitudes) {
                const solicitud = doc.data();
                
                // Si ya tiene id_numerico, saltar
                if (solicitud.id_numerico) {
                    continue;
                }
                
                try {
                    // Obtener el siguiente ID
                    const nextId = await getNextSolicitudId();
                    
                    // Asignar el ID numérico
                    batch.update(doc.ref, {
                        id_numerico: nextId,
                        id_asignado_at: new Date()
                    });
                    
                    actualizadas++;
                    
                } catch (error) {
                    console.error(`Error asignando ID a ${doc.id}:`, error);
                    errores++;
                }
            }
            
            // Ejecutar el batch
            await batch.commit();
            console.log(`✅ Procesados ${Math.min(i + batchSize, solicitudes.length)}/${solicitudes.length} documentos`);
        }
        
        console.log(`🎉 Migración completada: ${actualizadas} actualizadas, ${errores} errores`);
        
        return {
            total: solicitudes.length,
            actualizadas: actualizadas,
            errores: errores,
            mensaje: `Migración completada: ${actualizadas} solicitudes actualizadas`
        };
        
    } catch (error) {
        console.error('❌ Error en migración de IDs:', error);
        throw new Error('Error en la migración de IDs correlativos');
    }
}

module.exports = {
    getNextSolicitudId,
    resetContadorSolicitudes,
    getContadorEstado,
    asignarIdsExistente
};
