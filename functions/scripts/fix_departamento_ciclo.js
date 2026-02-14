const path = require('path');
(async () => {
  try {
    const db = require('../database');
    await db.initDatabase();

    const beforeExact = db.prepare("SELECT COUNT(*) as cnt FROM Solicitudes_Asignacion_Maternal WHERE departamento_unidad = 'SICLO DE VIDA'").get();
    const beforeTrimUpper = db.prepare("SELECT COUNT(*) as cnt FROM Solicitudes_Asignacion_Maternal WHERE UPPER(TRIM(departamento_unidad)) = 'SICLO DE VIDA'").get();

    console.log(`Registros a corregir (exactos): ${beforeExact?.cnt || 0}`);
    console.log(`Registros a corregir (trim/upper): ${beforeTrimUpper?.cnt || 0}`);

    db.exec("UPDATE Solicitudes_Asignacion_Maternal SET departamento_unidad='CICLO DE VIDA' WHERE departamento_unidad = 'SICLO DE VIDA'");
    db.exec("UPDATE Solicitudes_Asignacion_Maternal SET departamento_unidad='CICLO DE VIDA' WHERE UPPER(TRIM(departamento_unidad)) = 'SICLO DE VIDA'");

    const after = db.prepare("SELECT COUNT(*) as cnt FROM Solicitudes_Asignacion_Maternal WHERE UPPER(TRIM(departamento_unidad)) = 'SICLO DE VIDA'").get();
    console.log(`Registros restantes con error: ${after?.cnt || 0}`);

    console.log('Corrección completada.');
    process.exit(0);
  } catch (e) {
    console.error('Error en corrección:', e);
    process.exit(1);
  }
})();
