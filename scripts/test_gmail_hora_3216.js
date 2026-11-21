/* Pruebas v3.2.16 — el MATCH del nombre soporta varios «(n)» de
   duplicado: los archivos reales se descargan como «ATC CM468 11NOV
   (1) (1).pdf» y la comparación solo quitaba UN «(n)» → «atccm46811nov1»
   ≠ «atccm46811nov» → ningún correo hacía match y la hora JAMÁS se
   capturaba. (1) nombreComparable (hora.js, compartida por API escritorio
   y vía asistida) y gmailNombreBase (renderer, API web) quitan TODOS los
   «(n)» finales; (2) la búsqueda filename: reintenta con la base sin
   marcadores y el texto libre/match estricto usan esa misma base; (3) el
   año por defecto de parseHoraGmail es el de la ZONA de la cuenta (Lima),
   no el de UTC (bug de fin de año). Incluye la regresión completa
   v3.2.15 (335 pruebas).
   Ejecuta el CÓDIGO REAL de web/index.html, src/gmail-hora/ y
   src/main.js.
   Ejecutar: node scripts/test_gmail_hora_3216.js */
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'web', 'index.html'), 'utf8');
/* v3.2.5 — fixtures REALES: items pdf.js (los mismos {str,x,y} que consume
   _fplItemsPagina) de los dos planes de vuelo subidos por el usuario */
const FIX_SRU = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture_sru2226.json'), 'utf8'));
const FIX_JAP = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture_jap7361.json'), 'utf8'));

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
/* v3.2.10 — globals REALES de web/index.html: declaran _gmailSesionToast,
   _gmailReintentoT y _gmailReintentoN (los usa gmailAplicarHora real y la
   re-búsqueda silenciosa evaluadas más abajo) */
(0, eval)(extraerVar('_gmailHoraOk'));
global.sessionStorage = { setItem() {}, getItem() { return ''; } };
global.toast = () => {};

/* ── evaluar el código real en el scope global ── */
const src = [
  extraerVar('MATRICULA_BLACKLIST'),
  extraerVar('_FPL_PALABRA'), extraerVar('_FPL_DESIGNADOR'),
  extraerFn('_deSpaceIcao'), extraerFn('_esMatriculaValida'), extraerFn('_fixOcrLetters'),
  extraerFn('_fplCompacta'), extraerFn('_fplSinAcentos'), extraerFn('_fplEsMatricula'),
  extraerFn('_fplLimpiaIdent'), extraerFn('_fplIdentDeFormulario'), extraerFn('_fplEoibtDeFormulario'),
  extraerFn('_fplTipoDeFormulario'), extraerFn('_fplRegDeFormulario'), extraerFn('_fplItemsPagina'), extraerFn('nvAutoMatricula'), extraerFn('autoOcrMatricula', true), extraerFn('fplExtraerCampos'),
  extraerFn('inicialesDeNombre'), extraerFn('inicialesDeNombreSmart'), extraerFn('normIni'),
  extraerFn('normOprInitials'), extraerFn('fplInicialesOperador'),
  extraerFn('fplMatricula'), extraerFn('fplMatriculaChanged'),
  extraerFn('fplComponerRegistro'), extraerFn('_fplSetMatricula'),
  extraerFn('fplNombreRegistro'), extraerFn('extraerMatricula'), extraerFn('ocrExtraerMatricula'),
  extraerFn('gmailNombreBase'), extraerFn('gmailQuerysPorArchivo'),
  extraerFn('gmailBuscarHitPorAdjunto'), extraerFn('gmailHoraApiPorArchivo', true),
  extraerFn('gmailWebBarridoOrdenado', true), extraerFn('gmailAplicarHitApi'),
  extraerFn('gmailHoraLimaTxt')
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

console.log('── UI: ayuda contraída + banner ──');
T('v3.2.6: tooltip «ⓘ reglas de armado» retirado (pedido del usuario)', html.includes('reglas de armado'), false);
T('v3.2.6: sin recuadro desplegable .tipr en la ficha del sello', /class="tipr"/.test(html), false);
T('banner v3.2.16', /CORPAC AIS\/ARO Platform v3\.2\.16/.test(html), true);
T('banner: «API de Gmail: busca el correo por el nombre del archivo cargado»', /API de Gmail: busca el correo por el nombre del archivo cargado/.test(html), true);
T('CSS .tipr:hover despliega el recuadro', /\.tipr:hover \.tipr-b,\.tipr:focus-within \.tipr-b\{display:block\}/.test(html), true);

// ── v3.1.8: fixture StarPerú (captura del usuario) — formulario
// electrónico: una casilla por carácter, rótulos ARRIBA de sus casillas,
// estela «M» en la misma banda que la letra del tipo, REG/ en el c-18 ──
var FIX_STARP_ITEMS = [];
(function () {
  function C(str, x, y) { FIX_STARP_ITEMS.push({ str: str, x: x, y: y }); }
  C('PLAN DE VUELO / FLIGHT PLAN', 300, 700);
  C('FPL', 720, 700);
  // c-7: rótulo a la izquierda, valor en casillas por carácter
  C('7. IDENTIFICACION DE AERONAVE', 100, 672);
  C('S', 140, 648); C('R', 152, 648); C('U', 164, 648);
  C('2', 176, 648); C('2', 188, 648); C('2', 200, 648); C('6', 212, 648);
  // c-8: rótulos ARRIBA, letra en la casilla DEBAJO
  C('8. REGLAS DE VUELO', 100, 630);
  C('TIPO DE VUELO', 260, 630);
  C('CATEGORIA DE ESTELA', 430, 630);
  C('I', 130, 612); C('S', 290, 612); C('M', 470, 612); // M del c-9, misma banda
  // c-9: tipo de aeronave
  C('TIPO DE AERONAVE', 100, 590);
  C('B', 130, 568); C('7', 142, 568); C('3', 154, 568); C('3', 166, 568);
  // c-13: aeródromo en casillas + EOBT con rótulo intermedio
  C('13. AERODROMO DE SALIDA', 100, 540);
  C('S', 140, 516); C('P', 152, 516); C('H', 164, 516); C('I', 176, 516);
  C('EOBT / TIME', 430, 540);
  C('0', 450, 516); C('1', 462, 516); C('4', 474, 516); C('5', 486, 516);
  // c-16
  C('16. AERODROMO DE DESTINO', 100, 480);
  C('S', 140, 456); C('P', 152, 456); C('J', 164, 456); C('C', 176, 456);
  C('EET TOTAL', 430, 480);
  C('0', 450, 456); C('1', 462, 456); C('0', 474, 456); C('0', 486, 456);
  // c-18: cada entrada en su fila; el valor en casillas por carácter
  C('18. OTROS DATOS', 100, 420);
  C('REG/', 130, 396);
  C('O', 170, 396); C('B', 182, 396); C('-', 194, 396);
  C('2', 206, 396); C('1', 218, 396); C('7', 230, 396); C('6', 242, 396); C('P', 254, 396);
  C('PBN/', 130, 376);
  C('B', 170, 376); C('1', 182, 376); C('D', 194, 376); C('1', 206, 376); C('O', 218, 376); C('1', 230, 376);
  C('DOF/', 130, 356);
  C('2', 170, 356); C('6', 182, 356); C('1', 194, 356); C('1', 206, 356); C('1', 218, 356); C('7', 230, 356);
  C('NAV/', 130, 336);
  C('G', 170, 336); C('N', 182, 336); C('S', 194, 336); C('S', 206, 336);
})();
// el texto del PDF = ítems unidos por espacio (como hace loadPDF con pdf.js)
var FIX_STARP_TXT = FIX_STARP_ITEMS.map(function (o) { return o.str; }).join(' ');

console.log('── v3.1.8: REG/ en formularios electrónicos (StarPerú) ──');
var ST = fplExtraerCampos(FIX_STARP_TXT, FIX_STARP_ITEMS, 'PLAN DE VUELO CX LIM 2226 16 NOV.pdf');
T('StarPerú: c-7 = SRU2226', ST.c7, 'SRU2226');
T('StarPerú: tipo S (letra bajo el rótulo; estela M separada por hueco)', ST.tipoS, true);
T('StarPerú: REG/ = OB2176P (v3.2.5: sin guion, como escribe el Doc 4444)', ST.reg, 'OB2176P');
T('StarPerú: EOBT = 0145 (rótulo «EOBT / TIME» intermedio)', ST.eoibt, '0145');
T('StarPerú: valor compuesto → «SRU2226 OB2176P MK» (tipo S: c-7 + REG/ + iniciales)', fplComponerRegistro(ST), 'SRU2226 OB2176P MK');
var ST2 = fplExtraerCampos('TIPO DE VUELO S REG/ OB - 2176P AERODROMO DE SALIDA SPHI EOBT / TIME 0145', null, '');
T('texto plano (sin geometría): REG/ con guion espaciado → OB2176P', ST2.reg, 'OB2176P');
var ST3 = fplExtraerCampos('REG/ GNSS PBN/ B1 DOF/ 261117', null, '');
T('«REG/ GNSS» NO es matrícula (respaldo exige dígitos)', ST3.reg, '');
var ST4 = fplExtraerCampos('REG/OB-2147', null, '');
T('regresión: «REG/OB-2147» pegado sigue funcionando (v3.2.5: sin guion)', ST4.reg, 'OB2147');
console.log('── v3.2.5: planes REALES subidos por el usuario (items pdf.js) ──');
var RS = fplExtraerCampos(FIX_SRU.texto, FIX_SRU.items, 'PV CIX LIM 2226.pdf');
T('SRU 2226 real: c-7 = SRU2226 (item «SRU 2226» con espacio, 19 pt bajo el rótulo)', RS.c7, 'SRU2226');
T('SRU 2226 real: tipo S (casillero 8 con I/S)', RS.tipoS, true);
T('SRU 2226 real: REG/ = OB2176P (rótulo «REG./» con punto; sin guion)', RS.reg, 'OB2176P');
T('SRU 2226 real: valor compuesto → «SRU2226 OB2176P MK» (lo que pidió el usuario)', fplComponerRegistro(RS), 'SRU2226 OB2176P MK');
var RJ = fplExtraerCampos(FIX_JAP.texto, FIX_JAP.items, 'ATC JAP 7361.pdf');
T('JAP 7361 real (regresión): c-7 = JAP7361', RJ.c7, 'JAP7361');
T('JAP 7361 real (regresión): REG/ = CCDIU', RJ.reg, 'CCDIU');
T('JAP 7361 real (regresión): valor compuesto → «JAP7361 CCDIU MK»', fplComponerRegistro(RJ), 'JAP7361 CCDIU MK');
T('v3.2.5: «SRU 2226» con espacio en texto plano también se captura', fplExtraerCampos('PLAN DE VUELO SRU 2226 B733 AERODROMO DE SALIDA SPJC 0145', null, '').c7, 'SRU2226');
T('v3.2.5: «REG./OB-2176P» con punto en texto plano → OB2176P', fplExtraerCampos('18. OTROS DATOS REG./OB-2176P', null, '').reg, 'OB2176P');
var RG = fplExtraerCampos('REG/OB-2176P AERODROMO DE SALIDA SPHI 0145', null, '');
T('v3.2.5: sin c-7 detectable, el respaldo NO roba la matrícula del REG/ como c-7', RG.c7, '');
T('v3.2.5: …el campo compone matrícula + EOBT → «OB2176P 0145 MK»', fplComponerRegistro(RG), 'OB2176P 0145 MK');
T('v3.2.5: geometría c-7 con banda de 24 pt y valores con espacio interno', html.includes('var h=24;') && html.includes('/^[A-Z0-9]{1,3}(?:\\s+[A-Z0-9]{1,4})?$/i'), true);
var ST5 = fplExtraerCampos('(FPL-SRU2226-IS' + '\n' + '-OB2176P' + '\n' + 'DOF/261117)', null, '');
T('regresión: télex (FPL-SRU2226-IS sigue siendo tipo S)', ST5.tipoS, true);

// ── v3.1.9: hora de recepción por archivo cargado (Gmail asistido) ──
const HORA = require('../src/gmail-hora/hora');
const GH = require('../src/gmail-hora/GmailHoraService');
const mainjs = fs.readFileSync(path.join(__dirname, '..', 'src', 'main.js'), 'utf8');
const preloadjs = fs.readFileSync(path.join(__dirname, '..', 'src', 'preload.js'), 'utf8');
const monjs = fs.readFileSync(path.join(__dirname, '..', 'src', 'gmail-monitor.js'), 'utf8');
const svcjs = fs.readFileSync(path.join(__dirname, '..', 'src', 'gmail-hora', 'GmailHoraService.js'), 'utf8');
function iso(ms) { return ms ? new Date(ms).toISOString() : null; }

console.log('── v3.1.9: parser de la hora de Gmail (zona Lima UTC-5) ──');
T('«17 nov 2026, 8:00 p. m.» → 2026-11-18T01:00Z', iso(HORA.parseHoraGmail('17 nov 2026, 8:00 p. m.')), '2026-11-18T01:00:00.000Z');
T('«17 nov 2026, 8:00 p.m.» (sin espacios)', iso(HORA.parseHoraGmail('17 nov 2026, 8:00 p.m.')), '2026-11-18T01:00:00.000Z');
T('«17 de noviembre de 2026, 20:00» (mes completo)', iso(HORA.parseHoraGmail('17 de noviembre de 2026, 20:00')), '2026-11-18T01:00:00.000Z');
T('«sáb, 17 nov 2026, 11:15 p. m.» (día de semana delante)', iso(HORA.parseHoraGmail('sáb, 17 nov 2026, 11:15 p. m.')), '2026-11-18T04:15:00.000Z');
T('«17 set 2026, 8:00 a. m.» (setiembre es-419)', iso(HORA.parseHoraGmail('17 set 2026, 8:00 a. m.')), '2026-09-17T13:00:00.000Z');
T('«17 sept 2026, 8:00 a. m.» (sept es-ES)', iso(HORA.parseHoraGmail('17 sept 2026, 8:00 a. m.')), '2026-09-17T13:00:00.000Z');
T('«31 ene 2027, 11:15 p. m.» (cruce de medianoche y de mes UTC)', iso(HORA.parseHoraGmail('31 ene 2027, 11:15 p. m.')), '2027-02-01T04:15:00.000Z');
T('«12:05 a. m.» → 00:05 Lima = 05:05 UTC', new Date(HORA.parseHoraGmail('12:05 a. m.')).getUTCHours() === 5, true);
T('«12:30 p. m.» → 12:30 Lima = 17:30 UTC (no 0:30)', new Date(HORA.parseHoraGmail('12:30 p. m.')).getUTCHours() === 17 && new Date(HORA.parseHoraGmail('12:30 p. m.')).getUTCMinutes() === 30, true);
var sinAnio = HORA.parseHoraGmail('17 nov, 8:00 p. m.');
T('«17 nov, 8:00 p. m.» sin año → año en curso, 01:00Z del 18', sinAnio !== null && new Date(sinAnio).getUTCMonth() === 10 && new Date(sinAnio).getUTCDate() === 18 && new Date(sinAnio).getUTCHours() === 1, true);
var soloHora = HORA.parseHoraGmail('20:15');
T('«20:15» solo hora → hoy Lima, 01:15 UTC del día siguiente', soloHora !== null && new Date(soloHora).getUTCHours() === 1 && new Date(soloHora).getUTCMinutes() === 15 && Math.abs(soloHora - Date.now()) < 48 * 3600e3, true);
T('texto sin hora → null', HORA.parseHoraGmail('Plan de vuelo sin hora'), null);
// —— v3.2.2: regla +05 explícita (Lima UTC−5 → UTC) ——
T('REGLA DEL USUARIO: «19 nov 2026, 7:00 a. m.» → 12:00 UTC', iso(HORA.parseHoraGmail('19 nov 2026, 7:00 a. m.')), '2026-11-19T12:00:00.000Z');
T('«19 nov 2026, 07:00» (24 h) → 12:00 UTC', iso(HORA.parseHoraGmail('19 nov 2026, 07:00')), '2026-11-19T12:00:00.000Z');
T('«19 nov 2026, 8:30 p. m.» → 01:30 UTC DEL DÍA SIGUIENTE', iso(HORA.parseHoraGmail('19 nov 2026, 8:30 p. m.')), '2026-11-20T01:30:00.000Z');
T('«19 nov 2026, 11:55 p. m.» → 04:55 UTC del día siguiente', iso(HORA.parseHoraGmail('19 nov 2026, 11:55 p. m.')), '2026-11-20T04:55:00.000Z');
T('«19 nov 2026, 12:05 a. m.» → 05:05 UTC del MISMO día', iso(HORA.parseHoraGmail('19 nov 2026, 12:05 a. m.')), '2026-11-19T05:05:00.000Z');
T('formato inglés «Nov 19, 2026, 7:00 AM» → null (se avisa con texto crudo)', HORA.parseHoraGmail('Nov 19, 2026, 7:00 AM'), null);
T('mes inválido → null', HORA.parseHoraGmail('17 xyz 2026, 8:00'), null);
T('minutos imposibles → null', HORA.parseHoraGmail('17 nov 2026, 8:99'), null);

console.log('── v3.1.9: baseDe / coincidencia de fila ──');
T('baseDe quita la extensión', GH.baseDe('ATC JAP 7163.pdf'), 'ATC JAP 7163');
T('baseDe sin extensión no cambia', GH.baseDe('GENDEC OB2209'), 'GENDEC OB2209');
T('fila que menciona el archivo coincide', GH.filaCoincide('ATC JAP 7163 CIXLIM — 5 ago', 'ATC JAP 7163'), true);
T('fila de otro correo no coincide', GH.filaCoincide('DISTRIBUCION 18NOV otro', 'ATC JAP 7163'), false);
T('coincidencia tolera mayúsculas y guiones', GH.filaCoincide('OB 2176 P adjunto', 'ob-2176-p'), true);
T('cadena vacía no coincide', GH.filaCoincide('lo que sea', ''), false);
T('disponible() informa si Playwright está', typeof GH.disponible().playwright, 'boolean');

console.log('── v3.1.9: integración escritorio (main / preload / servicio) ──');
T('main.js: IPC gmail-hora:buscar', /ipcMain\.handle\('gmail-hora:buscar'/.test(mainjs), true);
T('main.js: IPC gmail-hora:estado', /ipcMain\.handle\('gmail-hora:estado'/.test(mainjs), true);
T('main.js: evento de progreso gmail-hora:evento', /gmail-hora:evento/.test(mainjs), true);
T('main.js: parsea la hora y devuelve epoch + UTC', /parseHoraGmail\(r\.horaRecepcion\)/.test(mainjs) && /recibidoUTC/.test(mainjs), true);
T('main.js: cierra el navegador asistido al salir', /before-quit/.test(mainjs), true);
T('main.js: perfil persistente en userData', /gmail-playwright-profile/.test(mainjs), true);
// —— v3.2.3: login de Gmail dentro de la app ——
const uaElectron = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) PDFPro/3.2.3 Chrome/128.0.6613.114 Electron/32.2.0 Safari/537.36';
const uaChrome = uaElectron.split(' ').filter((t) => !/^(electron|pdfpro|pdfpro-suite)\/[\d.]+$/i.test(t)).join(' ');
T('v3.2.3: UA de la ventana de login SIN «Electron/…» ni «PDFPro/…» (lógica real)', /electron\/|pdfpro\//i.test(uaChrome), false);
T('v3.2.3: el UA limpio sigue pareciendo Chrome de escritorio', /Chrome\/[\d.]+/.test(uaChrome) && /Mozilla\/5\.0/.test(uaChrome), true);
T('v3.2.3: main.js fija el UA de Chrome en partición y webContents', /particion\.setUserAgent\(uaChrome\)/.test(mainjs) && /webContents\.setUserAgent\(uaChrome\)/.test(mainjs), true);
T('v3.2.3: main.js usa el mismo filtro de tokens que la prueba', mainjs.includes('/^(electron|pdfpro|pdfpro-suite)\\/[\\d.]+$/i'), true);
T('v3.2.3: login compartido — una llamada en curso reutiliza la misma promesa', /if \(_gmailHoraLoginPromesa\) return _gmailHoraLoginPromesa;/.test(mainjs), true);
T('v3.2.3: la ventana de login toma el foco al mostrarse', /_gmailHoraLoginWin\.show\(\); _gmailHoraLoginWin\.focus\(\);/.test(mainjs), true);
T('v3.2.15: manual=true salta el candado de sesión tras login cancelado', /if \(!manual && _gmailHoraLoginCancelado\)/.test(mainjs), true);
T('v3.2.3: el IPC reenvía el flag manual', /_gmailHoraBuscar\(String\(archivo \|\| ''\)\.trim\(\), !!manual\)/.test(mainjs), true);
T('v3.2.3: preload reenvía manual al IPC', preloadjs.includes("gmailHoraBuscar: (archivo, manual) => ipcRenderer.invoke('gmail-hora:buscar', archivo, manual)"), true);
T('v3.2.4: el sondeo del login exige cookies de sesión (SID/SAPISID/HSID/SSID/APISID)', /const conSesionGoogle = async \(\) =>/.test(mainjs) && /\['SID', 'SAPISID', 'HSID', 'SSID', 'APISID'\]/.test(mainjs), true);
T('v3.2.4: la ventana NO se cierra mientras la página sigue cargando (pantalla de carga sin sesión)', /webContents\.isLoading\(\)/.test(mainjs), true);
T('v3.2.4: sesión confirmada 2 sondeos seguidos antes de cerrar la ventana', mainjs.includes('confirmaciones === 2'), true);
T('v3.2.4: log de login incompleto incluye la URL final (diagnóstico)', /login no completado \(\$\{motivo \|\| 'ventana cerrada'\}\)\$\{urlLogin/.test(mainjs), true);
T('preload: bridge gmailHoraBuscar/gmailHoraEstado/onGmailHoraEvento', /gmailHoraBuscar/.test(preloadjs) && /gmailHoraEstado/.test(preloadjs) && /onGmailHoraEvento/.test(preloadjs), true);
T('servicio: usa el Chrome del sistema (channel: chrome)', /channel:\s*'chrome'/.test(svcjs), true);
T('servicio: búsqueda libre estricta (no abre correo al azar)', /estricto/.test(svcjs) && /modo === 'texto'/.test(svcjs), true);
T('servicio: portapapeles desactivado por defecto', /copiar = false/.test(svcjs), true);
T('servicio: inyectarCookies() presente (sesión desde la ventana en-app)', /async inyectarCookies\(/.test(svcjs), true);
T('servicio: ya NO relanza ventana de Chrome para login', /_visible/.test(svcjs), false);
T('servicio: _esperarLogin lanza LoginRequerido (login fuera del servicio)', /throw new LoginRequeridoError\('Gmail requiere iniciar sesión\.'\)/.test(svcjs), true);
T('servicio: urlActual() para diagnóstico', /urlActual\(\)\s*\{/.test(svcjs), true);

console.log('── v3.2.0: login de Gmail DENTRO de la app (main) ──');
T('main.js: abrirLoginGmailEnApp() abre ventana hija', /function abrirLoginGmailEnApp\(\)/.test(mainjs), true);
T('main.js: ventana con partición persistente gmail-login', /persist:gmail-login/.test(mainjs), true);
T('main.js: cosecha cookies de google.com (cookies.getAll + filtro)', /cookies\.getAll\(\{\}\)/.test(mainjs) && /google\\\.com\$/.test(mainjs), true);
T('main.js: al pedir sesión → login en-app + inyección + reintento', /LoginRequeridoError/.test(mainjs) && /inyectarCookies\(cookies\)/.test(mainjs) && /buscando de nuevo/.test(mainjs), true);
T('main.js: detecta sesión viendo mail.google.com en la ventana', /mail\\\.google\\\.com/.test(mainjs), true);
T('main.js: cierra también la ventana de login al salir', /_gmailHoraLoginWin && !_gmailHoraLoginWin\.isDestroyed\(\)/.test(mainjs), true);
T('main.js: registro de diagnóstico gmail-hora.log', /gmail-hora\.log/.test(mainjs) && /function gmailHoraLog\(/.test(mainjs), true);
T('main.js: todo evento también se anota en el registro', /gmailHoraLog\(\(tipo === 'login' \? '\[login\] ' : ''\) \+ msg\)/.test(mainjs), true);
T('main.js: búsquedas serializadas (una a la vez)', /_gmailHoraCadena/.test(mainjs) && /_gmailHoraBuscar\(String\(archivo/.test(mainjs), true);
T('main.js: hasta 2 rondas de login+inyección', /ronda <= 2/.test(mainjs), true);
T('main.js: tipo SesionNoTransferida tras agotar rondas', /tipo: 'SesionNoTransferida'/.test(mainjs), true);
T('main.js: tipo LoginCancelado + candado por sesión (no más ventana en bucle)', /tipo: 'LoginCancelado'/.test(mainjs) && /_gmailHoraLoginCancelado = true;/.test(mainjs), true);
T('main.js: la ventana de login se cierra sola al cosechar', /ventana ya cumplió su misión: se cierra sola/.test(mainjs), true);
T('main.js: la URL del navegador se anota en cada ronda', /_gmailHoraSvc\.urlActual\(\)/.test(mainjs), true);

console.log('── v3.1.9: UI — panel Gmail + enganches tras carga ──');
T('botón «🕐 Hora del correo» ELIMINADO (v3.2.0)', /gmailHoraArchivo\(false\)/.test(html) || /id="gmailHoraBox"/.test(html) || /Hora del correo del archivo cargado<\/button>/.test(html), false);
T('toggle «Automático al cargar» ELIMINADO', /id="gmailHoraAuto"/.test(html) || /pdfpro_gmail_hora_auto/.test(html), false);
T('gmailHoraArchivo acepta manual y reintento; el enganche automático la llama sin argumentos', /async function gmailHoraArchivo\(manual,reintento\)\{/.test(html) && /setTimeout\(gmailHoraArchivo,1500\)/.test(html), true);
T('archivo aún no llegado: marca sesión válida, agenda re-búsqueda y avisa (toast solo fuera de reintentos)', /tipo==='ArchivoNoEncontradoError'\)\{gmailLoginBtnOcultar\(\);_gmailAsistidaSesionOk=true;gmailHoraReintentoAgendar\(\);if\(!reintento\)toast\('📭/.test(html), true);
T('correo sin hora legible: ya NO es silencio — avisa y reintenta (v3.2.11)', /tipo==='HoraNoExtraidaError'\)\{gmailLoginBtnOcultar\(\);_gmailAsistidaSesionOk=true;gmailHoraReintentoAgendar\(\);if\(!reintento\)toast\('📧/.test(html), true);
T('login cancelado se AVISA y muestra el botón de reintento', /tipo==='LoginCancelado'\)\{\s*_gmailAsistidaSesionOk=false;\s*gmailLoginBtnMostrar\(\);/.test(html), true);
T('sesión no transferida se AVISA y muestra el botón de reintento', /tipo==='SesionNoTransferida'\)\{\s*_gmailAsistidaSesionOk=false;\s*gmailLoginBtnMostrar\(\);/.test(html), true);
T('aviso de sesión indica enviar gmail-hora.log', /%APPDATA%/.test(html) && /gmail-hora\.log/.test(html), true);
T('gmailAplicarHora llena los campos en UTC', /function gmailAplicarHora[\s\S]{0,420}getUTCHours/.test(html), true);
T('gmailUsarHora (ruta OAuth) delega en gmailAplicarHora (fix UTC)', /function gmailUsarHora[\s\S]{0,220}gmailAplicarHora/.test(html), true);
T('8 enganches gmailHoraAuto (3 al cargar + 1 al cambiar de pestaña + 4 tras conectar OAuth)', (html.match(/gmailHoraAuto\(\);?\}catch/g) || []).length, 8);
T('hora leída pero no interpretada → toast con texto crudo', /no interpretada: «'\+r\.horaRecepcion/.test(html), true);
T('v3.2.2: toast muestra la hora de Gmail y la conversión +5 h', /\(hora Lima\) \+5 h → UTC/.test(html), true);
T('v3.2.2: gmailAplicarHora recibe el texto crudo de Gmail', /gmailAplicarHora\(ms,origen,gmailLocal,tab\)/.test(html), true);
T('v3.2.2: la búsqueda automática pasa r.horaRecepcion al aplicar', /Gmail'\),r\.horaRecepcion,_tab\)/.test(html), true);
T('v3.2.3: botón «Iniciar sesión en Gmail» junto a Hora Recepción (oculto por defecto)', /id="gmailLoginBtn" class="btn btn-ghost btn-sm btn-full" style="display:none;/.test(html), true);
T('v3.2.3: el botón lanza gmailLoginManual()', /onclick="gmailLoginManual\(\)"/.test(html), true);
T('v3.2.3: gmailLoginManual reintenta al momento (manual=true; v3.2.9: la web va antes por OAuth)', /function gmailLoginManual\(\)\{[\s\S]*?gmailHoraArchivo\(true\);\s*\}/.test(html), true);
T('v3.2.3: LoginCancelado MUESTRA el botón y lo dice en el toast', /if\(r\.tipo==='LoginCancelado'\)\{\s*_gmailAsistidaSesionOk=false;\s*gmailLoginBtnMostrar\(\);/.test(html) && /pulsa «🔗 Iniciar sesión en Gmail»/.test(html), true);
T('v3.2.3: SesionNoTransferida también muestra el botón', /if\(r\.tipo==='SesionNoTransferida'\)\{\s*_gmailAsistidaSesionOk=false;\s*gmailLoginBtnMostrar\(\);/.test(html), true);
T('v3.2.3: éxito de la búsqueda oculta el botón', /gmailLoginBtnOcultar\(\);\s*\/\/ la sesión quedó funcionando/.test(html), true);
T('v3.2.3: gmailHoraArchivo acepta manual y lo pasa al IPC', /async function gmailHoraArchivo\(manual,reintento\)/.test(html) && /gmailHoraBuscar\(nombre,!!manual\)/.test(html), true);
T('error inesperado del flujo también se avisa', /Error buscando el correo: '\+e\.message/.test(html), true);

console.log('── v3.1.7: botón retirado, detección 100% automática ──');
T('botón «✈ Detectar» eliminado (sin referencias de código)', /matriculaDetectarManual/.test(html) || />✈ Detectar</.test(html), false);
T('v3.2.6: texto de ayuda «La detección es automática» retirado', html.includes('La detección es automática'), false);
T('hook Word/Excel nativos (nvAutoMatricula tras el toast)', /modo Word[^\n]*\n    nvAutoMatricula\(tab\);/.test(html) && /modo Excel[^\n]*\n    nvAutoMatricula\(tab\);/.test(html), true);
T('autoOcrMatricula sobrescribe con _fplSetMatricula', /autoOcrMatricula[\s\S]*?_fplSetMatricula\(m\)/.test((function(){var i=html.indexOf('async function autoOcrMatricula');return html.slice(i,i+2600);})()), true);
T('v3.2.4: sin detección el campo se LIMPIA y se avisa («✈ Matrícula no detectada»)', /var nadaDetectado=function\(\)\{\s*_fplSetMatricula\(''\);/.test(html) && html.includes('Matrícula no detectada en este documento'), true);
T('v3.2.4: autoOcrMatricula termina en nadaDetectado() y el OCR es vía interna', html.includes('nadaDetectado();') && /if\(window\.Tesseract&&pdfDoc\)\{/.test(html), true);
T('v3.2.4: respaldo c7 con designadores ICAO + nº de vuelo (SRU2226, JAP7163…)', html.includes('_FPL_DESIGNADOR.source.replace'), true);
T('v3.2.4: nvAutoMatricula (Word/Excel) también limpia sin detección', /function nvAutoMatricula[\s\S]{0,700}?_fplSetMatricula\(''\)/.test(html), true);

(async function () {
  // —— v3.2.1: inyectarCookies cookie-a-cookie (contexto falso) ——
  var capturadas = [];
  var svc = new GH.GmailHoraService({});
  svc.context = { addCookies: async function (c) {
    if (c[0] && c[0].name === 'MALA') throw new Error('cookie rechazada por Chromium');
    capturadas.push.apply(capturadas, c);
  } };
  svc.page = {};
  var k = await svc.inyectarCookies([
    { name: 'SID', value: 'abc', domain: '.google.com', path: '/', secure: false, httpOnly: true, expirationDate: 1900000000.7, sameSite: 'no_restriction' },
    { name: 'NID', value: 'xyz', domain: '.google.com', path: '/', secure: false, httpOnly: false, sameSite: 'lax' },
    { name: 'MALA', value: 'x', domain: '.google.com', path: '/' },
    { name: 'OSS', value: 'ses', domain: 'accounts.google.com', path: '/' }
  ]);
  T('inyectarCookies devuelve {total, ok, fallos}', k.total === 4 && k.ok === 3 && k.fallos.length === 1, true);
  T('cookie rechazada no arrastra a las demás', capturadas.length, 3);
  var sid = capturadas[0];
  T('sameSite no_restriction → None', sid.sameSite, 'None');
  T('SameSite=None viaja con Secure forzado (v3.2.1)', sid.secure, true);
  T('sameSite lax → Lax', capturadas[1].sameSite, 'Lax');
  T('sin sameSite no se envía el campo', 'sameSite' in capturadas[2], false);
  T('expirationDate pasa como expires (entero)', sid.expires, 1900000000);
  T('httpOnly se conserva', sid.httpOnly, true);
  T('dominio y ruta se conservan', sid.domain, '.google.com');
  T('el fallo identifica la cookie por nombre', /MALA/.test(k.fallos[0]), true);
  var k0 = await svc.inyectarCookies([]);
  T('lista vacía → {total:0, ok:0}', k0.total === 0 && k0.ok === 0, true);

  // —— autoOcrMatricula: llena y SOBRESCRIBE ——
  global.pageCount = 1; global.pageTexts = [FIX_CAPTURA]; global.pageItems = [[]];
  global.pdfDoc = null; global.fileName = 'FPL OB2066 SPHI SPRU 17-11.pdf';
  campos.selloMatricula.value = ''; campos.mobSelloMatricula.value = '';
  await autoOcrMatricula();
  T('PDF al cargar → campo «OB2066 2020 MK» (automático, sin botón)', campos.selloMatricula.value, 'OB2066 2020 MK');
  T('…y el campo móvil queda sincronizado', campos.mobSelloMatricula.value, 'OB2066 2020 MK');
  campos.selloMatricula.value = 'OB2032 1100 MK';   // valor del documento anterior
  await autoOcrMatricula();
  T('cargar otro FPL SOBRESCRIBE («OB2032 1100 MK» → «OB2066 2020 MK»)', campos.selloMatricula.value, 'OB2066 2020 MK');
  global.pageTexts = ['PV CIX LIM 2226\nAERONAVE SRU2226 B733\nAERODROMO DE SALIDA SPJC 0145'];
  global.fileName = 'PV CIX LIM 2226.pdf';
  await autoOcrMatricula();
  T('v3.2.4: plan de aerolínea SRU 2226 → campo «SRU2226 0145 MK» (reporte real)', campos.selloMatricula.value, 'SRU2226 0145 MK');
  global.pageTexts = ['LICENCIA FUNCIONAL ALA LIVIANA DNI 12345678 VIGENCIA 2027'];
  global.fileName = 'licencia.pdf';
  campos.selloMatricula.value = 'OB2147 MK';        // valor del documento ANTERIOR
  await autoOcrMatricula();
  T('v3.2.4: documento sin matrícula → el campo se LIMPIA (antes quedaba el valor viejo y viajaba al exportar)', campos.selloMatricula.value, '');

  // —— nvAutoMatricula: Word/Excel (texto visible de la pestaña) ——
  global.pageTexts = ['']; global.fileName = '';
  campos.selloMatricula.value = '';
  nvAutoMatricula({ nvEl: { innerText: FIX_CAPTURA } });
  T('Word/Excel (texto visible) → campo «OB2066 2020 MK»', campos.selloMatricula.value, 'OB2066 2020 MK');
  campos.selloMatricula.value = 'OB2147 MK';
  nvAutoMatricula({ nvEl: { innerText: 'hola' } });
  T('texto corto/irrelevante → no toca el campo', campos.selloMatricula.value, 'OB2147 MK');
  nvAutoMatricula(null);
  T('pestaña sin contenido → no lanza error', true, true);

  /* ════ v3.2.6 — hora del correo POR ARCHIVO CARGADO (API de Gmail) ════ */
  console.log('── v3.2.6: consultas y coincidencia por adjunto (código real) ──');
  T('querys para «PV CIX LIM 2226.pdf»: filename completo, sin extensión y texto libre',
    gmailQuerysPorArchivo('PV CIX LIM 2226.pdf'),
    ['filename:"PV CIX LIM 2226.pdf"', 'filename:"PV CIX LIM 2226"', '"PV CIX LIM 2226" has:attachment']);
  T('sin extensión no repite la consulta filename', gmailQuerysPorArchivo('GENDEC OB2209'), ['filename:"GENDEC OB2209"', '"GENDEC OB2209" has:attachment']);
  T('nombre vacío → sin consultas', gmailQuerysPorArchivo(''), []);
  var HITMS = 1763000000000;
  var msgsHit = [
    { recibidoMs: 0, adjuntos: ['PV CIX LIM 2226.pdf'] },
    { recibidoMs: HITMS, de: 'StarPerú <dsp@sru.com.pe>', adjuntos: ['ATC JAP 7361.pdf', 'PV CIX LIM        2226.pdf'] }
  ];
  var hit = gmailBuscarHitPorAdjunto(msgsHit, 'PV CIX LIM 2226.pdf');
  T('hit: coincide pese a espacios múltiples y salta al mensaje sin hora', hit && hit.recibidoMs, HITMS);
  T('estricto: adjunto distinto → null (nunca un correo al azar)', gmailBuscarHitPorAdjunto([{ recibidoMs: 1, adjuntos: ['OTRO.pdf'] }], 'PV CIX LIM 2226.pdf'), null);
  T('lista nula → null', gmailBuscarHitPorAdjunto(null, 'x.pdf'), null);

  console.log('── v3.2.6: gmailHoraApiPorArchivo (web y escritorio, con stubs) ──');
  var CAPT = null, LLAMADAS = [];
  gmailIsDesktop = function () { return false; };
  gmailWebTokens = function () { return { access_token: 'tok' }; };
  var gmailWebBarridoOrdenadoReal = gmailWebBarridoOrdenado; // v3.2.14: la REAL (extraída del html), para probarla abajo
  gmailWebBarridoOrdenado = async function () { return null; }; // v3.2.14: el recorrido no acierta → respaldo filename:
  gmailWebBarrido = async function (q, max) {
    LLAMADAS.push(q);
    if (q === 'filename:"PV CIX LIM 2226"') return [{ recibidoMs: HITMS, de: 'StarPerú <dsp@sru.com.pe>', adjuntos: ['PV CIX LIM 2226.pdf'] }];
    return [];
  };
  gmailAplicarHora = function (ms, origen, gl) { CAPT = { ms: ms, origen: origen, gl: gl }; };
  campos.selloRxTime = { value: '' };
  var rApi = await gmailHoraApiPorArchivo('PV CIX LIM 2226.pdf');
  T('web conectada: encuentra el correo y aplica la hora', rApi === true && CAPT && CAPT.ms === HITMS, true);
  T('la cadena avanza: filename con extensión vacía → filename sin extensión acierta', LLAMADAS[0] === 'filename:"PV CIX LIM 2226.pdf"' && LLAMADAS[1] === 'filename:"PV CIX LIM 2226"', true);
  T('el origen menciona remitente y adjunto', CAPT && /StarPerú/.test(CAPT.origen) && /PV CIX LIM 2226\.pdf/.test(CAPT.origen), true);

  CAPT = null; LLAMADAS = [];
  campos.selloRxTime = { value: '1300' };
  var rLlena = await gmailHoraApiPorArchivo('PV CIX LIM 2226.pdf');
  T('hora ya escrita a mano: encuentra el correo pero NO la pisa', rLlena === true && CAPT === null, true);

  CAPT = null; LLAMADAS = [];
  campos.selloRxTime = { value: '' };
  gmailWebBarrido = async function () { LLAMADAS.push(1); return [{ recibidoMs: 5, adjuntos: ['CUALQUIER OTRA COSA.pdf'] }]; };
  var rEstricto = await gmailHoraApiPorArchivo('PV CIX LIM 2226.pdf');
  T('adjuntos que no coinciden: no se aplica nada', rEstricto === false && CAPT === null, true);
  T('…y se agotaron las 3 consultas del archivo', LLAMADAS.length, 3);

  gmailWebTokens = function () { return null; };
  LLAMADAS = [];
  var rSinSesion = await gmailHoraApiPorArchivo('PV CIX LIM 2226.pdf');
  T('web SIN conectar: no consulta y devuelve false (cae a la vía asistida)', rSinSesion === false && LLAMADAS.length === 0, true);

  gmailIsDesktop = function () { return true; };
  window.pdfproDesktop = { gmailBarrer: async function (q, max) { LLAMADAS.push(q); return { ok: true, mensajes: [{ recibidoMs: HITMS + 1, de: 'CORPAC <ais@corpac.gob.pe>', adjuntos: ['PV CIX LIM 2226.pdf'] }] }; } };
  CAPT = null; LLAMADAS = [];
  var rDesk = await gmailHoraApiPorArchivo('PV CIX LIM 2226.pdf');
  T('escritorio OAuth: usa gmailBarrer del proceso principal y aplica la hora', rDesk === true && CAPT && CAPT.ms === HITMS + 1 && LLAMADAS[0] === 'filename:"PV CIX LIM 2226.pdf"', true);

  console.log('── v3.2.6: flujo al cargar + textos retirados (estáticas) ──');
  T('gmailHoraAuto ya NO exige escritorio (la web también busca al cargar)', /function gmailHoraAuto\(\)\{\s*\n\s*if\(_gmailHoraT\)clearTimeout/.test(html), true);
  T('gmailHoraArchivo prueba PRIMERO la API y luego la vía asistida', /if\(await gmailHoraApiPorArchivo\(nombre,_tab\)\)\{gmailLoginBtnOcultar\(\);return;\}[\s\S]*?if\(!gmailHoraPuede\(\)\)\{/.test(html), true);
  T('hook al cargar el documento intacto (loadPDF → gmailHoraAuto)', /try\{gmailHoraAuto\(\);\}catch\(e\)\{\}/.test(html), true);
  T('texto «Captura la hora de recepción…» retirado', html.includes('para vincularla al documento cargado y al sello'), false);
  T('texto «Recepción: vacío = fecha/hora actuales…» retirado', html.includes('vacío = fecha/hora actuales'), false);
  T('texto «2 letras: 1er nombre + 1er apellido…» retirado', html.includes('Se calculan solas al iniciar sesión'), false);
  T('texto «Al guardar o exportar…» retirado', html.includes('Al guardar o exportar, el archivo se nombra'), false);
  T('los campos siguen intactos: Fecha/Hora Recepción, Iniciales y Matrícula', !!(html.includes('id="selloRxDate"') && html.includes('id="selloRxTime"') && html.includes('id="selloTxInitials"') && html.includes('id="selloMatricula"')), true);
  T('botón de reintento «Iniciar sesión en Gmail» sigue disponible', html.includes('id="gmailLoginBtn"'), true);
  T('banner del pie: tipo S sin guion y ejemplo del usuario (OB2134 1120 MK)', html.includes('SRU2226 OB2176P MK') && html.includes('OB2134 1120 MK'), true);

  /* ════ v3.2.7 — SRU2226 real: espacios múltiples + regla 04:00 pm → 21:00 UTC ════ */
  console.log('── v3.2.7: consultas con espacios colapsados («PV CIX LIM        2226.pdf») ──');
  var Q8 = gmailQuerysPorArchivo('PV CIX LIM        2226.pdf');
  T('la 1.ª consulta colapsa los 8 espacios del nombre real', Q8[0], 'filename:"PV CIX LIM 2226.pdf"');
  T('también se prueba el nombre tal cual llegó (8 espacios)', Q8.includes('filename:"PV CIX LIM        2226.pdf"'), true);
  T('y sin extensión, colapsado y tal cual', Q8.includes('filename:"PV CIX LIM 2226"') && Q8.includes('filename:"PV CIX LIM        2226"'), true);
  T('y el texto libre con has:attachment', Q8.includes('"PV CIX LIM 2226" has:attachment'), true);
  T('máximo 5 consultas por archivo', Q8.length, 5);

  console.log('── v3.2.7: regla del usuario — Gmail «04:00 pm» (16:00 Lima) + 5 h = 21:00 UTC ──');
  var MS2100 = Date.UTC(2026, 10, 19, 21, 0); // 19 nov 2026 21:00 UTC = 16:00 Lima
  T('«19 nov 2026, 4:00 p. m.» → 21:00 UTC del mismo día', iso(HORA.parseHoraGmail('19 nov 2026, 4:00 p. m.')), '2026-11-19T21:00:00.000Z');
  T('«19 nov 2026, 04:00 pm» (como lo escribe el usuario) → 21:00 UTC', iso(HORA.parseHoraGmail('19 nov 2026, 04:00 pm')), '2026-11-19T21:00:00.000Z');
  T('«19 nov 2026, 4:00 pm» sin cero inicial → 21:00 UTC', iso(HORA.parseHoraGmail('19 nov 2026, 4:00 pm')), '2026-11-19T21:00:00.000Z');
  T('solo hora «16:00» → 21:00 UTC (hoy Lima)', new Date(HORA.parseHoraGmail('16:00')).getUTCHours(), 21);
  T('solo hora «04:00 pm» → 21:00 UTC (hoy Lima)', new Date(HORA.parseHoraGmail('04:00 pm')).getUTCHours(), 21);
  var hit8 = gmailBuscarHitPorAdjunto([{ recibidoMs: MS2100, de: 'CORPAC AIS/ARO', adjuntos: ['PV CIX LIM        2226.pdf'] }], 'PV CIX LIM        2226.pdf');
  T('adjunto con 8 espacios coincide con el archivo cargado (normalizado)', hit8 && hit8.recibidoMs, MS2100);

  console.log('── v3.2.7: captura completa del SRU2226 (gmailAplicarHora real) ──');
  (0, eval)(extraerFn('gmailAplicarHora').replace('function gmailAplicarHora(', 'function gmailAplicarHoraReal('));
  updateSelloPreview = function () {};
  gmailAplicarHora = gmailAplicarHoraReal;
  CAPT = null; LLAMADAS = [];
  gmailIsDesktop = function () { return true; };
  window.pdfproDesktop = { gmailBarrer: async function (q, max) {
    LLAMADAS.push(q);
    if (q === 'filename:"PV CIX LIM 2226.pdf"') return { ok: true, mensajes: [{ recibidoMs: MS2100, de: 'CORPAC AIS/ARO <ais@corpac.gob.pe>', adjuntos: ['PV CIX LIM        2226.pdf'] }] };
    return { ok: true, mensajes: [] };
  } };
  campos.selloRxDate = campos.selloRxDate || { value: '' };
  campos.selloRxTime = { value: '' };
  var rSRU = await gmailHoraApiPorArchivo('PV CIX LIM        2226.pdf');
  T('SRU2226: la 1.ª consulta (colapsada) encuentra el correo', rSRU === true && LLAMADAS[0] === 'filename:"PV CIX LIM 2226.pdf"', true);
  T('SRU2226: «Hora Recepción» queda en 2100 (16:00 Lima + 5 h)', campos.selloRxTime.value, '2100');
  T('SRU2226: la fecha UTC queda 2026-11-19', campos.selloRxDate.value, '2026-11-19');
  T('SRU2226: gmailHoraLimaTxt muestra la hora Lima «16:00» para el toast', gmailHoraLimaTxt(MS2100), '16:00');
  T('SRU2226: 04:00 pm de Gmail → la app presenta 21:00', HORA.parseHoraGmail('19 nov 2026, 04:00 pm') === MS2100, true);

  console.log('── v3.2.7: vía asistida (Playwright) también colapsa los espacios ──');
  T('servicio: reintenta con espacios colapsados antes del texto libre', /colapsada = base\.replace\(\/\\s\+\/g, ' '\)/.test(svcjs) && svcjs.includes('filename:"${colapsada}"'), true);
  T('servicio: el texto libre usa el nombre SIN «(n)» y con espacios colapsados', svcjs.includes("await this._buscar((sinMarcas ? sinMarcas.replace(/\\s+/g, ' ').trim() : colapsada) || base)"), true);

  /* ════ v3.2.8 — Hora Recepción (UTC) y Matrícula por PESTAÑA ════ */
  console.log('── v3.2.8: los campos siguen a la pestaña activa ──');
  (0, eval)(extraerFn('docTabGet'));
  (0, eval)(extraerFn('_selloCamposGuardar'));
  (0, eval)(extraerFn('_selloCamposRestaurar'));
  fplMatriculaChanged = function () {};
  var tA = { id: 'A', fileName: 'PV CIX LIM        2226' };
  var tB = { id: 'B', fileName: 'ATC JAP 7361' };
  docTabs = [tA, tB]; activeTabId = 'A';
  campos.selloRxDate = { value: '' }; campos.selloRxTime = { value: '' }; campos.selloMatricula = { value: '' };

  gmailAplicarHora(Date.UTC(2026, 10, 19, 21, 0), 'correo SRU2226', '16:00', tA);
  T('A activa: 2100 queda en la ficha Y en la pestaña A (con su fecha)', campos.selloRxTime.value === '2100' && tA.selloHora === '2100' && tA.selloFecha === '2026-11-19', true);

  gmailAplicarHora(Date.UTC(2026, 10, 18, 7, 0), 'correo JAP7361', '07:00', tB);
  T('B inactiva: su 0700 se guarda en la pestaña B y NO pisa la ficha', tB.selloHora === '0700' && tB.selloFecha === '2026-11-18' && campos.selloRxTime.value === '2100', true);

  _fplSetMatricula('SRU2226 OB2176P MK');
  T('la matrícula detectada queda en la pestaña activa (A)', tA.selloMatricula === 'SRU2226 OB2176P MK' && campos.selloMatricula.value === 'SRU2226 OB2176P MK', true);

  _selloCamposGuardar(tA);
  _selloCamposRestaurar(tB);
  activeTabId = 'B';
  T('al cambiar a B la ficha muestra SUS valores (0700, sin su matrícula aún)', campos.selloRxTime.value === '0700' && campos.selloRxDate.value === '2026-11-18' && campos.selloMatricula.value === '', true);
  _fplSetMatricula('JAP7361 CCDIU MK');
  _selloCamposGuardar(tB);
  _selloCamposRestaurar(tA);
  activeTabId = 'A';
  T('al volver a A la ficha muestra 2100 y SU matrícula', campos.selloRxTime.value === '2100' && campos.selloMatricula.value === 'SRU2226 OB2176P MK', true);
  T('la matrícula de B no se perdió al alternar', tB.selloMatricula === 'JAP7361 CCDIU MK', true);

  _selloCamposRestaurar(null);
  T('sin documento → ficha limpia', campos.selloRxTime.value === '' && campos.selloMatricula.value === '', true);

  console.log('── v3.2.8: enganches del switch y de la apertura multi-archivo ──');
  T('docTabSwitch guarda los campos de la pestaña saliente', html.includes('_selloCamposGuardar(_sal)'), true);
  T('docTabSwitch restaura los campos del documento activo', html.includes('_selloCamposRestaurar(tab)'), true);
  T('docTabSwitch rebusca la hora en Gmail si el documento no la tiene', html.includes("if(!(tab.selloHora||'')&&tab.fileName&&tab.fileName!=='Sin título'){try{gmailHoraAuto();}catch(e){}}"), true);
  T('openFilesList guarda los campos antes de abrir la pestaña siguiente', /docTabSaveCurrent\(\);\s*_selloCamposGuardar\(docTabGet\(activeTabId\)\);/.test(html), true);
  T('gmailAplicarHora acepta la pestaña (4.º parámetro)', /function gmailAplicarHora\(ms,origen,gmailLocal,tab\)/.test(html), true);
  T('gmailHoraArchivo pasa SU pestaña a la búsqueda y a la aplicación', html.includes('gmailHoraApiPorArchivo(nombre,_tab)') && html.includes('r.horaRecepcion,_tab)'), true);
  T('cerrar el último tab limpia la ficha', html.includes('_selloCamposRestaurar(null)'), true);
  T('_fplSetMatricula guarda la matrícula en la pestaña activa', /if\(t\)t\.selloMatricula=v;/.test(html), true);

  /* ════ v3.2.9 → v3.2.12 — panel «Monitoreo Gmail»: retirado y RESTAURADO ════ */
  console.log('── v3.2.12: el panel de monitoreo de Gmail vuelve a la ficha ──');
  T('panel RESTAURADO: título «Monitoreo Gmail», estado, dot, Barrer ahora y lista', html.includes('Monitoreo Gmail') && html.includes('Barrer ahora') && html.includes('id="gmailList"') && html.includes('id="gmailDot"') && html.includes('id="gmailState"'), true);
  T('botones «Conectar Gmail» / «Desconectar» / «Barrer ahora» de vuelta en la interfaz', html.includes('>Conectar Gmail<') && html.includes('>Desconectar<') && /onclick="gmailBarrer\(true\)"/.test(html), true);
  T('el botón «🔗 Iniciar sesión en Gmail» sigue en la ficha del sello', html.includes('id="gmailLoginBtn"') && html.includes('gmailLoginManual()'), true);
  T('la caja del código OAuth vive junto al botón de login (oculta, como antes)', html.indexOf('id="gmailLoginBtn"') < html.indexOf('id="gmailManualBox"') && html.includes('id="gmailCodeInp"'), true);
  T('gmailLoginManual: WEB o ESCRITORIO sin servicio → OAuth · escritorio con servicio → vía asistida', (function () { var i = html.indexOf('function gmailLoginManual'); var s = html.slice(i, i + 1000); return /if\(!gmailIsDesktop\(\)\|\|!gmailHoraPuede\(\)\)\{[\s\S]*?gmailConnect\(\);[\s\S]*?return;[\s\S]*?gmailHoraArchivo\(true\);/.test(s); })(), true);
  T('tras conectar OAuth se rebusca la hora del archivo cargado (4 puntos de conexión)', (html.match(/gmailRefreshState\(\);try\{gmailHoraAuto\(\);\}catch\(e\)\{\}/g) || []).length, 4);

  /* ════ v3.2.10 — la captura de la hora, garantizada ════ */
  console.log('── v3.2.10: sin vía asistida ya no hay silencio ──');
  T('globals de sesión/reintento declarados junto a los de la hora', html.includes('var _gmailHoraOk=false,_gmailHoraT=null,_gmailSesionToast=false,_gmailReintentoT=null,_gmailReintentoN=0,_gmailAsistidaSesionOk=false,_gmailLoginCancelToast=false;'), true);
  T('sin vía asistida: botón «🔗» + aviso (una vez por sesión) en lugar del retorno silencioso', (function () { var i = html.indexOf('async function gmailHoraArchivo'); var s = html.slice(i, i + 3500); return /if\(!gmailHoraPuede\(\)\)\{[\s\S]{0,800}gmailHoraReintentoAgendar\(\);[\s\S]{0,500}gmailLoginBtnMostrar\(\);[\s\S]{0,700}_gmailSesionToast=true;[\s\S]{0,700}return;\s*\}/.test(s); })(), true);
  T('el aviso distingue escritorio («falta iniciar sesión») y web («Conecta Google»)', html.includes('falta iniciar sesión para capturar la hora') && html.includes('Conecta Google para capturar la hora'), true);
  T('con sesión OAuth pero sin resultados: reintento silencioso SIN botón', (function () { var i = html.indexOf('async function gmailHoraArchivo'); var s = html.slice(i, i + 3500); return /gmailHoraReintentoAgendar\(\);\s*\n\s*var _tok=null[\s\S]{0,200}if\(!_tok\)\{[\s\S]{0,80}gmailLoginBtnMostrar\(\);/.test(s); })(), true);
  T('escritorio sin servicio asistido: el botón 🔗 conecta por OAuth (no vuelve a caer en la vía bloqueada)', (function () { var i = html.indexOf('function gmailLoginManual'); var s = html.slice(i, i + 1000); return /if\(!gmailIsDesktop\(\)\|\|!gmailHoraPuede\(\)\)\{/.test(s); })(), true);
  T('cada búsqueda NUEVA renueva el presupuesto; las rondas de re-búsqueda no', /async function gmailHoraArchivo\(manual,reintento\)\{\s*\n\s*if\(!reintento\)_gmailReintentoN=0;/.test(html), true);
  T('al aplicar la hora se cancela la re-búsqueda pendiente', (function () { var i = html.indexOf('function gmailAplicarHora'); var s = html.slice(i, i + 400); return /^function gmailAplicarHora\(ms,origen,gmailLocal,tab\)\{\s*\n\s*if\(_gmailReintentoT\)\{clearTimeout\(_gmailReintentoT\);_gmailReintentoT=null;\}/.test(s); })(), true);
  T('re-búsqueda: API primero y, con sesión asistida válida, también la vía asistida (jamás login sorpresivo), cada 60 s, máx. 4', (function () { var i = html.indexOf('function gmailHoraReintentoAgendar'); var s = html.slice(i, i + 1600); return s.includes('},60000);') && s.includes('_gmailReintentoN>=4') && s.includes('gmailHoraApiPorArchivo(nombre,_tab)') && s.includes('_gmailAsistidaSesionOk&&gmailHoraPuede()') && s.includes('gmailHoraArchivo(false,true)') && !s.includes('gmailHoraBuscar'); })(), true);

  console.log('── v3.2.10: la re-búsqueda silenciosa funciona (código real) ──');
  (0, eval)(extraerFn('gmailHoraReintentoAgendar'));
  var CB = null, CBMS = 0, RETRY = [];
  var _st = global.setTimeout, _ct = global.clearTimeout;
  global.setTimeout = function (f, ms) { CB = f; CBMS = ms; return 1; };
  global.clearTimeout = function () {};
  gmailHoraApiPorArchivo = async function (n, t) { RETRY.push(n); return false; };
  docTabs = [{ id: 'A', fileName: 'PV CIX LIM        2226' }]; activeTabId = 'A';
  campos.selloRxTime = { value: '' };
  _gmailReintentoN = 0; _gmailReintentoT = null;
  gmailHoraReintentoAgendar();
  T('agenda la 1.ª re-búsqueda a 60 s', CBMS, 60000);
  await CB();
  T('la ronda busca el archivo de la pestaña activa por la API (nunca ventanas)', RETRY.length, 1);
  T('y agenda la siguiente ronda (presupuesto 2/4)', CBMS === 60000 && _gmailReintentoN, 2);
  global.setTimeout = _st; global.clearTimeout = _ct;

  /* ════ v3.2.11 — causa raíz: el servicio espera a que Gmail renderice ════ */
  console.log('── v3.2.11: el servicio ya no se adelanta a Gmail ──');
  T('servicio: _buscar sin espera fija de 2,5 s — espera hasta 12 s a que haya filas o aviso de vacío', svcjs.includes('while (Date.now() - t0 < 12000)') && svcjs.includes('waitForTimeout(400)') && !svcjs.includes('waitForTimeout(2500)') && /tr\.zA, \[role="row"\]'\)\.length > 0/.test(svcjs), true);
  T('servicio: mientras espera resultados comprueba si Gmail pide sesión (cada 400 ms)', /while \(Date\.now\(\) - t0 < 12000\)\s*\{\s*\n\s*await this\.page\.waitForTimeout\(400\);\s*\n\s*await this\._esperarLogin\(\);/.test(svcjs), true);
  T('servicio: aviso de «sin resultados» unificado (ES y EN, también «no se encontraron mensajes»)', (svcjs.match(/no se encontraron coincidencias\|no se encontraron mensajes\|no matches found/g) || []).length, 2);
  T('servicio: _extraerHora reintenta hasta 8 s con _extraerHoraUna (antes una sola lectura)', svcjs.includes('async _extraerHoraUna()') && svcjs.includes('while (Date.now() - t0 < 8000)') && /throw new HoraNoExtraidaError\(\);/.test(svcjs), true);
  T('renderer: «HoraNoExtraida» ya no es silencio — marca sesión, agenda re-búsqueda y avisa', html.includes("tipo==='HoraNoExtraidaError'){gmailLoginBtnOcultar();_gmailAsistidaSesionOk=true;gmailHoraReintentoAgendar();if(!reintento)toast('📧 El correo está, pero la hora no se pudo leer todavía — se reintentará solo','warn',9000);return;}"), true);
  T('renderer: bandera _gmailAsistidaSesionOk — marcada cuando Gmail respondió, limpia si la sesión falla', (function () { var i = html.indexOf('async function gmailHoraArchivo'); var s = html.slice(i, i + 6400); return /tipo==='ArchivoNoEncontradoError'\)\{gmailLoginBtnOcultar\(\);_gmailAsistidaSesionOk=true;/.test(s) && /tipo==='LoginCancelado'\)\{\s*_gmailAsistidaSesionOk=false;/.test(s) && /tipo==='SesionNoTransferida'\)\{\s*_gmailAsistidaSesionOk=false;/.test(s) && /gmailLoginBtnOcultar\(\);\s*\/\/ la sesión quedó funcionando\s*\n\s*_gmailAsistidaSesionOk=true;/.test(s); })(), true);

  console.log('── v3.2.11: la ronda de re-búsqueda también usa la vía asistida (código real) ──');
  _gmailAsistidaSesionOk = true;
  gmailHoraPuede = function () { return true; };
  var CAPT_ASIST = null;
  gmailHoraArchivo = async function (m, r) { CAPT_ASIST = [m, r]; };
  RETRY = [];
  await CB();
  T('con sesión asistida válida: la ronda llama a gmailHoraArchivo(false,true) tras probar la API', RETRY.length === 1 && CAPT_ASIST && CAPT_ASIST[0] === false && CAPT_ASIST[1] === true, true);
  global.setTimeout = _st; global.clearTimeout = _ct;

  /* ════ v3.2.12 — restauración sin duplicados ni regresiones ════ */
  console.log('── v3.2.12: restauración limpia, sin duplicados ──');
  T('cada elemento del panel aparece EXACTAMENTE una vez (sin IDs duplicados)', ['id="gmailDot"', 'id="gmailState"', 'id="gmailConnectBtn"', 'id="gmailList"'].every(function (x) { return html.split(x).length - 1 === 1; }), true);
  T('la caja del código OAuth NO se duplicó: sigue única y junto al botón de login, no en el panel', (function () { var n = html.split('id="gmailManualBox"').length - 1; var pi = html.indexOf('id="gmailConnectBtn"'); var pf = html.indexOf('id="gmailList"'); var dentro = html.slice(pi, pf).includes('gmailManualBox'); return n === 1 && !dentro && html.indexOf('id="gmailLoginBtn"') < html.indexOf('id="gmailManualBox"'); })(), true);
  T('las funciones del panel siguen enganchadas por onclick (gmailConnect/gmailDisconnect/gmailBarrer)', html.includes('onclick="gmailConnect()"') && html.includes('onclick="gmailDisconnect()"') && html.includes('onclick="gmailBarrer(true)"'), true);
  T('gmailRenderState reactiva los tres elementos del panel (dot, estado y texto del botón)', (function () { var i = html.indexOf('function gmailRenderState'); var s = html.slice(i, i + 400); return s.includes("getElementById('gmailDot')") && s.includes("getElementById('gmailState')") && s.includes("getElementById('gmailConnectBtn')"); })(), true);
  T('al conectar desde el panel («Conectar Gmail») la hora del archivo cargado se rebusca sola', (function () { var i = html.indexOf('async function gmailConnect'); var s = html.slice(i, i + 2200); return /gmailRefreshState\(\);try\{gmailHoraAuto\(\);\}catch\(e\)\{\}/.test(s); })(), true);

  /* ════ v3.2.13 — navegador garantizado para la búsqueda ════ */
  console.log('── v3.2.13: el navegador siempre disponible ──');
  T('iniciar(): cadena de 4 intentos — ruta manual, Chrome del sistema, Edge del sistema y Chromium empaquetado', (function () { var i = svcjs.indexOf('async iniciar()'); var s = svcjs.slice(i, i + 2600); return s.includes("process.env.PDFPRO_GMAIL_CHROMIUM") && s.includes("channel: 'chrome'") && s.includes("channel: 'msedge'") && /Chromium empaquetado de Playwright/.test(s); })(), true);
  T('iniciar(): cada intento fallido se informa (onProgress «Navegador no disponible: …») y se prueba el siguiente', svcjs.includes("Navegador no disponible: ' + intento.etiqueta"), true);
  T('iniciar(): si TODOS fallan, error descriptivo «Ningún navegador disponible» (nada se traga)', svcjs.includes('Ningún navegador disponible para buscar en Gmail'), true);
  T('main: iniciar() fallido → {tipo:\'NavegadorFalta\'} con la causa real (antes se tragaba como «aviso»)', mainjs.includes("tipo: 'NavegadorFalta'") && !mainjs.includes('aviso al iniciar navegador'), true);
  T('renderer: rama NavegadorFalta — aviso con la causa y alternativa «Conectar Gmail» sin navegador', (function () { var i = html.indexOf("r.tipo==='NavegadorFalta'"); var s = html.slice(i, i + 400); return i >= 0 && s.includes('Conectar Gmail') && s.includes('sin navegador'); })(), true);

  /* ════ v3.2.14 — ORDEN DEL USUARIO: recorrido de la bandeja ════ */
  console.log('── v3.2.14: del último correo recibido hacia atrás, primer match = hora ──');
  T('gmailNombreBase: extensión, «(n)» de duplicados, mayúsculas y signos no importan', gmailNombreBase('PV CIX (1).pdf') === gmailNombreBase('pv cix.pdf') && gmailNombreBase('ATC JAP 7163.PDF') === gmailNombreBase('atc jap 7163'), true);
  T('gmailNombreBase estricto: nombres distintos NO hacen match', gmailNombreBase('A.pdf') === gmailNombreBase('B.pdf'), false);

  function mkMsg(id, ms, adj) {
    return { id: id, threadId: 't' + id, internalDate: String(ms), payload: { headers: [{ name: 'From', value: 'CORPAC <ais@corpac.gob.pe>' }, { name: 'Subject', value: 'FPL' }], parts: adj.map(function (a) { return { filename: a }; }) } };
  }
  var FETCH_URLS = [], DETALLES = [];
  gmailWebFetch = async function (url) {
    FETCH_URLS.push(url);
    if (url.indexOf('/messages?maxResults=') >= 0) return { messages: [{ id: 'nuevo' }, { id: 'medio' }, { id: 'viejo' }] };
    var id = url.match(/\/messages\/([^?]+)/)[1];
    DETALLES.push(id);
    if (id === 'nuevo') return mkMsg('nuevo', 3000, ['OTRO.pdf']);
    if (id === 'medio') return mkMsg('medio', 2000, ['PV CIX LIM        2226.pdf']);
    return mkMsg('viejo', 1000, ['X.pdf']);
  };
  var ord = await gmailWebBarridoOrdenadoReal('PV CIX LIM 2226.pdf', 50);
  T('recorrido ordenado: salta el más nuevo sin match y acierta con el siguiente', ord && ord.id === 'medio' && ord.recibidoMs === 2000, true);
  T('…corta en el acierto: no descarga los detalles restantes', DETALLES.join(','), 'nuevo,medio');
  T('…la lista consultada es la bandeja de recibidos con adjunto (in:inbox has:attachment)', FETCH_URLS[0].indexOf(encodeURIComponent('in:inbox has:attachment')) >= 0, true);
  FETCH_URLS = []; DETALLES = [];
  var ordNull = await gmailWebBarridoOrdenadoReal('INEXISTENTE.pdf', 50);
  T('sin match en la bandeja → null (cae al respaldo filename: tras agotar los correos)', ordNull === null && DETALLES.length === 3, true);
  FETCH_URLS = [];
  var ordVacio = await gmailWebBarridoOrdenadoReal('', 50);
  T('nombre vacío → null sin consultar la API', ordVacio === null && FETCH_URLS.length === 0, true);

  CAPT = null; LLAMADAS = [];
  campos.selloRxTime = { value: '' };
  gmailAplicarHora = function (ms, origen, gl) { CAPT = { ms: ms, origen: origen, gl: gl }; }; // re-stub: una prueba posterior restauró la real
  (0, eval)(extraerFn('gmailHoraApiPorArchivo', true).replace('function gmailHoraApiPorArchivo(', 'function gmailHoraApiPorArchivoReal('));
  gmailHoraApiPorArchivo = gmailHoraApiPorArchivoReal; // una prueba v3.2.10 stubbeó la función; se restaura la REAL del html
  gmailIsDesktop = function () { return false; };
  gmailWebTokens = function () { return { access_token: 'tok' }; };
  gmailWebBarridoOrdenado = async function () { LLAMADAS.push('ordenado'); return { recibidoMs: HITMS + 2, de: 'CORPAC <ais@corpac.gob.pe>', adjuntos: ['PV CIX LIM 2226.pdf'] }; };
  gmailWebBarrido = async function (q) { LLAMADAS.push(q); return []; };
  var rOrden = await gmailHoraApiPorArchivo('PV CIX LIM 2226.pdf');
  T('web: el RECORRIDO ORDENADO va primero y aplica su hora (filename: queda de respaldo)', rOrden === true && CAPT && CAPT.ms === HITMS + 2 && LLAMADAS.length === 1 && LLAMADAS[0] === 'ordenado', true);
  T('…y el origen menciona el remitente y el adjunto que hizo match', CAPT && /CORPAC/.test(CAPT.origen) && /PV CIX LIM 2226\.pdf/.test(CAPT.origen), true);

  CAPT = null; LLAMADAS = [];
  gmailIsDesktop = function () { return true; };
  window.pdfproDesktop = { gmailBuscarPorAdjunto: async function (a, max) { LLAMADAS.push('ordenado:' + a + ':' + max); return { ok: true, mensaje: { recibidoMs: HITMS + 3, de: 'StarPerú', adjuntos: ['PV CIX LIM 2226.pdf'] } }; }, gmailBarrer: async function (q) { LLAMADAS.push(q); return { ok: true, mensajes: [] }; } };
  var rDeskOrden = await gmailHoraApiPorArchivo('PV CIX LIM 2226.pdf');
  T('escritorio: recorre la bandeja por IPC (gmailBuscarPorAdjunto, 50) y aplica su hora', rDeskOrden === true && CAPT && CAPT.ms === HITMS + 3 && LLAMADAS.length === 1 && LLAMADAS[0] === 'ordenado:PV CIX LIM 2226.pdf:50', true);

  T('servicio: _recorrerBandeja recorre in:inbox has:attachment del más nuevo al más viejo', (function () { var i = svcjs.indexOf('async _recorrerBandeja'); var s = svcjs.slice(i, i + 2200); return i >= 0 && s.includes("'in:inbox has:attachment'") && s.includes('filas[idx].click()'); })(), true);
  T('servicio: el límite del recorrido es 40 correos (después cae al respaldo filename:)', svcjs.includes('_recorrerBandeja(archivo, 40)'), true);
  T('servicio: la comparación es la compartida adjuntoCoincide (extensión/«(n)»/signos no importan)', /async _recorrerBandeja\(archivo, limite[\s\S]{0,1400}adjuntoCoincide\(archivo, adjuntos\)/.test(svcjs), true);
  T('servicio: el recorrido se hace ANTES de la búsqueda filename: (el orden del usuario)', svcjs.indexOf('_recorrerBandeja(archivo, 40)') < svcjs.indexOf('filename:"${base}"'), true);
  T('servicio: _resultadoDeCorreoAbierto es el final común de las dos vías (2 llamadas)', (svcjs.match(/return this\._resultadoDeCorreoAbierto\(archivo, copiar\);/g) || []).length, 2);
  T('servicio: _adjuntosAbiertos lee los chips de adjunto span.aV3 y .brc[title]', svcjs.includes("querySelectorAll('span.aV3')") && svcjs.includes("querySelectorAll('.brc[title]')"), true);
  T('servicio: _esperarAdjuntos evita saltar un correo cuyo adjunto aún renderiza', /async _esperarAdjuntos\(/.test(svcjs), true);

  T('hora.js: nombreComparable — espacios múltiples, extensión y «(n)» no importan', HORA.nombreComparable('PV CIX LIM        2226.pdf') === HORA.nombreComparable('pv cix lim 2226') && HORA.nombreComparable('X (1).pdf') === HORA.nombreComparable('x'), true);
  T('hora.js: adjuntoCoincide — acierta con el duplicado «(2)» y rechaza nombres distintos', HORA.adjuntoCoincide('A.pdf', ['B.pdf', 'A (2).pdf']) === true && HORA.adjuntoCoincide('A.pdf', ['B.pdf']) === false, true);
  T('gmail-monitor: pollOrdenado recorre la bandeja y corta en el primer acierto', monjs.includes('async function pollOrdenado') && monjs.includes("'in:inbox has:attachment'") && /for \(const m of msgs\)[\s\S]{0,500}nombreComparable\(a\) === objetivo[\s\S]{0,300}return d;/.test(monjs), true);
  T('main: IPC gmail:buscar-por-adjunto → pollOrdenado (el orden del usuario por API)', mainjs.includes("'gmail:buscar-por-adjunto'") && mainjs.includes('gmail.pollOrdenado('), true);
  T('preload: bridge gmailBuscarPorAdjunto', preloadjs.includes('gmailBuscarPorAdjunto'), true);

  /* ════ v3.2.15 — fin del aviso en bucle del inicio de sesión ════ */
  console.log('── v3.2.15: el aviso «No se completó el inicio de sesión» deja de salir en bucle ──');
  T('main: abrirLoginGmailEnApp resuelve { cookies, motivo } — el porqué del fallo viaja', mainjs.includes("salir({ cookies: null, motivo: motivo || 'ventana cerrada' })") && mainjs.includes("salir({ cookies, motivo: '' })"), true);
  T('main: el motivo llega al aviso («ventana cerrada», «tiempo agotado»…)', /No se completó el inicio de sesión en Gmail \(' \+ \(\(login && login\.motivo\)/.test(mainjs), true);
  T('main: candado por sesión — el automático NO reabre la ventana tras un cancel', /if \(!manual && _gmailHoraLoginCancelado\) \{[\s\S]{0,500}tipo: 'LoginCancelado'/.test(mainjs), true);
  T('main: el candado se activa al cancelar y se limpia al completar el login', /_gmailHoraLoginCancelado = true;[\s\S]{0,400}\/\/ el login sí se completó/.test(mainjs) && /_gmailHoraLoginCancelado = false;\s+\/\/ el login sí se completó/.test(mainjs), true);
  T('main: ventana de login alwaysOnTop (no puede quedar escondida tras otras ventanas)', /alwaysOnTop: true/.test(mainjs), true);
  T('renderer: OAuth conectado → NO se abre la ventana del buscador (la API es la vía autorizada)', (function () { var i = html.indexOf('async function gmailHoraArchivo'); var s = html.slice(i, i + 6000); return /if\(!manual&&gmailIsDesktop\(\)\)\{[\s\S]{0,500}gmailEstado\(\)[\s\S]{0,400}_oauthOk[\s\S]{0,800}gmailHoraReintentoAgendar\(\);[\s\S]{0,300}return;/.test(s); })(), true);
  T('renderer: …y con OAuth el aviso es el mismo «aún no llega el correo» con re-búsqueda', (function () { var i = html.indexOf('async function gmailHoraArchivo'); var s = html.slice(i, i + 6000); return /_oauthOk\)\{[\s\S]{0,300}gmailHoraReintentoAgendar\(\);[\s\S]{0,200}Todavía no llega el correo/.test(s); })(), true);
  T('renderer: el aviso de login cancelado sale UNA vez por sesión (_gmailLoginCancelToast)', /_gmailLoginCancelToast=false/.test(html) && /if\(!_gmailLoginCancelToast\)\{\s*_gmailLoginCancelToast=true;/.test(html), true);
  T('renderer: el aviso muestra el motivo real (r.error) y el botón «🔗» para reintentar', /toast\('🔐 '\+\(\(r&&r\.error\)\|\|'No se completó el inicio de sesión en Gmail'\)\+' — pulsa «🔗 Iniciar sesión en Gmail»/.test(html), true);
  T('renderer: la rama LoginCancelado conserva bandera + botón (regresión v3.2.3)', /tipo==='LoginCancelado'\)\{\s*_gmailAsistidaSesionOk=false;\s*gmailLoginBtnMostrar\(\);/.test(html), true);

  /* ════ v3.2.16 — match con archivos «(1) (1)» (varios «(n)» de duplicado) ════ */
  console.log('── v3.2.16: el match soporta UNO o VARIOS «(n)» de duplicado ──');
  T('hora.js: nombreComparable quita TODOS los «(n)» finales — caso real «ATC CM468 11NOV (1) (1).pdf»', HORA.nombreComparable('ATC CM468 11NOV (1) (1).pdf') === HORA.nombreComparable('ATC CM468 11NOV.pdf') && HORA.nombreComparable('ATC CM468 11NOV (1) (1).pdf') === 'atccm46811nov', true);
  T('hora.js: …también contra el adjunto renombrado por Gmail «(1).pdf» y con un solo «(n)»', HORA.nombreComparable('ATC CM468 11NOV (1) (1).pdf') === HORA.nombreComparable('ATC CM468 11NOV (1).pdf') && HORA.nombreComparable('X (1).pdf') === HORA.nombreComparable('x'), true);
  T('hora.js: adjuntoCoincide acierta con el archivo descargado dos veces', HORA.adjuntoCoincide('ATC CM468 11NOV (1) (1).pdf', ['OTRO.doc', 'ATC CM468 11NOV.pdf']) === true && HORA.adjuntoCoincide('ATC CM468 11NOV (1) (1).pdf', ['OTRO.doc']) === false, true);
  T('hora.js y renderer: nombreComparable y gmailNombreBase dan el MISMO resultado (regla compartida entre vías)', HORA.nombreComparable('ATC CM468 11NOV (1) (1).pdf') === gmailNombreBase('ATC CM468 11NOV (1) (1).pdf') && HORA.nombreComparable('PV CIX LIM        2226.pdf') === gmailNombreBase('PV CIX LIM        2226.pdf'), true);
  T('renderer: gmailNombreBase (API web) — misma regla multi-«(n)»', gmailNombreBase('ATC CM468 11NOV (1) (1).pdf') === gmailNombreBase('ATC CM468 11NOV.pdf') && gmailNombreBase('ATC CM468 11NOV (1) (1).pdf') === 'atccm46811nov', true);
  FETCH_URLS = []; DETALLES = [];
  gmailWebFetch = async function (url) {
    if (url.indexOf('/messages?maxResults=') >= 0) return { messages: [{ id: 'ultimo' }, { id: 'previo' }] };
    var id = url.match(/\/messages\/([^?]+)/)[1];
    DETALLES.push(id);
    return id === 'ultimo' ? mkMsg('ultimo', 5000, ['ATC CM468 11NOV.pdf']) : mkMsg('previo', 4000, ['OTRO.pdf']);
  };
  var ordDoble = await gmailWebBarridoOrdenadoReal('ATC CM468 11NOV (1) (1).pdf', 50);
  T('recorrido web ordenado: acierta con el archivo descargado dos veces (doble «(n)»)', ordDoble && ordDoble.id === 'ultimo' && ordDoble.recibidoMs === 5000 && DETALLES.length === 1, true);
  T('servicio: la búsqueda filename: reintenta con la base SIN «(n)» (entre colapsada y texto libre)', /filename:"\$\{colapsada\}"[\s\S]{0,600}sinMarcas[\s\S]{0,400}filename:"\$\{sinMarcas\}"[\s\S]{0,900}probando texto libre/.test(svcjs), true);
  T('servicio: el texto libre busca y abre con el nombre SIN «(n)»', svcjs.includes("await this._buscar((sinMarcas ? sinMarcas.replace(/\\s+/g, ' ').trim() : colapsada) || base)") && svcjs.includes("modo === 'texto' ? (sinMarcas || base) : base"), true);
  T('hora.js: el año por defecto es el de la ZONA de la cuenta (Lima), no el de UTC', fs.readFileSync(path.join(__dirname, '..', 'src', 'gmail-hora', 'hora.js'), 'utf8').includes('if (anio == null) anio = ahoraZona(off).anio;') && HORA.parseHoraGmail('31 dic, 8:00 p. m.') !== null, true);

  console.log('\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));
  process.exit(mal ? 1 : 0);
})().catch(function (e) { console.log('✗ ERROR ASÍNCRONO: ' + e.message); process.exit(1); });
