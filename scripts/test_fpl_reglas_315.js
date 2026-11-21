/* Pruebas v3.1.5 — reglas del campo «Matrícula (Aeronave / Espacio)» e
   iniciales del operador (orden «Apellidos y Nombres»).
   Ejecuta el CÓDIGO REAL extraído de web/index.html. Ejecutar:
   node scripts/test_fpl_reglas_315.js */
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'web', 'index.html'), 'utf8');

/* ── 0) chequeo de sintaxis de TODOS los <script> inline del archivo ── */
let bloques = 0;
for (const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
  if (/\bsrc=/.test(m[1]) || /type=["']module["']/.test(m[1])) continue;
  if (!m[2].trim()) continue;
  bloques++;
  try { new Function(m[2]); }          // compila sin ejecutar
  catch (e) { console.log('✗ ERROR DE SINTAXIS en <script> #' + bloques + ': ' + e.message); process.exit(1); }
}
console.log('✓ sintaxis OK en ' + bloques + ' bloques <script> inline');

/* ── extracción de funciones (conteo de llaves balanceadas) ── */
function extraerFn(nombre) {
  const marca = 'function ' + nombre + '(';
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
  let i = html.indexOf('{', ini), prof = 0, j = i;
  for (; j < html.length; j++) {
    const c = html[j];
    if (c === '{') prof++;
    else if (c === '}') { prof--; if (!prof) break; }
  }
  return html.slice(ini, html.indexOf(';', j) + 1);
}

/* ── stubs de DOM / navegador ── */
const campos = {};
global.document = { getElementById: id => (campos[id] = campos[id] || { value: '' }) };
global.window = { currentUser: { name: 'Marcos Roberto Koo Paz' } };
global.sessionStorage = { setItem() {}, getItem() { return ''; } };
global.toast = () => {};

/* ── evaluar el código real en el scope global ── */
const src = [
  extraerVar('MATRICULA_BLACKLIST'),
  extraerFn('_deSpaceIcao'), extraerFn('_esMatriculaValida'), extraerFn('_fixOcrLetters'),
  extraerFn('inicialesDeNombre'), extraerFn('inicialesDeNombreSmart'), extraerFn('normIni'),
  extraerFn('normOprInitials'), extraerFn('fplInicialesOperador'),
  extraerFn('fplMatricula'), extraerFn('fplMatriculaChanged'),
  extraerFn('fplExtraerCampos'), extraerFn('fplComponerRegistro'), extraerFn('_fplSetMatricula'),
  extraerFn('fplNombreRegistro'), extraerFn('extraerMatricula'), extraerFn('ocrExtraerMatricula')
].join('\n');
(0, eval)(src);

/* ── pruebas ── */
let ok = 0, mal = 0;
function T(desc, real, esperado) {
  if (JSON.stringify(real) === JSON.stringify(esperado)) { ok++; console.log('  ✓ ' + desc); }
  else { mal++; console.log('  ✗ ' + desc + ' → devolvió ' + JSON.stringify(real) + ', esperaba ' + JSON.stringify(esperado)); }
}

console.log('── iniciales (regla: 1er nombre + 1er apellido, 2 letras) ──');
T('Marcos Roberto Koo Paz → MK', inicialesDeNombreSmart('Marcos Roberto Koo Paz'), 'MK');
T('Koo Paz, Marcos Roberto (coma) → MK', inicialesDeNombreSmart('Koo Paz, Marcos Roberto'), 'MK');
T('Koo Paz Marcos Roberto (sin coma) → MK', inicialesDeNombreSmart('Koo Paz Marcos Roberto'), 'MK');
T('Koo Marcos → MK', inicialesDeNombreSmart('Koo Marcos'), 'MK');
T('Marcos Koo → MK', inicialesDeNombreSmart('Marcos Koo'), 'MK');
T('Koo Paz Marcos → MK', inicialesDeNombreSmart('Koo Paz Marcos'), 'MK');
T('Koo Marcos Roberto → MK', inicialesDeNombreSmart('Koo Marcos Roberto'), 'MK');
T('Juan Pérez López → JP', inicialesDeNombreSmart('Juan Pérez López'), 'JP');
T('Pedro de la Cruz Villa → PC', inicialesDeNombreSmart('Pedro de la Cruz Villa'), 'PC');
T('Ana María Torres → AT', inicialesDeNombreSmart('Ana María Torres'), 'AT');
T('María del Carmen Rojas → MR', inicialesDeNombreSmart('María del Carmen Rojas'), 'MR');
T('Álvaro Úbeda Núñez → AU', inicialesDeNombreSmart('Álvaro Úbeda Núñez'), 'AU');
T('normOprInitials MRKP (viejas de 3+) → MK', normOprInitials('MRKP'), 'MK');
T('fplInicialesOperador (sesión Marcos) → MK', fplInicialesOperador(), 'MK');

console.log('── AFTN tipo S (ejemplo del usuario: JAP7163 + REG/CCDII) ──');
const AFTN_S = '(FPL-JAP7163-IS\n-B738/M-SDFGRVY/H\n-SPHI 1100\n-N0120F180 DCT\n-SPZO 0130\n-SPJC/SPRU\n-EET/SPZO0030 REG/CCDII DOF/261118)';
const f1 = fplExtraerCampos(AFTN_S);
T('c7 = JAP7163', f1.c7, 'JAP7163');
T('tipoS = true (IS)', f1.tipoS, true);
T('reg = CCDII (sin prefijo)', f1.reg, 'CCDII');
T('eoibt = 1100 (salida, no destino)', f1.eoibt, '1100');
T('composición → «JAP7163 CCDII MK»', fplComponerRegistro(f1), 'JAP7163 CCDII MK');

console.log('── AFTN normal (matrícula en c7: OB2032) ──');
const AFTN_G = '(FPL-OB2032-IG\n-C172/G\n-SPHI 1100\n-N0120F180 DCT\n-SPZO 0130\n-EET/SPZO0030 DOF/261118)';
const f2 = fplExtraerCampos(AFTN_G);
T('c7 = OB2032', f2.c7, 'OB2032');
T('tipoS = false (IG)', f2.tipoS, false);
T('reg = «» (sin REG/)', f2.reg, '');
T('eoibt = 1100', f2.eoibt, '1100');
T('composición → «OB2032 1100 MK»', fplComponerRegistro(f2), 'OB2032 1100 MK');

console.log('── formulario DGAC en español (tipo S) ──');
const FORM_S = 'PLAN DE VUELO\nIDENTIFICACIÓN DE VUELO: JAP7163\nREGLAS DE VUELO: I\nTIPO DE VUELO: S\nAERÓDROMO DE SALIDA: SPHI 1100\nAERÓDROMO DE DESTINO: SPZO 0130\nOTROS DATOS: REG/CCDII';
const f3 = fplExtraerCampos(FORM_S);
T('c7 = JAP7163', f3.c7, 'JAP7163');
T('tipoS = true (etiqueta TIPO DE VUELO: S)', f3.tipoS, true);
T('reg = CCDII', f3.reg, 'CCDII');
T('eoibt = 1100 (etiqueta AERÓDROMO DE SALIDA)', f3.eoibt, '1100');
T('composición → «JAP7163 CCDII MK»', fplComponerRegistro(f3), 'JAP7163 CCDII MK');

console.log('── formulario en inglés (no S) ──');
const FORM_EN = 'FLIGHT PLAN\nAIRCRAFT IDENTIFICATION: OB2032\nTYPE OF FLIGHT: G\nDEPARTURE AERODROME: SPHI 1100\nDESTINATION AERODROME: SPZO 0130';
const f4 = fplExtraerCampos(FORM_EN);
T('c7 = OB2032', f4.c7, 'OB2032');
T('tipoS = false (TYPE OF FLIGHT: G)', f4.tipoS, false);
T('eoibt = 1100 (DEPARTURE AERODROME)', f4.eoibt, '1100');
T('composición → «OB2032 1100 MK»', fplComponerRegistro(f4), 'OB2032 1100 MK');

console.log('── sin EOBT detectable → sin segmento de hora ──');
const SIN_EOBT = 'IDENTIFICACIÓN DE AERONAVE: OB2032\nTIPO DE VUELO: G\nAERÓDROMO DE SALIDA: SPHI\nDESTINO: SPZO';
const f5 = fplExtraerCampos(SIN_EOBT);
T('eoibt = «»', f5.eoibt, '');
T('composición → «OB2032 MK»', fplComponerRegistro(f5), 'OB2032 MK');

console.log('── blindajes ──');
T('FLIGHT blacklisted como c7', fplExtraerCampos('AIRCRAFT IDENTIFICATION: FLIGHT\nTIPO DE VUELO: G').c7, '');
T('sin datos → composición vacía (campo intacto)', fplComponerRegistro(fplExtraerCampos('SIN DATOS')), '');

console.log('── integración: ocrExtraerMatricula llena el campo ──');
document.getElementById('selloMatricula').value = '';
document.getElementById('mobSelloMatricula').value = '';
ocrExtraerMatricula(FORM_S);
T('campo escritorio = «JAP7163 CCDII MK»', campos.selloMatricula.value, 'JAP7163 CCDII MK');
T('campo móvil espejo = «JAP7163 CCDII MK»', campos.mobSelloMatricula.value, 'JAP7163 CCDII MK');

console.log('── nombre del archivo (fplNombreRegistro) ──');
campos.selloMatricula.value = 'OB2032 1100 MK';
T('«OB2032 1100 MK» + documento.pdf → «OB2032 1100 MK.pdf» (sin duplicar)', fplNombreRegistro('documento.pdf'), 'OB2032 1100 MK.pdf');
campos.selloMatricula.value = 'JAP7163 CCDII MK';
T('«JAP7163 CCDII MK» + a.docx → «JAP7163 CCDII MK.docx»', fplNombreRegistro('a.docx'), 'JAP7163 CCDII MK.docx');
campos.selloMatricula.value = 'OB2032';
T('manual «OB2032» → añade iniciales: «OB2032 MK.pdf»', fplNombreRegistro('documento.pdf'), 'OB2032 MK.pdf');
campos.selloMatricula.value = '';
T('campo vacío → nombre original', fplNombreRegistro('documento.pdf'), 'documento.pdf');
campos.selloMatricula.value = 'OB2032';
global.window.currentUser = {};
T('sin sesión: «OB2032» → «OB2032.pdf»', fplNombreRegistro('documento.pdf'), 'OB2032.pdf');
global.window.currentUser = { name: 'Marcos Roberto Koo Paz' };

console.log('── regresión: extraerMatricula (matrícula simple) sigue igual ──');
T('REG/OB-2147 → OB-2147', extraerMatricula('REG/OB-2147 TIPO DE VUELO: G', ''), 'OB-2147');
T('LLAMADA OB-2147 → OB-2147', extraerMatricula('INDICATIVO DE LLAMADA: OB-2147', ''), 'OB-2147');

console.log('\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));
process.exit(mal ? 1 : 0);
