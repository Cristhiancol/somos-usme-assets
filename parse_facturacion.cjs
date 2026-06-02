const fs = require('fs');
const xlsx = require('xlsx');

try {
  const buf = fs.readFileSync('facturacion.xlsx');
  const workbook = xlsx.read(buf, { type: 'buffer' });
  const sheet = workbook.Sheets['INFORME POR MES'];
  if (sheet) {
    const raw = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
    let count = 0;
    for (let r = 4; r < raw.length; r++) {
      const row = raw[r];
      if (!row) continue;
      const proveedor = row[3];
      if (proveedor && !proveedor.toString().toUpperCase().includes("SUBTOTAL") && !proveedor.toString().includes("Escriba aqu")) {
        console.log(row);
        count++;
        if (count > 5) break;
      }
    }
    console.log("Total valid rows (without Escriba aqu):", count);
  }
} catch(e) {
  console.error(e);
}
