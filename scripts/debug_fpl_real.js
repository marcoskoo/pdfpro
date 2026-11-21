/* Debug v3.2.5 — extrae los items REALES de pdf.js (los mismos que consume
   _fplItemsPagina) de los planes subidos y corre el pipeline REAL
   (fplExtraerCampos + fplComponerRegistro) para ver qué falla en cada uno. */
const fs = require('fs'), path = require('path');
const cwd = __dirname + '/..';

/* ── pdf.js de la app ── */
const pdfjs = require(path.join(__dirname, 'tmp_pdfjs/pdf.min.js'));

async function itemsDe(pdfPath) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  const page = await doc.getPage(1);
  const tc = await page.getTextContent();
  /* igual que _fplItemsPagina: {str, x:transform[4], y:transform[5]} */
  return tc.items.filter(i => i.str && i.str.trim()).map(i => {
    const t = i.transform || [0, 0, 0, 0, 0, 0];
    return { str: i.str, x: t[4], y: t[5] };
  });
}

/* ── funciones reales del renderer (mismo mecanismo que la suite) ── */
const html = fs.readFileSync(path.join(cwd, 'web/index.html'), 'utf8');
function extraerFn(nombre, asinc) {
  const marca = (asinc ? 'async ' : '') + 'function ' + nombre + '(';
  const ini = html.indexOf(marca);
  if (ini < 0) throw new Error('no se encontró ' + nombre);
  let i = html.indexOf('{', ini), prof = 0, j = i;
  for (; j < html.length; j++) {
    const c = html[j];
    if (c === '{') prof++;
    else if (c === '}') { prof--; if (!prof) break; }
  }
  return html.slice(ini, j + 1);
}
function extraerVar(nombre) {
  const marca = 'var ' + nombre + '=';
  const ini = html.indexOf(marca);
  if (ini < 0) throw new Error('no se encontró var ' + nombre);
  let fin = html.indexOf(';', ini);
  if (nombre === 'MATRICULA_BLACKLIST') {
    let i = html.indexOf('{', ini), prof = 0, j = i;
    for (; j < html.length; j++) {
      if (html[j] === '{') prof++;
      else if (html[j] === '}') { prof--; if (!prof) break; }
    }
    fin = html.indexOf(';', j);
  }
  return html.slice(ini, fin + 1);
}
const campos = {};
global.document = { getElementById: id => (campos[id] = campos[id] || { value: '' }) };
global.window = { currentUser: { name: 'Marcos Roberto Koo Paz' } };
global.sessionStorage = { setItem() {}, getItem() { return ''; } };
global.toast = () => {};
(0, eval)([
  extraerVar('MATRICULA_BLACKLIST'),
  extraerVar('_FPL_PALABRA'), extraerVar('_FPL_DESIGNADOR'),
  extraerFn('_deSpaceIcao'), extraerFn('_esMatriculaValida'), extraerFn('_fixOcrLetters'),
  extraerFn('_fplCompacta'), extraerFn('_fplSinAcentos'), extraerFn('_fplEsMatricula'),
  extraerFn('_fplLimpiaIdent'), extraerFn('_fplIdentDeFormulario'), extraerFn('_fplEoibtDeFormulario'),
  extraerFn('_fplTipoDeFormulario'), extraerFn('_fplRegDeFormulario'),
  extraerFn('inicialesDeNombre'), extraerFn('inicialesDeNombreSmart'), extraerFn('normIni'),
  extraerFn('normOprInitials'), extraerFn('fplInicialesOperador'),
  extraerFn('fplMatricula'), extraerFn('fplMatriculaChanged'),
  extraerFn('fplComponerRegistro'), extraerFn('_fplSetMatricula'),
  extraerFn('fplNombreRegistro'), extraerFn('extraerMatricula'), extraerFn('fplExtraerCampos')
].join('\n'));

(async () => {
  const docs = [
    ['SRU 2226 (reporte)', 'upload/PV CIX LIM        2226.pdf', 'SRU2226 OB2176P MK'],
    ['JAP 7361 (funciona)', 'upload/ATC JAP 7361.pdf', 'JAP7361 CCDIU MK'],
    ['ORIGINAL (OB-2176P)', 'upload/Plan de Vuelo ORIGINAL.pdf', 'OB-2176P 0145 MK?']
  ];
  for (const [nombre, ruta, esperado] of docs) {
    const p = path.join(cwd, ruta);
    if (!fs.existsSync(p)) { console.log(`— ${nombre}: ARCHIVO NO ENCONTRADO`); continue; }
    const items = await itemsDe(p);
    const texto = items.map(i => i.str).join('\n');
    const r = fplExtraerCampos(texto, items, path.basename(ruta));
    const comp = fplComponerRegistro(r);
    console.log('══ ' + nombre + '  (' + items.length + ' items)');
    console.log('   c7=' + JSON.stringify(r.c7) + ' · tipoS=' + r.tipoS + ' · reg=' + JSON.stringify(r.reg) + ' · eoibt=' + JSON.stringify(r.eoibt) + ' · c8=' + JSON.stringify(r.c8));
    console.log('   compuesto → ' + JSON.stringify(comp) + '   (esperado ≈ ' + esperado + ')');
  }
  /* vuelco detallado de la zona del casillero 7/8 del SRU2226 para depurar */
  const its = await itemsDe(path.join(cwd, 'upload/PV CIX LIM        2226.pdf'));
  console.log('\n── items del SRU 2226 con 1-8 caracteres (zona casillas):');
  for (const i of its) {
    const s = String(i.str).trim();
    if (s && s.length <= 8 && /^[A-Z0-9 .\-\/]+$/i.test(s)) console.log(`   (${Math.round(i.x)},${Math.round(i.y)}) ${JSON.stringify(s)}`);
  }
})().catch(e => { console.error('ERROR: ' + e.message); process.exit(1); });
