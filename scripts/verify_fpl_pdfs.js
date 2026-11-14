/* Verifica los PDF de prueba con el MISMO pdf.js de la app: extrae texto +
 * geometría (ítems {str,x,y}) y corre FPLScan.extraerFPL como hace la app.
 * Ejecutar: node /home/z/my-project/scripts/verify_fpl_pdfs.js */
'use strict';
globalThis.pdfjsLib = require('/home/z/my-project/public/pdfpro/vendor/pdfjs/pdf.min.js');
globalThis.pdfjsLib.GlobalWorkerOptions.workerSrc = '/home/z/my-project/public/pdfpro/vendor/pdfjs/pdf.worker.min.js';
const FPLScan = require('/home/z/my-project/public/pdfpro/fpl-scan.js');
const fs = require('fs');

// [archivo, matrícula, origen (subcadena), ident, matrícula SOLO TEXTO]
// v2.9.22 — incluye el FAP real: casillero 7 = FAP001 (nº de VUELO) y el 18
// con la falla del piloto «REG FAP 329» (sin barra, dígitos separados).
// Nota SPHI: el fixture replica el ORDEN REVUELTO del content-stream real
// («1 6 3 0 … O B»); eso lo resuelve la GEOMETRÍA (como hace la app con los
// PDF). El modo «solo texto» es para OCR, que lee orden VISUAL — cubierto en
// las pruebas unitarias — por eso aquí se espera null en solo-texto.
const CASOS = [
  ['tmp_e2e_fpl_telex.pdf',          'OB1630', 'casillero 18 (REG/)',              'FAP211', 'OB1630'],
  ['tmp_e2e_fpl_form.pdf',           'OB2147', 'casillero 7 (formulario)',         'OB2147', 'OB2147'],
  ['tmp_e2e_fpl_sin_matricula.pdf',  null,     null,                                null,     null],
  ['tmp_e2e_fpl_sphi_spst.pdf',      'OB1630', 'casillero 7 (formulario)',         'OB1630',  null],
  ['tmp_e2e_fpl_form_casillas.pdf',  'HP1520', 'casillero 18 (REG/)',              'CMP468', 'HP1520'],
  ['tmp_e2e_fpl_fap001.pdf',         'FAP329', 'casillero 18 (REG sin «/»)',      'FAP001', 'FAP329'],
  ['tmp_e2e_oficio.pdf',             null,     null,                                null,     null],
];

(async () => {
  let fallos = 0;
  for (const [f, espMat, espOrigen, espIdent, espMatTxt] of CASOS) {
    const bytes = new Uint8Array(fs.readFileSync('/home/z/my-project/public/' + f));
    const doc = await pdfjsLib.getDocument({ data: bytes.slice() }).promise;
    let texto = '', items = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const pg = await doc.getPage(i);
      const tc = await pg.getTextContent();
      texto += tc.items.map(s => s.str).join(' ') + ' ';
      for (const it of tc.items) if (it.str && it.str.trim())
        items.push({ str: it.str, x: it.transform[4], y: it.transform[5] });
    }
    // 1) como la app: texto + geometría
    const r = FPLScan.extraerFPL(texto, items);
    // 2) solo texto (OCR)
    const r2 = FPLScan.extraerFPL(texto, null);
    const ok1 = (r && r.matricula) === espMat && (!espOrigen || (r && r.origen && r.origen.indexOf(espOrigen) !== -1)) && (!espIdent || (r && r.ident) === espIdent);
    const ok2 = espMatTxt === null ? r2 === null : (r2 && r2.matricula) === espMatTxt;
    if (!ok1 || !ok2) fallos++;
    console.log((ok1 && ok2 ? '  ✓ ' : '  ✗ ') + f.padEnd(28) +
      '→ texto+geom: ' + JSON.stringify(r && r.matricula) + ' · ' + JSON.stringify(r && r.origen) + ' · vuelo ' + JSON.stringify(r && r.ident) +
      '  |  solo texto: ' + JSON.stringify(r2 && r2.matricula));
  }
  console.log(fallos === 0 ? '\nVERIFICACIÓN DE PDFS: TODO OK ✓' : '\nFALLOS: ' + fallos);
  process.exit(fallos === 0 ? 0 : 1);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
