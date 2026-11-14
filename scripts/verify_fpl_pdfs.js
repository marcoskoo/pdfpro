/* Verifica el texto extraíble de los PDFs de prueba con el MISMO pdf.js de la app.
 * Ejecutar: node /home/z/my-project/scripts/verify_fpl_pdfs.js */
'use strict';
globalThis.pdfjsLib = require('/home/z/my-project/public/pdfpro/vendor/pdfjs/pdf.min.js');
globalThis.pdfjsLib.GlobalWorkerOptions.workerSrc = '/home/z/my-project/public/pdfpro/vendor/pdfjs/pdf.worker.min.js';
const FPLScan = require('/home/z/my-project/public/pdfpro/fpl-scan.js');
const fs = require('fs');

(async () => {
  for (const f of ['tmp_e2e_fpl_telex.pdf', 'tmp_e2e_fpl_form.pdf', 'tmp_e2e_oficio.pdf']) {
    const bytes = new Uint8Array(fs.readFileSync('/home/z/my-project/public/' + f));
    const doc = await pdfjsLib.getDocument({ data: bytes.slice() }).promise;
    let texto = '';
    for (let i = 1; i <= doc.numPages; i++) {
      const pg = await doc.getPage(i);
      const tc = await pg.getTextContent();
      texto += tc.items.map(s => s.str).join(' ') + ' ';
    }
    const r = FPLScan.extraerMatricula(texto);
    console.log(f.padEnd(24), '→ matrícula:', JSON.stringify(r && r.matricula), '· origen:', r ? r.origen : '—');
    console.log('   texto:', JSON.stringify(texto.slice(0, 110)));
  }
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
