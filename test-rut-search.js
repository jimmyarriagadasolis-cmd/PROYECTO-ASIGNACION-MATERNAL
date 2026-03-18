// Script para probar búsqueda por RUT
// Copiar y pegar en la consola del navegador en https://asignacion-maternal.web.app

async function testRutSearch() {
    console.log('🧪 Iniciando pruebas de búsqueda por RUT...');
    
    const testRuts = [
        '04.759.963-6',  // Con formato
        '047599636',     // Sin formato
        '05.431.402-7',  // Con formato
        '054314027'      // Sin formato
    ];
    
    for (const rut of testRuts) {
        console.log(`\n🔍 Probando RUT: ${rut}`);
        
        try {
            // Probar búsqueda general
            const searchResponse = await fetch(`/api/funcionarios/buscar?q=${encodeURIComponent(rut)}`);
            const searchData = await searchResponse.json();
            console.log(`  📊 Búsqueda general:`, searchData);
            
            // Probar búsqueda directa por RUT
            const directResponse = await fetch(`/api/funcionarios/${encodeURIComponent(rut)}`);
            const directData = await directResponse.json();
            console.log(`  🎯 Búsqueda directa:`, directData);
            
        } catch (error) {
            console.error(`  ❌ Error con RUT ${rut}:`, error);
        }
    }
    
    console.log('\n✅ Pruebas completadas');
}

// Ejecutar las pruebas
testRutSearch();
