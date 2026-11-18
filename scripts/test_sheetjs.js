// Test: ¿qué ve la app al leer el original con SheetJS vendor?
const path = '/home/z/my-project/pdfpro-desktop/src/app/vendor/xlsx.full.min.js';
const XLSX = require(path);
const fs = require('fs');
const ab = fs.readFileSync('/home/z/my-project/upload/ATC CM468  11NOV.xlsx');
const wb = XLSX.read(new Uint8Array(ab), { type: 'array', cellDates: true, cellStyles: true });
const ws = wb.Sheets[wb.SheetNames[0]];
console.log('sheet:', wb.SheetNames[0], '!ref:', ws['!ref']);
const merges = ws['!merges'] || [];
console.log('merges:', merges.length);
const enc = r => XLSX.utils.encode_cell(r);
// merges de filas 2-3
merges.forEach(m => {
  if (m.s.r <= 2 && m.e.r >= 1) console.log('  merge filas1-3:', enc(m.s), ':', enc(m.e));
});
// celda D2
for (const addr of ['D2','D3','E4','E23','F31','H31','J31','R31','D33','Q6','AT2','E1']) {
  const c = ws[addr];
  if (!c) { console.log(addr, '-> <no cell>'); continue; }
  console.log(addr, '-> v=', JSON.stringify(c.v && c.v.toString().slice(0,40)), 't=', c.t, 'w=', JSON.stringify(c.w),
    '\n     s=', JSON.stringify(c.s));
}
// bordes: contar celdas con s.border
let withB = 0, withA = 0, withF = 0, total = 0;
const rg = XLSX.utils.decode_range(ws['!ref']);
for (let r = rg.s.r; r <= rg.e.r; r++) for (let c = rg.s.c; c <= rg.e.c; c++) {
  const cell = ws[enc({r, c})]; if (!cell) continue;
  total++;
  if (cell.s && cell.s.border) withB++;
  if (cell.s && cell.s.alignment) withA++;
  if (cell.s && cell.s.font) withF++;
}
console.log('celdas:', total, 'con border:', withB, 'con alignment:', withA, 'con font:', withF);
// !cols / !rows
console.log('!cols:', JSON.stringify((ws['!cols']||[]).slice(0,8)));
console.log('!rows:', JSON.stringify((ws['!rows']||[]).slice(0,4)));
