// Verificación del paquete v3.2.17: la VENTANA DE PROGRESO debe estar
// empaquetada y cableada dentro del binario que se instala.
const asar = require('@electron/asar');

const A = 'dist/win-unpacked/resources/app.asar';
const html = asar.extractFile(A, 'src/app/index.html').toString();
const mainjs = asar.extractFile(A, 'src/main.js').toString();
const svc = asar.extractFile(A, 'src/gmail-hora/GmailHoraService.js').toString();
const files = asar.listPackage(A).map((f) => String(f).replace(/^\/+/, ''));

const checks = [
  ['banner v3.2.17', html.includes('CORPAC AIS/ARO Platform v3.2.17')],
  ['progreso.html empaquetado', files.includes('src/progreso.html')],
  ['preload-progreso.js empaquetado', files.includes('src/preload-progreso.js')],
  ['main (paquete): ventana minimizable + showInactive + historial 400',
    mainjs.includes('minimizable: true') && mainjs.includes('showInactive()') && mainjs.includes('_GMAIL_PROGRESO_MAX = 400')],
  ['main (paquete): se abre con cada búsqueda + mensajes ✔/✖',
    mainjs.includes('gmailProgresoAbrir(nombre);') && mainjs.includes('✔ Hora de recepción de «${nombre}»') && mainjs.includes('✖ No se pudo iniciar el navegador de búsqueda')],
  ['main (paquete): gmailHoraEvento alimenta la ventana', mainjs.includes('gmailProgresoLinea(msg, tipo);')],
  ['service (paquete): «Consultando Gmail: query»', svc.includes('Consultando Gmail: ${query}')],
  ['v3.2.16 intacto: regex multi-«(n)»', svc.includes('(?:\\s*\\(\\d+\\))+\\s*$')],
  ['v3.2.14 intacto: recorrido ordenado', svc.includes('in:inbox has:attachment') && svc.includes('_recorrerBandeja')]
];

let ok = 0;
for (const [n, v] of checks) { console.log((v ? '✓' : '✗ FALLO') + ' ' + n); if (v) ok++; }
console.log(ok + '/' + checks.length + ' verificaciones del paquete v3.2.17');
process.exit(ok === checks.length ? 0 : 1);
