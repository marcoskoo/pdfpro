// Verificación del paquete v3.2.16 (dist/win-unpacked/resources/app.asar):
// el match multi-«(n)» debe estar FUNCIONANDO dentro del binario que se instala.
const asar = require('@electron/asar');
const fs = require('fs');
const path = require('path');
const os = require('os');

const A = 'dist/win-unpacked/resources/app.asar';
const html = asar.extractFile(A, 'src/app/index.html').toString();
const horaSrc = asar.extractFile(A, 'src/gmail-hora/hora.js').toString();
const svc = asar.extractFile(A, 'src/gmail-hora/GmailHoraService.js').toString();
const mainjs = asar.extractFile(A, 'src/main.js').toString();

// extraer hora.js a un tmp y EJECUTARLO (prueba funcional de verdad)
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pdfpro3216-'));
fs.writeFileSync(path.join(tmp, 'hora.js'), horaSrc);
const HORA = require(path.join(tmp, 'hora.js'));

// gmailNombreBase del renderer: evaluar la línea real extraída del html
const mLinea = html.match(/function gmailNombreBase\(s\)\{[^\n]*\}/);
let gmailNombreBase = null;
if (mLinea) eval(mLinea[0].replace('function gmailNombreBase(', 'gmailNombreBase = function ('));

const checks = [
  ['banner v3.2.16', html.includes('CORPAC AIS/ARO Platform v3.2.16')],
  ['hora.js (del paquete): «ATC CM468 11NOV (1) (1).pdf» == «ATC CM468 11NOV.pdf»',
    HORA.nombreComparable('ATC CM468 11NOV (1) (1).pdf') === HORA.nombreComparable('ATC CM468 11NOV.pdf')
    && HORA.nombreComparable('ATC CM468 11NOV (1) (1).pdf') === 'atccm46811nov'],
  ['hora.js (del paquete): adjuntoCoincide con doble «(n)»',
    HORA.adjuntoCoincide('ATC CM468 11NOV (1) (1).pdf', ['OTRO.doc', 'ATC CM468 11NOV.pdf']) === true],
  ['hora.js (del paquete): año por defecto de la zona Lima',
    horaSrc.includes('if (anio == null) anio = ahoraZona(off).anio;') && HORA.parseHoraGmail('31 dic, 8:00 p. m.') !== null],
  ['servicio (del paquete): reintento filename: con la base sin «(n)»',
    svc.includes('sinMarcas') && svc.includes('filename:"${sinMarcas}"')],
  ['servicio (del paquete): texto libre con la base sin «(n)»',
    svc.includes('sinMarcas ? sinMarcas.replace') && svc.includes("modo === 'texto' ? (sinMarcas || base) : base")],
  ['renderer (del paquete): gmailNombreBase multi-«(n)»',
    !!gmailNombreBase && gmailNombreBase('ATC CM468 11NOV (1) (1).pdf') === 'atccm46811nov'
    && gmailNombreBase('ATC CM468 11NOV (1) (1).pdf') === gmailNombreBase('ATC CM468 11NOV.pdf')],
  ['v3.2.14 intacto: recorrido ordenado antes de filename:', html.includes('gmailWebBarridoOrdenado(nombre,50)') && svc.includes('in:inbox has:attachment')],
  ['v3.2.15 intacto: candado de sesión (main) + toast único (renderer)', mainjs.includes('_gmailHoraLoginCancelado') && html.includes('_gmailLoginCancelToast')]
];

let ok = 0;
for (const [n, v] of checks) { console.log((v ? '✓' : '✗ FALLO') + ' ' + n); if (v) ok++; }
console.log(ok + '/' + checks.length + ' verificaciones del paquete v3.2.16');
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(ok === checks.length ? 0 : 1);
