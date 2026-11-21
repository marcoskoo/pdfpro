/* Debug del caso SRU 2226 — reproduce el entorno de la suite y ejecuta
   fplExtraerCampos paso a paso sobre el fixture del reporte real. */
const fs = require('fs'), path = require('path');
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

const src = [
  extraerVar('MATRICULA_BLACKLIST'),
  extraerVar('_FPL_PALABRA'), extraerVar('_FPL_DESIGNADOR'),
  extraerFn('_deSpaceIcao'), extraerFn('_esMatriculaValida'), extraerFn('_fixOcrLetters'),
  extraerFn('_fplCompacta'), extraerFn('_fplSinAcentos'), extraerFn('_fplEsMatricula'),
  extraerFn('_fplLimpiaIdent'),
  extraerFn('inicialesDeNombre'), extraerFn('inicialesDeNombreSmart'), extraerFn('normIni'),
  extraerFn('normOprInitials'), extraerFn('fplInicialesOperador'),
  extraerFn('fplMatricula'), extraerFn('fplMatriculaChanged'),
  extraerFn('fplComponerRegistro'), extraerFn('_fplSetMatricula'),
  extraerFn('fplNombreRegistro'), extraerFn('extraerMatricula'),
  extraerFn('fplExtraerCampos')
].join('\n');
(0, eval)(src);

const FIX = 'PV CIX LIM 2226\nAERONAVE SRU2226 B733\nAERODROMO DE SALIDA SPJC 0145';
var tc = _fplCompacta(_fplSinAcentos(FIX).toUpperCase());
console.log('— texto compactado:');
console.log(tc);

/* el regex del respaldo 3b tal como lo construye fplExtraerCampos */
var reDes = new RegExp('\\b(' + _FPL_DESIGNADOR.source.replace(/^\^/, '').replace(/\$$/, '') + ')([0-9]{3,4}[A-Z]?)\\b');
console.log('— regex 3b:', reDes.source.slice(0, 120) + '…');
console.log('— match 3b:', JSON.stringify(tc.match(reDes)));

var r = fplExtraerCampos(FIX, null, '');
console.log('— fplExtraerCampos →', JSON.stringify(r));
console.log('— _fplLimpiaIdent("SRU2226") →', JSON.stringify(_fplLimpiaIdent('SRU2226', {})));
console.log('— fplComponerRegistro →', JSON.stringify(fplComponerRegistro(r)));
