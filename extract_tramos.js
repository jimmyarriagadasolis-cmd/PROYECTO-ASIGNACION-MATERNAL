const XLSX = require('xlsx');
const wb = XLSX.readFile('tramos/Promedio 2018-2025 (1).xlsx');

const sheets = ['201801', '201802', '201803', '201901', '201902', '202001', '202002', '202003', '202101', '202102', '202201', '202202', '202203', '202204', '202301', '202302', '202303', '202304', '202401', '202501', '202502', '202503'];

const results = [];

sheets.forEach(s => {
    const ws = wb.Sheets[s];
    if (ws) {
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        const t1 = data[1];
        const t2 = data[2];
        const t3 = data[3];
        if (t1 && t2 && t3) {
            // Excel date to JS date
            const desde = new Date((t1[2] - 25569) * 86400000);
            const hasta = new Date((t1[3] - 25569) * 86400000);

            const formatDate = (d) => {
                return d.toISOString().split('T')[0];
            };

            results.push({
                id: s,
                ley: t1[1],
                desde: formatDate(desde),
                hasta: formatDate(hasta),
                t1_hasta: t1[5],
                t1_unit: t1[6],
                t1_duplo: t1[7],
                t2_desde: t2[4],
                t2_hasta: t2[5],
                t2_unit: t2[6],
                t2_duplo: t2[7],
                t3_desde: t3[4],
                t3_hasta: t3[5],
                t3_unit: t3[6],
                t3_duplo: t3[7]
            });
        }
    }
});

console.log(JSON.stringify(results, null, 2));
