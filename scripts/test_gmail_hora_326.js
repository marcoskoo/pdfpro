/* Pruebas v3.2.6 — la hora de recepción del correo se busca A PARTIR
   DEL ARCHIVO CARGADO por la API de Gmail (OAuth), en web y escritorio:
   consulta dirigida filename:"nombre" (→ sin extensión → texto libre),
   solo se acepta un correo cuyo ADJUNTO coincida con el archivo y no se
   pisa una hora escrita a mano. gmailHoraAuto ya no exige escritorio y
   la vía Playwright queda de respaldo. Además se quitaron los 4 textos
   de ayuda de la ficha del sello. Incluye la regresión completa v3.2.5
   (212 pruebas, 3 expectativas actualizadas). Ejecuta el CÓDIGO REAL de
   web/index.html, src/gmail-hora/ y src/main.js.
   Ejecutar: node scripts/test_gmail_hora_326.js */
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
  extraerFn('gmailBuscarHitPorAdjunto'), extraerFn('gmailHoraApiPorArchivo', true)
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
T('banner v3.2.6', /CORPAC AIS\/ARO Platform v3\.2\.6/.test(html), true);
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
T('v3.2.3: manual=true salta el cooldown de 30 s tras login cancelado', /if \(!manual && Date\.now\(\) - _gmailHoraUltimoFalloLogin < 30000\)/.test(mainjs), true);
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
T('main.js: tipo LoginCancelado + cooldown 30 s', /tipo: 'LoginCancelado'/.test(mainjs) && /_gmailHoraUltimoFalloLogin < 30000/.test(mainjs), true);
T('main.js: la ventana de login se cierra sola al cosechar', /ventana ya cumplió su misión: se cierra sola/.test(mainjs), true);
T('main.js: la URL del navegador se anota en cada ronda', /_gmailHoraSvc\.urlActual\(\)/.test(mainjs), true);

console.log('── v3.1.9: UI — panel Gmail + enganches tras carga ──');
T('botón «🕐 Hora del correo» ELIMINADO (v3.2.0)', /gmailHoraArchivo\(false\)/.test(html) || /id="gmailHoraBox"/.test(html) || /Hora del correo del archivo cargado<\/button>/.test(html), false);
T('toggle «Automático al cargar» ELIMINADO', /id="gmailHoraAuto"/.test(html) || /pdfpro_gmail_hora_auto/.test(html), false);
T('gmailHoraArchivo acepta manual; el enganche automático la llama sin argumentos', /async function gmailHoraArchivo\(manual\)\{/.test(html) && /setTimeout\(gmailHoraArchivo,1500\)/.test(html), true);
T('silencio SOLO si no hay correo con ese archivo (la sesión funcionó)', /tipo==='ArchivoNoEncontradoError'\)\{gmailLoginBtnOcultar\(\);return;\}/.test(html), true);
T('silencio también si el correo no muestra hora (la sesión funcionó)', /tipo==='HoraNoExtraidaError'\)\{gmailLoginBtnOcultar\(\);return;\}/.test(html), true);
T('login cancelado se AVISA y muestra el botón de reintento', /tipo==='LoginCancelado'\)\{\s*gmailLoginBtnMostrar\(\);/.test(html), true);
T('sesión no transferida se AVISA y muestra el botón de reintento', /tipo==='SesionNoTransferida'\)\{\s*gmailLoginBtnMostrar\(\);/.test(html), true);
T('aviso de sesión indica enviar gmail-hora.log', /%APPDATA%/.test(html) && /gmail-hora\.log/.test(html), true);
T('gmailAplicarHora llena los campos en UTC', /function gmailAplicarHora[\s\S]{0,420}getUTCHours/.test(html), true);
T('gmailUsarHora (ruta OAuth) delega en gmailAplicarHora (fix UTC)', /function gmailUsarHora[\s\S]{0,220}gmailAplicarHora/.test(html), true);
T('3 enganches gmailHoraAuto tras cargar documento', (html.match(/gmailHoraAuto\(\);?\}catch/g) || []).length, 3);
T('hora leída pero no interpretada → toast con texto crudo', /no interpretada: «'\+r\.horaRecepcion/.test(html), true);
T('v3.2.2: toast muestra la hora de Gmail y la conversión +5 h', /\(hora Lima\) \+5 h → UTC/.test(html), true);
T('v3.2.2: gmailAplicarHora recibe el texto crudo de Gmail', /gmailAplicarHora\(ms,origen,gmailLocal\)/.test(html), true);
T('v3.2.2: la búsqueda automática pasa r.horaRecepcion al aplicar', /Gmail'\),r\.horaRecepcion\)/.test(html), true);
T('v3.2.3: botón «Iniciar sesión en Gmail» junto a Hora Recepción (oculto por defecto)', /id="gmailLoginBtn" class="btn btn-ghost btn-sm btn-full" style="display:none;/.test(html), true);
T('v3.2.3: el botón lanza gmailLoginManual()', /onclick="gmailLoginManual\(\)"/.test(html), true);
T('v3.2.3: gmailLoginManual reintenta al momento (manual=true)', /function gmailLoginManual\(\)\{[^}]*gmailHoraArchivo\(true\)/.test(html), true);
T('v3.2.3: LoginCancelado MUESTRA el botón y lo dice en el toast', /if\(r\.tipo==='LoginCancelado'\)\{\s*gmailLoginBtnMostrar\(\);/.test(html) && /pulsa «🔗 Iniciar sesión en Gmail»/.test(html), true);
T('v3.2.3: SesionNoTransferida también muestra el botón', /if\(r\.tipo==='SesionNoTransferida'\)\{\s*gmailLoginBtnMostrar\(\);/.test(html), true);
T('v3.2.3: éxito de la búsqueda oculta el botón', /gmailLoginBtnOcultar\(\);\s*\/\/ la sesión quedó funcionando/.test(html), true);
T('v3.2.3: gmailHoraArchivo acepta manual y lo pasa al IPC', /async function gmailHoraArchivo\(manual\)/.test(html) && /gmailHoraBuscar\(nombre,!!manual\)/.test(html), true);
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
  T('gmailHoraArchivo prueba PRIMERO la API y luego la vía asistida', /if\(await gmailHoraApiPorArchivo\(nombre\)\)\{gmailLoginBtnOcultar\(\);return;\}[\s\S]*?if\(!gmailHoraPuede\(\)\)return;/.test(html), true);
  T('hook al cargar el documento intacto (loadPDF → gmailHoraAuto)', /try\{gmailHoraAuto\(\);\}catch\(e\)\{\}/.test(html), true);
  T('texto «Captura la hora de recepción…» retirado', html.includes('para vincularla al documento cargado y al sello'), false);
  T('texto «Recepción: vacío = fecha/hora actuales…» retirado', html.includes('vacío = fecha/hora actuales'), false);
  T('texto «2 letras: 1er nombre + 1er apellido…» retirado', html.includes('Se calculan solas al iniciar sesión'), false);
  T('texto «Al guardar o exportar…» retirado', html.includes('Al guardar o exportar, el archivo se nombra'), false);
  T('los campos siguen intactos: Fecha/Hora Recepción, Iniciales y Matrícula', !!(html.includes('id="selloRxDate"') && html.includes('id="selloRxTime"') && html.includes('id="selloTxInitials"') && html.includes('id="selloMatricula"')), true);
  T('botón de reintento «Iniciar sesión en Gmail» sigue disponible', html.includes('id="gmailLoginBtn"'), true);
  T('banner del pie: tipo S sin guion y ejemplo del usuario (OB2134 1120 MK)', html.includes('SRU2226 OB2176P MK') && html.includes('OB2134 1120 MK'), true);

  console.log('\n' + (mal ? '✗ ' + mal + ' PRUEBAS FALLARON (de ' + (ok + mal) + ')' : '✓ ' + ok + '/' + ok + ' PRUEBAS OK'));
  process.exit(mal ? 1 : 0);
})().catch(function (e) { console.log('✗ ERROR ASÍNCRONO: ' + e.message); process.exit(1); });
