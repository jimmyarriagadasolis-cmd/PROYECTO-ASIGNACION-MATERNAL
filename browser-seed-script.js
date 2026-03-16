// SCRIPT PARA SEMBRAR FUNCIONARIOS DESDE EL NAVEGADOR
// Copia y pega este código en la consola del navegador cuando estés en:
// https://console.firebase.google.com/project/asignacion-maternal/firestore

(async function() {
    console.log('🚀 Iniciando sembrado de funcionarios desde navegador...');
    
    // Datos de ejemplo (primeros 5 funcionarios del Excel)
    const funcionarios = [
        {
            id: "047599636",
            rut: "04.759.963-6",
            nombre_completo: "Torres Gonzalez Carlos Sergio",
            area: "ORQUESTA",
            calidad_juridica: "CODIGO DEL TRABAJO",
            asig_profesional: "N",
            genero: "M",
            grado: "19",
            escalafon: "SIN ESCALAFON",
            tipo_funcionario: "CODIGO DEL TRABAJO",
            cargo: "OTRO",
            num_cargas: 0,
            tipo_pago: "Banco",
            banco: "BCOESTADO",
            tipo_cuenta: "CUENTA RUT"
        },
        {
            id: "054314027",
            rut: "05.431.402-7",
            nombre_completo: "Ganga Martinez Guillermo",
            area: "DEPARTAMENTO DE FOMENTO DE LA CULTURA Y LAS ARTES",
            calidad_juridica: "CONSEJERO REGIONAL",
            asig_profesional: "N",
            genero: "M",
            grado: "0",
            escalafon: "SIN ESCALAFON",
            tipo_funcionario: "CONSEJERO REGIONAL",
            cargo: "CONSEJOS - REGIONALES",
            num_cargas: 0,
            tipo_pago: "Cheque",
            banco: "",
            tipo_cuenta: ""
        },
        {
            id: "054332785",
            rut: "05.433.278-5",
            nombre_completo: "Cerda Romo Ana Maria",
            area: "PROG. 001 SEREMI LOS LAGOS",
            calidad_juridica: "CONTRATA",
            asig_profesional: "S",
            genero: "F",
            grado: "6",
            escalafon: "PROFESIONAL",
            tipo_funcionario: "FUNC. SUBSECRETARIA",
            cargo: "COORDINADOR/A REGIONAL DE CIUDADANÍA CULTURAL",
            num_cargas: 0,
            tipo_pago: "Banco",
            banco: "BCOESTADO",
            tipo_cuenta: "CUENTA CORRIENTE"
        },
        {
            id: "055115907",
            rut: "05.511.590-7",
            nombre_completo: "Hernandez Ramirez Jaime",
            area: "BAFONA",
            calidad_juridica: "CODIGO DEL TRABAJO",
            asig_profesional: "N",
            genero: "M",
            grado: "4",
            escalafon: "ELENCO",
            tipo_funcionario: "CODIGO DEL TRABAJO",
            cargo: "DIRECTOR (A) ARTISTICO",
            num_cargas: 0,
            tipo_pago: "Banco",
            banco: "BCOSANSTGO",
            tipo_cuenta: "CUENTA CORRIENTE"
        },
        {
            id: "056428623",
            rut: "05.642.862-3",
            nombre_completo: "Tramon Martinez Elias",
            area: "PROG. 001 SEREMI VALPARAISO",
            calidad_juridica: "CONSEJERO REGIONAL",
            asig_profesional: "N",
            genero: "M",
            grado: "0",
            escalafon: "SIN ESCALAFON",
            tipo_funcionario: "CONSEJERO REGIONAL",
            cargo: "CONSEJOS - REGIONALES",
            num_cargas: 0,
            tipo_pago: "Cheque",
            banco: "",
            tipo_cuenta: ""
        }
    ];

    try {
        // Obtener referencia a Firestore desde la consola de Firebase
        const db = firebase.firestore();
        let exitos = 0;
        let errores = 0;

        console.log(`📊 Procesando ${funcionarios.length} funcionarios...`);

        // Procesar cada funcionario
        for (let i = 0; i < funcionarios.length; i++) {
            const func = funcionarios[i];
            try {
                await db.collection('Funcionarios').doc(func.id).set(func, { merge: true });
                console.log(`✅ ${i + 1}. ${func.nombre_completo} (${func.rut})`);
                exitos++;
            } catch (error) {
                console.error(`❌ Error en ${func.nombre_completo}:`, error);
                errores++;
            }
            
            // Pequeña pausa para no sobrecargar
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log(`\n🎉 Sembrado completado!`);
        console.log(`✅ Exitos: ${exitos}`);
        console.log(`❌ Errores: ${errores}`);
        console.log(`\n📋 Colección 'Funcionarios' ahora tiene ${exitos} registros.`);
        console.log(`\n🔄 Recarga la página de Firestore para ver los nuevos documentos.`);
        
    } catch (error) {
        console.error('❌ Error general:', error);
        console.log('\n💡 Asegúrate de estar en la consola de Firebase Firestore:');
        console.log('https://console.firebase.google.com/project/asignacion-maternal/firestore');
    }
})();
