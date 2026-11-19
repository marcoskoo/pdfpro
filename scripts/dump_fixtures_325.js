/* v3.2.5 — vuelca los items REALES de pdf.js de los planes subidos por el
   usuario a JSON, para usarlos como fixtures de la suite de pruebas
   (los mismos {str,x,y} que consume _fplItemsPagina en la app). */
const fs = require('fs'), path = require('path');
const pdfjs = require(path.join(__dirname, 'tmp_pdfjs/pdf.min.js'));

async function itemsDe(pdfPath) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  const page = await doc.getPage(1);
  const tc = await page.getTextContent();
  return tc.items.filter(i => i.str && i.str.trim()).map(i => {
    const t = i.transform || [0, 0, 0, 0, 0, 0];
    return { str: i.str, x: Math.round(t[4] * 10) / 10, y: Math.round(t[5] * 10) / 10 };
  });
}

(async () => {
  const pares = [
    ['upload/PV CIX LIM        2226.pdf', 'scripts/fixture_sru2226.json'],
    ['upload/ATC JAP 7361.pdf', 'scripts/fixture_jap7361.json']
  ];
  for (const [pdf, json] of pares) {
    const items = await itemsDe(path.join(__dirname, '..', pdf));
    const texto = items.map(i => i.str).join('\n');
    fs.writeFileSync(path.join(__dirname, '..', json), JSON.stringify({ items, texto }, null, 0));
    console.log(`✓ ${json} — ${items.length} items (${texto.length} caracteres)`);
  }
})().catch(e => { console.error('ERROR: ' + e.message); process.exit(1); });
