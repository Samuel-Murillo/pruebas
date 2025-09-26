// Uso: node convert_xlsx_to_json.js ../listado_asientos.xlsx ../asientos.json
// Requiere instalar: npm install xlsx
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Uso: node convert_xlsx_to_json.js input.xlsx output.json');
  process.exit(1);
}
const input = path.resolve(args[0]);
const output = path.resolve(args[1]);

const wb = xlsx.readFile(input);
const sheetName = wb.SheetNames[0];
const sheet = wb.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet, {defval: ''});
fs.writeFileSync(output, JSON.stringify(data, null, 2), 'utf8');
console.log(`Escrito ${output} con ${data.length} filas`);
