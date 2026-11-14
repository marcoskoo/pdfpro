// Diagnóstico: extrae texto con pdfjs (igual que la app) y prueba FPLScan
const path = require('path');
const fs = require('fs');
const PDFJS = require('/home/z/my-project/public/pdfpro/vendor/pdfjs/pdf.min.js');
PDFJS.GlobalWorkerOptions.workerSrc = '/home/z/my-project/public/pdfpro/vendor/pdfjs/pdf.worker.min.js';
const FPLScan = require('/home/z/my-project/public/pdfpro/fpl-scan.js');

async function pdfText(file, maxPages) {
  const data = new Uint8Array(fs.readFileSync(file));
  const doc = await PDFJS.getDocument({ data }).promise;
  const out = [];
  const n = Math.min(doc.numPages, maxPages || 3);
  for (let i = 1; i <= n; i++) {
    const pg = await doc.getPage(i);
    const tc = await pg.getTextContent();
    out.push(tc.items.map(it => it.str).join(' '));
  }
  return { pages: doc.numPages, texts: out };
}

(async () => {
  for (const f of process.argv.slice(2)) {
    try {
      const { pages, texts } = await pdfText(f, 3);
      console.log('════ ' + path.basename(f) + ' · ' + pages + ' páginas ════');
      texts.forEach((t, i) => {
        const reg = (t.match(/REG\s*\/\s*\S{0,12}/i) || [''])[0];
        console.log(`p${i + 1}: ${t.trim().length} chars · REG→ ${JSON.stringify(reg)}`);
      });
      const todo = texts.join('\n');
      const r = FPLScan.extraerMatricula(todo);
      console.log('FPLScan:', JSON.stringify(r));
    } catch (e) { console.log('════ ' + f + ' ════ ERROR: ' + e.message); }
  }
})();
