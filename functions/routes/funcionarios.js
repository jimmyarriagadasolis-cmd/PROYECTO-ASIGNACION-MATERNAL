/**
 * Rutas de Funcionarios
 * Búsqueda y autocompletado desde la colección Funcionarios en Firestore
 */

const express = require('express');
const router = express.Router();
const { db } = require('../database');

/**
 * GET /api/funcionarios/buscar?q=...
 * Búsqueda optimizada con Firebase Firestore
 * Implementa caché, paginación y mejores prácticas
 * Query params: q (required), limit (optional, default 10), offset (optional, default 0)
 */
router.get('/buscar', async (req, res) => {
    try {
        const { q, limit = 10, offset = 0 } = req.query;
        
        // Validación de entrada mejorada
        if (!q || q.length < 2) {
            return res.json({ 
                success: true, 
                data: [],
                total: 0,
                cached: false,
                message: 'Query too short or missing'
            });
        }

        const searchQuery = q.trim().toUpperCase();
        const cacheKey = `funcionarios:${searchQuery}:${limit}:${offset}`;
        
        // Implementar caché en memoria para desarrollo
        const cache = getCache();
        const cached = cache.get(cacheKey);
        
        if (cached) {
            return res.json({
                success: true,
                data: cached.data,
                total: cached.total,
                cached: true,
                timestamp: cached.timestamp,
                message: 'Results from cache'
            });
        }

        // Estrategia de búsqueda optimizada
        const results = await searchFuncionariosOptimized(searchQuery, parseInt(limit), parseInt(offset));
        
        // Guardar en caché con TTL de 5 minutos
        cache.set(cacheKey, {
            data: results.data,
            total: results.total,
            timestamp: new Date().toISOString()
        }, 300); // TTL: 5 minutos

        res.json({
            success: true,
            data: results.data,
            total: results.total,
            cached: false,
            message: 'Fresh results from Firestore'
        });

    } catch (error) {
        console.error('Error al buscar funcionarios:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error interno al buscar funcionarios',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * GET /api/funcionarios/:rut
 * Obtiene un funcionario por su RUT con validación mejorada y caché
 */
router.get('/:rut', async (req, res) => {
    try {
        const rutParam = req.params.rut;
        
        // Validación del parámetro RUT
        if (!rutParam || rutParam.length < 2) {
            return res.status(400).json({ 
                success: false, 
                error: 'RUT inválido o demasiado corto',
                code: 'INVALID_RUT'
            });
        }

        const rutId = normalizeRut(rutParam);
        
        // Intentar caché primero
        const cache = getCache();
        const cacheKey = `funcionario:${rutId}`;
        const cached = cache.get(cacheKey);
        
        if (cached) {
            return res.json({ 
                success: true, 
                data: cached.data,
                cached: true,
                timestamp: cached.timestamp
            });
        }

        // Búsqueda optimizada: primero buscar por RUT exacto
        let doc = await db.collection('Funcionarios').doc(rutId).get();
        
        // Si no se encuentra por RUT normalizado, intentar búsqueda en campo rut
        if (!doc.exists) {
            const querySnapshot = await db.collection('Funcionarios')
                .where('rut', '==', rutParam)
                .limit(1)
                .get();
            
            if (!querySnapshot.empty) {
                doc = querySnapshot.docs[0];
            }
        }

        if (!doc.exists) {
            return res.status(404).json({ 
                success: false, 
                error: 'Funcionario no encontrado',
                code: 'NOT_FOUND',
                rut_searched: rutId
            });
        }

        const funcionarioData = {
            id: doc.id,
            ...doc.data()
        };

        // Guardar en caché por 10 minutos
        cache.set(cacheKey, {
            data: funcionarioData,
            timestamp: new Date().toISOString()
        }, 600);

        res.json({ 
            success: true, 
            data: funcionarioData,
            cached: false,
            message: 'Funcionario encontrado exitosamente'
        });
        
    } catch (error) {
        console.error('Error al obtener funcionario:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error interno al obtener funcionario',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * DELETE /api/funcionarios/cache
 * Limpia la caché de funcionarios (solo para desarrollo/admin)
 */
router.delete('/cache', async (req, res) => {
    try {
        const cache = getCache();
        const cacheSize = cache.size();
        cache.clear();
        
        res.json({ 
            success: true, 
            message: 'Caché limpiada exitosamente',
            cleared_entries: cacheSize,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error al limpiar caché:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error al limpiar caché'
        });
    }
});

/**
 * GET /api/funcionarios/stats
 * Estadísticas del sistema de funcionarios
 */
router.get('/stats', async (req, res) => {
    try {
        const cache = getCache();
        const cacheSize = cache.size();
        
        // Obtener estadísticas básicas de Firestore
        const statsSnapshot = await db.collection('Funcionarios')
            .select('area', 'genero', 'tipo_funcionario')
            .get();
        
        const stats = {
            total_funcionarios: statsSnapshot.size,
            cache_size: cacheSize,
            areas: {},
            generos: {},
            tipos_funcionario: {},
            last_updated: new Date().toISOString()
        };
        
        statsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            
            // Contar por área
            const area = data.area || 'Sin área';
            stats.areas[area] = (stats.areas[area] || 0) + 1;
            
            // Contar por género
            const genero = data.genero || 'No especificado';
            stats.generos[genero] = (stats.generos[genero] || 0) + 1;
            
            // Contar por tipo de funcionario
            const tipo = data.tipo_funcionario || 'Sin tipo';
            stats.tipos_funcionario[tipo] = (stats.tipos_funcionario[tipo] || 0) + 1;
        });
        
        res.json({ 
            success: true, 
            data: stats
        });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error al obtener estadísticas'
        });
    }
});

/**
 * Función auxiliar para búsqueda optimizada con Firestore
 * Implementa estrategia de búsqueda por etapas para mejor performance
 */
async function searchFuncionariosOptimized(query, limit, offset) {
    const results = [];
    let total = 0;

    try {
        // 1. Búsqueda por RUT exacto primero (más eficiente)
        if (isRutFormat(query)) {
            const rutDoc = await db.collection('Funcionarios')
                .doc(normalizeRut(query))
                .get();
            
            if (rutDoc.exists) {
                const data = rutDoc.data();
                results.push({
                    id: rutDoc.id,
                    rut: data.rut,
                    nombre_completo: data.nombre_completo,
                    area: data.area,
                    cargo: data.cargo,
                    genero: data.genero,
                    grado: data.grado,
                    calidad_juridica: data.calidad_juridica,
                    tipo_funcionario: data.tipo_funcionario,
                    num_cargas: data.num_cargas,
                    score: 100 // Puntuación alta para RUT exacto
                });
                total = 1;
            }
        }

        // 2. Búsqueda por nombre con índices compuestos
        if (results.length < limit + offset) {
            const nombreQuery = await db.collection('Funcionarios')
                .orderBy('nombre_completo')
                .startAt(query)
                .endAt(query + '\uf8ff')
                .limit((limit + offset) - results.length)
                .get();

            nombreQuery.docs.forEach(doc => {
                const data = doc.data();
                // Evitar duplicados con RUT exacto
                if (!results.some(r => r.id === doc.id)) {
                    const score = calculateSearchScore(query, data);
                    
                    results.push({
                        id: doc.id,
                        rut: data.rut,
                        nombre_completo: data.nombre_completo,
                        area: data.area,
                        cargo: data.cargo,
                        genero: data.genero,
                        grado: data.grado,
                        calidad_juridica: data.calidad_juridica,
                        tipo_funcionario: data.tipo_funcionario,
                        num_cargas: data.num_cargas,
                        score: score
                    });
                }
            });
        }

        // 3. Búsqueda por área si aún no hay suficientes resultados
        if (results.length < limit + offset && query.length > 3) {
            const areaQuery = await db.collection('Funcionarios')
                .where('area', '>=', query)
                .where('area', '<=', query + '\uf8ff')
                .limit((limit + offset) - results.length)
                .get();

            areaQuery.docs.forEach(doc => {
                const data = doc.data();
                // Evitar duplicados
                if (!results.some(r => r.id === doc.id)) {
                    results.push({
                        id: doc.id,
                        rut: data.rut,
                        nombre_completo: data.nombre_completo,
                        area: data.area,
                        cargo: data.cargo,
                        genero: data.genero,
                        grado: data.grado,
                        calidad_juridica: data.calidad_juridica,
                        tipo_funcionario: data.tipo_funcionario,
                        num_cargas: data.num_cargas,
                        score: 30 // Puntuación más baja para coincidencias de área
                    });
                }
            });
        }

        // 4. Fallback: búsqueda en memoria solo si es necesario (último recurso)
        if (results.length < 5 && query.length >= 2) {
            console.log('Usando fallback de búsqueda en memoria para:', query);
            const fallbackResults = await fallbackSearch(query, results.map(r => r.id));
            
            fallbackResults.forEach(doc => {
                const data = doc.data();
                results.push({
                    id: doc.id,
                    rut: data.rut,
                    nombre_completo: data.nombre_completo,
                    area: data.area,
                    cargo: data.cargo,
                    genero: data.genero,
                    grado: data.grado,
                    calidad_juridica: data.calidad_juridica,
                    tipo_funcionario: data.tipo_funcionario,
                    num_cargas: data.num_cargas,
                    score: 20 // Puntuación más baja para fallback
                });
            });
        }

        // Ordenar por puntuación y nombre
        results.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.nombre_completo.localeCompare(b.nombre_completo || '');
        });

        return {
            data: results.slice(offset, offset + limit),
            total: results.length
        };

    } catch (error) {
        console.error('Error en búsqueda optimizada:', error);
        throw error;
    }
}

/**
 * Fallback: búsqueda en memoria como último recurso
 * Solo se usa si las búsquedas indexadas no dan suficientes resultados
 */
async function fallbackSearch(query, excludeIds) {
    const results = [];
    const snapshot = await db.collection('Funcionarios').get();
    
    snapshot.docs.forEach(doc => {
        if (excludeIds.includes(doc.id)) return;
        
        const f = doc.data();
        const rutClean = (f.rut || '').replace(/\./g, '').toUpperCase();
        const rutSinFormato = (f.rut_sin_formato || '').toUpperCase();
        const nombre = (f.nombre_completo || '').toUpperCase();

        const matchesRut = rutClean.includes(query) || rutSinFormato.includes(query);
        const matchesNombre = nombre.includes(query);

        if (matchesRut || matchesNombre) {
            results.push(doc);
        }
    });
    
    return results.slice(0, 10); // Limitar fallback
}

/**
 * Funciones auxiliares de utilidad
 */
function isRutFormat(str) {
    return /^[0-9]{7,8}[0-9Kk]$/.test(str.replace(/[^0-9kK]/gi, ''));
}

function normalizeRut(rut) {
    return rut.replace(/[^0-9kK]/gi, '').toUpperCase();
}

function calculateSearchScore(query, funcionario) {
    let score = 0;
    const nombre = (funcionario.nombre_completo || '').toUpperCase();
    const area = (funcionario.area || '').toUpperCase();
    
    // Coincidencia exacta en nombre
    if (nombre === query) score += 100;
    // Coincidencia al inicio del nombre
    else if (nombre.startsWith(query)) score += 80;
    // Coincidencia en cualquier parte del nombre
    else if (nombre.includes(query)) score += 60;
    
    // Coincidencia en área
    if (area.includes(query)) score += 30;
    
    return score;
}

/**
 * Sistema de caché en memoria para desarrollo
 * En producción, reemplazar con Redis o Firestore
 */
function getCache() {
    if (!global.funcionariosCache) {
        global.funcionariosCache = new Map();
    }
    
    return {
        get: (key) => {
            const item = global.funcionariosCache.get(key);
            if (item && Date.now() - item.timestamp < 300000) { // 5 minutos
                return item;
            }
            return null;
        },
        set: (key, value, ttl = 300) => {
            global.funcionariosCache.set(key, {
                ...value,
                timestamp: Date.now()
            });
        },
        clear: () => {
            global.funcionariosCache.clear();
        },
        size: () => {
            return global.funcionariosCache.size;
        }
    };
}

module.exports = router;
