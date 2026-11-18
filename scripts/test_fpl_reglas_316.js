/* Pruebas v3.1.6 — reglas del campo «Matrícula (Aeronave / Espacio)» con
   FORMULARIOS IMPRESOS CORPAC/ICAO (una casilla por carácter, texto interno
   revuelto) + regresión completa v3.1.5. Ejecuta el CÓDIGO REAL extraído de
   web/index.html. Ejecutar: node scripts/test_fpl_reglas_316.js */
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'web', 'index.html'), 'utf8');

/* ── 0) chequeo de sintaxis de TODOS los <script> inline ── */
let bloques = 0;
for (const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
  if (/\bsrc=/.test(m[1]) || /type=["']module["']/.test(m[1])) continue;
  if (!m[2].trim()) continue;
  bloques++;
  try { new Function(m[2]); }
  catch (e) { console.log('✗ ERROR DE SINTAXIS en <script> #' + bloques + ': ' + e.message); process.exit(1); }
}
console.log('✓ sintaxis OK en ' + bloques + ' bloques <script> inline');

/* ── extracción de funciones ── */
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
function extraerVar(nombre) { // var NAME=/…/; (literal regex u objeto)
  const m = html.match(new RegExp('var ' + nombre + '=(?:[\\s\\S]*?)?;'));
  const marca = 'var ' + nombre + '=';
  const ini = html.indexOf(marca);
  if (ini < 0) throw new Error('no se encontró var ' + nombre);
  let fin = html.indexOf(';', ini);
  if (nombre === 'MATRICULA_BLACKLIST') { // objeto: hasta la llave que cierra
    let i = html.indexOf('{', ini), prof = 0, j = i;
    for (; j < html.length; j++) {
      if (html[j] === '{') prof++;
      else if (html[j] === '}') { prof--; if (!prof) break; }
    }
    fin = html.indexOf(';', j);
  }
  return html.slice(ini, fin + 1);
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
  extraerVar('_FPL_PALABRA'), extraerVar('_FPL_DESIGNADOR'),
  extraerFn('_deSpaceIcao'), extraerFn('_esMatriculaValida'), extraerFn('_fixOcrLetters'),
  extraerFn('_fplCompacta'), extraerFn('_fplSinAcentos'), extraerFn('_fplEsMatricula'),
  extraerFn('_fplLimpiaIdent'), extraerFn('_fplIdentDeFormulario'), extraerFn('_fplEoibtDeFormulario'),
  extraerFn('_fplTipoDeFormulario'), extraerFn('_fplItemsPagina'), extraerFn('fplExtraerCampos'),
  extraerFn('inicialesDeNombre'), extraerFn('inicialesDeNombreSmart'), extraerFn('normIni'),
  extraerFn('normOprInitials'), extraerFn('fplInicialesOperador'),
  extraerFn('fplMatricula'), extraerFn('fplMatriculaChanged'),
  extraerFn('fplComponerRegistro'), extraerFn('_fplSetMatricula'),
  extraerFn('fplNombreRegistro'), extraerFn('extraerMatricula'), extraerFn('ocrExtraerMatricula')
].join('\n');
(0, eval)(src);

let ok = 0, mal = 0;
function T(desc, real, esperado) {
  if (JSON.stringify(real) === JSON.stringify(esperado)) { ok++; console.log('  ✓ ' + desc); }
  else { mal++; console.log('  ✗ ' + desc + ' → devolvió ' + JSON.stringify(real) + ', esperaba ' + JSON.stringify(esperado)); }
}

/* ════ fixtures REALES del formulario CORPAC subido (OB2203) ════ */
// orden interno del texto (pdf.js/pdftotext sin -layout): revuelto
const FIX_RAW = [
  'CLA VOR V1Y{.', 'FLIGHT PLAN', 'PRIORITY', 'ADDRESSEE(S)', '<<', 'FF', '<<',
  'FILING TIME', 'ORIGINATOR', '<<', 'SPECIFIC IDENTIFICATION OF ADDRESSEE(S) AND/OR ORIGINATOR',
  '3 MESSAGE TYPE', '<<', '7 AIRCRAFT IDENTIFICATION', '-', '(FPL', '9 NUMBER', 'OB',
  'TYPE OF AIRCRAFT', '-', 'C 2 0', '/', 'G <<', '10 EQUIPMENT', ' SDZ /C', 'L', '<<',
  'TIME', 'S P R U', '15 CRUISING SPEED', 'TYPE OF FLIGHT', ' Y', 'WAKE TURBULENCE CAT',
  '6', '13 DEPARTURE AERODROME', '1 3', 'LEVEL', '- N 0 1 4 0', '8 FLIGHT RULES', '2 2 0 3',
  '0', '0 <<', 'RO-675-UTE', 'F 0 8 0', 'TRU VOR V1 CLA/N0140 A065 VFR DCT', '<<',
  '16 DESTINATION AERODROME', 'TOTAL EET', 'HR. MIN', '- S P O L', '0 1 0 5',
  'ALTN AERODROME', 'S P H I', '<<', '18 OTHER INFORMATION', 'NAV /GPS', 'OPR/ BEGGIE',
  'CNL / ETA', 'OBS/DOF 2026-11-18', ')<<'
].join('\n');
// texto visual ordenado (pdftotext -layout / OCR de Tesseract)
const FIX_LAYOUT = [
  'FLIGHT PLAN',
  '3 MESSAGE TYPE                                     7 AIRCRAFT IDENTIFICATION                                              8 FLIGHT RULES                        TYPE OF FLIGHT',
  '<<        (FPL                                -     OB            2 2 0 3                                                   Y                                     G <<',
  '9 NUMBER                        TYPE OF AIRCRAFT                                             WAKE TURBULENCE CAT                         10 EQUIPMENT',
  ' -                                         C 2 0         6                                                /      L                           SDZ /C                     <<',
  '13 DEPARTURE AERODROME                                                  TIME',
  '      SPRU                                                   1 3        0       0 <<',
  '15 CRUISING SPEED                      LEVEL',
  '- N 0 1 4 0                          F 0 8 0                          TRU VOR V1 CLA/N0140 A065 VFR DCT',
  '16 DESTINATION AERODROME                                          HR. MIN                              ALTN AERODROME',
  '                - SPOL                                             0 1 0 5                                          SPHI',
  '18 OTHER INFORMATION',
  'NAV /GPS', 'OPR/ BEGGIE', 'CNL / ETA', 'OBS/DOF 2026-11-18                                                                               )<<'
].join('\n');
// geometría sintética fiel al formulario (etiquetas arriba, casillas debajo;
// y en espacio PDF: debajo = y menor)
const ITEMS_C7 = ['O', 'B', '2', '2', '0', '3'].map(function (c, k) { return { str: c, x: 255 + k * 10, y: 687 }; });
const ITEMS_BASE = [].concat(
  [{ str: '3 MESSAGE TYPE', x: 50, y: 700 }, { str: '7 AIRCRAFT IDENTIFICATION', x: 250, y: 700 },
   { str: '8 FLIGHT RULES', x: 520, y: 700 }, { str: 'TYPE OF FLIGHT', x: 640, y: 700 },
   { str: '(FPL', x: 70, y: 687 }, { str: 'Y', x: 528, y: 687 }, { str: 'G', x: 645, y: 687 }],
  [{ str: '13 DEPARTURE AERODROME', x: 50, y: 600 }, { str: 'TIME', x: 400, y: 600 }],
  ['S', 'P', 'R', 'U'].map(function (c, k) { return { str: c, x: 250 + k * 10, y: 587 }; }),
  ['1', '3', '0', '0'].map(function (c, k) { return { str: c, x: 330 + k * 10, y: 587 }; }),
  [{ str: '16 DESTINATION AERODROME', x: 50, y: 560 }],
  ['0', '1', '0', '5'].map(function (c, k) { return { str: c, x: 330 + k * 10, y: 547 }; })
);
const FIX_ITEMS_OK = ITEMS_BASE.concat(ITEMS_C7);

// captura del usuario (formulario CORPAC en español, texto ordenado/OCR)
const FIX_CAPTURA = [
  'CORPAC', 'PLAN DE VUELO / FLIGHT PLAN',
  'IDENTIFICACIÓN DE AERONAVE: OB2066',
  'REGLAS DE VUELO: V TIPO DE VUELO: G',
  'AERÓDROMO DE SALIDA: SPHI HORA: 2020',
  'AERÓDROMO DE DESTINO: SPRU 0130',
  'AUTONOMÍA: 04 00'
].join('\n');

console.log('── compactación de casillas (una casilla por carácter) ──');
T('«OB            2 2 0 3» → «OB2203»', _fplCompacta('OB            2 2 0 3'), 'OB2203');
T('«S P R U     1 3     0       0» → «SPRU1300»', _fplCompacta('S P R U     1 3     0       0'), 'SPRU1300');
T('«C 2 0 6» → «C206»', _fplCompacta('C 2 0 6'), 'C206');
T('«- N 0 1 4 0» → «- N0140» (el guion no se une)', _fplCompacta('- N 0 1 4 0'), '- N0140');
T('texto normal intacto: «TYPE OF FLIGHT»', _fplCompacta('TYPE OF FLIGHT'), 'TYPE OF FLIGHT');

console.log('── validadores del escáner v2.9.21 ──');
T('OB2203 ES matrícula', _fplEsMatricula('OB2203'), true);
T('CCDII (alfabética) ES matrícula', _fplEsMatricula('CCDII'), true);
T('OB-2147 ES matrícula', _fplEsMatricula('OB-2147'), true);
T('N523DA ES matrícula', _fplEsMatricula('N523DA'), true);
T('JAP7163 NO es matrícula (designador + nº de vuelo)', _fplEsMatricula('JAP7163'), false);
T('FLIGHT NO es matrícula (rótulo)', _fplEsMatricula('FLIGHT'), false);

console.log('── limpieza de la identificación (cola del casillero 8 pegada) ──');
T('«OB2203YG» → OB2203 + c8=YG', (function (r) { return [r.c7 || _fplLimpiaIdent('OB2203YG', r), r.c8]; })({ c7: '' }), ['OB2203', 'YG']);
T('«JAP7163IS» → JAP7163 + c8=IS', (function (r) { return [r.c7 || _fplLimpiaIdent('JAP7163IS', r), r.c8]; })({ c7: '' }), ['JAP7163', 'IS']);
T('«CCDII» queda entera (no se corta la I final)', _fplLimpiaIdent('CCDII', {}), 'CCDII');
T('«9» → vacía (basura tras FPL)', _fplLimpiaIdent('9', {}), '');

console.log('── geometría (ítems pdf.js {str,x,y}) ──');
T('c7 por geometría → OB2203', _fplIdentDeFormulario(FIX_ITEMS_OK), 'OB2203');
T('EOBT por geometría → 1300 (no el EET 0105)', _fplEoibtDeFormulario(FIX_ITEMS_OK), '1300');
T('tipo por geometría → G (la Y es de las REGLAS)', _fplTipoDeFormulario(FIX_ITEMS_OK), 'G');

console.log('── formulario REAL subido (texto visual ordenado, sin geometría) ──');
const fL = fplExtraerCampos(FIX_LAYOUT, null, '');
T('c7 = OB2203 (FPL- + cola YG separada)', fL.c7, 'OB2203');
T('tipoS = false (YG → tipo G)', fL.tipoS, false);
T('eoibt = 1300 (SPRU1300 bajo DEPARTURE)', fL.eoibt, '1300');
T('composición → «OB2203 1300 MK»', fplComponerRegistro(fL), 'OB2203 1300 MK');

console.log('── formulario REAL subido (texto interno revuelto + geometría) ──');
const fR = fplExtraerCampos(FIX_RAW, FIX_ITEMS_OK, '');
T('c7 = OB2203 (por geometría: «OB» y «2 2 0 3» están lejos)', fR.c7, 'OB2203');
T('tipoS = false (G por geometría)', fR.tipoS, false);
T('eoibt = 1300 (por geometría: la hora viene partida «1 3 … 0 … 0»)', fR.eoibt, '1300');
T('composición → «OB2203 1300 MK»', fplComponerRegistro(fR), 'OB2203 1300 MK');

console.log('── CASO DE LA CAPTURA (formulario CORPAC en español) ──');
const fC = fplExtraerCampos(FIX_CAPTURA, null, '');
T('c7 = OB2066', fC.c7, 'OB2066');
T('tipoS = false (G)', fC.tipoS, false);
T('eoibt = 2020 (SPHI HORA: 2020)', fC.eoibt, '2020');
T('composición → «OB2066 2020 MK» (lo que espera el usuario)', fplComponerRegistro(fC), 'OB2066 2020 MK');
document.getElementById('selloMatricula').value = '';
document.getElementById('mobSelloMatricula').value = '';
ocrExtraerMatricula(FIX_CAPTURA);
T('campo queda «OB2066 2020 MK» tras Detectar', campos.selloMatricula.value, 'OB2066 2020 MK');
T('fplNombreRegistro → «OB2066 2020 MK.pdf» sin duplicar', fplNombreRegistro('documento.pdf'), 'OB2066 2020 MK.pdf');

console.log('── tipo de vuelo: guard anti-ambigüedad ──');
T('«TIPO DE VUELO: S» → S', fplExtraerCampos('IDENTIFICACION DE AERONAVE: OB1234\nTIPO DE VUELO: S\nAERODROMO DE SALIDA: SPHI 1100', null, '').tipoS, true);
T('lista de opciones «S N G M X» sin marca → NO se asume S', fplExtraerCampos('IDENTIFICACION DE AERONAVE: OB1234\nTIPO DE VUELO: S N G M X\nAERODROMO DE SALIDA: SPHI 1100', null, '').tipoS, false);
T('opciones con ☒ marcada en S → S', fplExtraerCampos('IDENTIFICACION DE AERONAVE: OB1234\nTIPO DE VUELO: ☒ S N G M X\nAERODROMO DE SALIDA: SPHI 1100', null, '').tipoS, true);

console.log('── regresión v3.1.5: AFTN/télex ──');
const AFTN_S = '(FPL-JAP7163-IS\n-B738/M-SDFGRVY/H\n-SPHI 1100\n-N0120F180 DCT\n-SPZO 0130\n-SPJC/SPRU\n-EET/SPZO0030 REG/CCDII DOF/261118)';
const f1 = fplExtraerCampos(AFTN_S, null, '');
T('AFTN S: c7 = JAP7163', f1.c7, 'JAP7163');
T('AFTN S: tipoS = true (IS)', f1.tipoS, true);
T('AFTN S: reg = CCDII', f1.reg, 'CCDII');
T('AFTN S: eoibt = 1100', f1.eoibt, '1100');
T('AFTN S: composición → «JAP7163 CCDII MK»', fplComponerRegistro(f1), 'JAP7163 CCDII MK');
const AFTN_G = '(FPL-OB2032-IG\n-C172/G\n-SPHI 1100\n-N0120F180 DCT\n-SPZO 0130\n-EET/SPZO0030 DOF/261118)';
const f2 = fplExtraerCampos(AFTN_G, null, '');
T('AFTN G: c7 = OB2032', f2.c7, 'OB2032');
T('AFTN G: tipoS = false', f2.tipoS, false);
T('AFTN G: eoibt = 1100', f2.eoibt, '1100');
T('AFTN G: composición → «OB2032 1100 MK»', fplComponerRegistro(f2), 'OB2032 1100 MK');

console.log('── regresión v3.1.5: formularios ordenados ──');
const FORM_S = 'PLAN DE VUELO\nIDENTIFICACIÓN DE VUELO: JAP7163\nREGLAS DE VUELO: I\nTIPO DE VUELO: S\nAERÓDROMO DE SALIDA: SPHI 1100\nAERÓDROMO DE DESTINO: SPZO 0130\nOTROS DATOS: REG/CCDII';
const f3 = fplExtraerCampos(FORM_S, null, '');
T('FORM S: c7 = JAP7163', f3.c7, 'JAP7163');
T('FORM S: tipoS = true', f3.tipoS, true);
T('FORM S: reg = CCDII', f3.reg, 'CCDII');
T('FORM S: eoibt = 1100', f3.eoibt, '1100');
T('FORM S: composición → «JAP7163 CCDII MK»', fplComponerRegistro(f3), 'JAP7163 CCDII MK');
const FORM_EN = 'FLIGHT PLAN\nAIRCRAFT IDENTIFICATION: OB2032\nTYPE OF FLIGHT: G\nDEPARTURE AERODROME: SPHI 1100\nDESTINATION AERODROME: SPZO 0130';
const f4 = fplExtraerCampos(FORM_EN, null, '');
T('FORM EN: c7 = OB2032', f4.c7, 'OB2032');
T('FORM EN: eoibt = 1100', f4.eoibt, '1100');
T('FORM EN: composición → «OB2032 1100 MK»', fplComponerRegistro(f4), 'OB2032 1100 MK');
const SIN_EOBT = 'IDENTIFICACIÓN DE AERONAVE: OB2032\nTIPO DE VUELO: G\nAERÓDROMO DE SALIDA: SPHI\nDESTINO: SPZO';
T('sin EOBT → «OB2032 MK»', fplComponerRegistro(fplExtraerCampos(SIN_EOBT, null, '')), 'OB2032 MK');
T('FLIGHT blacklisted como c7', fplExtraerCampos('AIRCRAFT IDENTIFICATION: FLIGHT\nTIPO DE VUELO: G', null, '').c7, '');
T('sin datos → composición vacía', fplComponerRegistro(fplExtraerCampos('SIN DATOS', null, '')), '');

console.log('── regresión v3.1.5: iniciales ──');
T('Marcos Roberto Koo Paz → MK', inicialesDeNombreSmart('Marcos Roberto Koo Paz'), 'MK');
T('Koo Paz, Marcos Roberto (coma) → MK', inicialesDeNombreSmart('Koo Paz, Marcos Roberto'), 'MK');
T('Koo Paz Marcos Roberto (sin coma) → MK', inicialesDeNombreSmart('Koo Paz Marcos Roberto'), 'MK');
T('Koo Marcos → MK', inicialesDeNombreSmart('Koo Marcos'), 'MK');
T('Pedro de la Cruz Villa → PC', inicialesDeNombreSmart('Pedro de la Cruz Villa'), 'PC');
T('normOprInitials MRKP → MK', normOprInitials('MRKP'), 'MK');
T('fplInicialesOperador → MK', fplInicialesOperador(), 'MK');

console.log('── regresión v3.1.5: nombre del archivo ──');
campos.selloMatricula.value = 'OB2032 1100 MK';
T('«OB2032 1100 MK» + documento.pdf → sin duplicar', fplNombreRegistro('documento.pdf'), 'OB2032 1100 MK.pdf');
campos.selloMatricula.value = 'JAP7163 CCDII MK';
T('«JAP7163 CCDII MK» + a.docx', fplNombreRegistro('a.docx'), 'JAP7163 CCDII MK.docx');
campos.selloMatricula.value = 'OB2032';
T('manual «OB2032» → añade iniciales', fplNombreRegistro('documento.pdf'), 'OB2032 MK.pdf');
campos.selloMatricula.value = '';
T('campo vacío → nombre original', fplNombreRegistro('documento.pdf'), 'documento.pdf');

console.log('── regresión v3.1.5: extraerMatricula ──');
T('REG/OB-2147 → OB-2147', extraerMatricula('REG/OB-2147 TIPO DE VUELO: G', ''), 'OB-2147');
T('INDICATIVO DE LLAMADA: OB-2147 → OB-2147', extraerMatricula('INDICATIVO DE LLAMADA: OB-2147', ''), 'OB-2147');

console.log('── UI: ayuda contraída + banner v3.1.6 ──');
T('tooltip «ⓘ reglas de armado» presente', html.includes('class="tipr"') && html.includes('reglas de armado'), true);
T('reglas completas dentro del recuadro .tipr-b', html.includes('tipr-b') && html.includes('JAP7163 CCDII MK') && html.includes('OB2032 1100 MK'), true);
T('banner v3.1.6', /CORPAC AIS\/ARO Platform v3\.1\.6/.test(html), true);
T('CSS .tipr:hover despliega el recuadro', /\.tipr:hover \.tipr-b,\.tipr:focus-within \.tipr-b\{display:block\}/.test(html), true);

console.log('\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));
process.exit(mal ? 1 : 0);
