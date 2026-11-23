/* Repro del reporte del usuario (v3.2.27): vuelo tipo G, el formulario
   trae la hora de salida como «18:50» (con dos puntos) y el campo
   «Matrícula (Aeronave / Espacio)» quedó «OB2147 MK» — sin el EOBT.
   Ejecuta el CÓDIGO REAL de web/index.html.
   Ejecutar: node scripts/repro_eobt_3228.js */
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'web', 'index.html'), 'utf8');

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
  if (prof) throw new Error('llaves sin cerrar en ' + nombre);
  return html.slice(ini, j + 1);
}
function extraerVar(nombre) {
  const marca = 'var ' + nombre + '=';
  const ini = html.indexOf(marca);
  if (ini < 0) throw new Error('no se encontró var ' + nombre);
  let fin = html.indexOf(';', ini);
  return html.slice(ini, fin + 1);
}

const campos = {};
global.document = { getElementById: id => (campos[id] = campos[id] || { value: '' }) };
global.window = { currentUser: { name: 'Marcos Roberto Koo Paz' } };
global.sessionStorage = { setItem() {}, getItem() { return ''; } };
global.toast = () => {};

const src = [
  extraerVar('MATRICULA_BLACKLIST'),
  extraerVar('_FPL_PALABRA'), extraerVar('_FPL_DESIGNADOR'),
  extraerFn('_deSpaceIcao'), extraerFn('_esMatriculaValida'), extraerFn('_fixOcrLetters'),
  extraerFn('_fplCompacta'), extraerFn('_fplSinAcentos'), extraerFn('_fplEsMatricula'),
  extraerFn('_fplLimpiaIdent'), extraerFn('_fplIdentDeFormulario'), extraerFn('_fplEoibtDeFormulario'),
  extraerFn('_fplTipoDeFormulario'), extraerFn('_fplRegDeFormulario'), extraerFn('_fplItemsPagina'),
  extraerFn('fplExtraerCampos'),
  extraerFn('inicialesDeNombre'), extraerFn('inicialesDeNombreSmart'), extraerFn('normIni'),
  extraerFn('normOprInitials'), extraerFn('fplInicialesOperador'),
  extraerFn('fplComponerRegistro'), extraerFn('_fplSetMatricula'),
  extraerFn('fplNombreRegistro'), extraerFn('extraerMatricula'), extraerFn('ocrExtraerMatricula')
].join('\n');
(0, eval)(src);

/* ════ Caso de la captura del usuario (PL SPHI PAUCAR (2)) ════ */
console.log('══ 1) Texto visual (OCR/ordenado) con HORA «18:50» con dos puntos ══');
const CAP = [
  'CORPAC', 'PLAN DE VUELO / FLIGHT PLAN',
  'IDENTIFICACIÓN DE AERONAVE: OB2147',
  'REGLAS DE VUELO: I TIPO DE VUELO: G',
  'AERÓDROMO DE SALIDA: SPHI HORA: 18:50',
  'AERÓDROMO DE DESTINO: SPHI',
  'AUTONOMÍA: 04:00'
].join('\n');
let f = fplExtraerCampos(CAP, null, '');
console.log('  c7     =', JSON.stringify(f.c7), '(esperado OB2147)');
console.log('  tipoS  =', f.tipoS, '(esperado false — tipo G)');
console.log('  eoibt  =', JSON.stringify(f.eoibt), '(esperado 1850)');
console.log('  campo  =', JSON.stringify(fplComponerRegistro(f)), '(esperado «OB2147 1850 MK»)');

console.log('══ 2) Texto con «Hora 1850» SIN etiqueta de dos puntos ══');
const CAP2 = CAP.replace('HORA: 18:50', 'HORA 1850');
f = fplExtraerCampos(CAP2, null, '');
console.log('  eoibt  =', JSON.stringify(f.eoibt), '(esperado 1850)');

console.log('══ 3) Geometría: «18:50» como UN ítem pdf.js ══');
const items3 = [].concat(
  [{ str: '7 AIRCRAFT IDENTIFICATION', x: 250, y: 700 }, { str: 'TYPE OF FLIGHT', x: 640, y: 700 }],
  ['O', 'B', '2', '1', '4', '7'].map((c, k) => ({ str: c, x: 255 + k * 10, y: 687 })),
  { str: 'G', x: 645, y: 687 },
  [{ str: '13 DEPARTURE AERODROME', x: 50, y: 600 }, { str: 'TIME', x: 400, y: 600 }],
  ['S', 'P', 'H', 'I'].map((c, k) => ({ str: c, x: 250 + k * 10, y: 587 })),
  [{ str: '18:50', x: 330, y: 587 }],
  [{ str: '16 DESTINATION AERODROME', x: 50, y: 560 }]
);
console.log('  _fplEoibtDeFormulario =', JSON.stringify(_fplEoibtDeFormulario(items3)), '(esperado 1850)');
f = fplExtraerCampos('AERODROMO DE SALIDA SPHI 18:50', items3, '');
console.log('  campo  =', JSON.stringify(fplComponerRegistro(f)), '(esperado «OB2147 1850 MK»)');

console.log('══ 4) Geometría: «1 8 : 5 0» partida en casillas (con «:» suelto) ══');
const items4 = items3.filter(it => it.str !== '18:50').concat(
  ['1', '8', ':', '5', '0'].map((c, k) => ({ str: c, x: 330 + k * 10, y: 587 }))
);
console.log('  _fplEoibtDeFormulario =', JSON.stringify(_fplEoibtDeFormulario(items4)), '(esperado 1850)');

console.log('══ 5) Etiqueta «EOBT: 18:50» ══');
f = fplExtraerCampos('IDENTIFICACION DE AERONAVE: OB2147\nTIPO DE VUELO: G\nEOBT: 18:50', null, '');
console.log('  eoibt  =', JSON.stringify(f.eoibt), '(esperado 1850)');

console.log('══ 6) Télex AFTN con dos puntos «-SPHI 18:50» ══');
f = fplExtraerCampos('(FPL-OB2147-IG\n-C172/G\n-SPHI 18:50\n-N0090 A030 DCT\n-SPHI)', null, '');
console.log('  eoibt  =', JSON.stringify(f.eoibt), '(esperado 1850)');
