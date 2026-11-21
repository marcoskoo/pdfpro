// Verificación del paquete v3.2.18: el PRELOAD CORREGIDO (contextBridge,
// la causa de la ventana vacía), el dedupe del renderer, las líneas nuevas
// del servicio y la guardia de 7 min deben estar dentro del binario.
const asar = require('@electron/asar');

const A = 'dist/win-unpacked/resources/app.asar';
const html = asar.extractFile(A, 'src/app/index.html').toString();
const mainjs = asar.extractFile(A, 'src/main.js').toString();
const svc = asar.extractFile(A, 'src/gmail-hora/GmailHoraService.js').toString();
const pre = asar.extractFile(A, 'src/preload-progreso.js').toString();
const prog = asar.extractFile(A, 'src/progreso.html').toString();
const files = asar.listPackage(A).map((f) => String(f).replace(/^\/+/, ''));

const checks = [
  ['banner v3.2.18', html.includes('CORPAC AIS/ARO Platform v3.2.18')],
  ['progreso.html + preload empaquetados', files.includes('src/progreso.html') && files.includes('src/preload-progreso.js')],
  ['preload (paquete): contextBridge.exposeInMainWorld — sin window.* directo',
    pre.includes("contextBridge.exposeInMainWorld('pdfproProgreso'") && !pre.includes('window.pdfproProgreso =')],
  ['progreso.html (paquete): dedupe — solo líneas nuevas + reset al recortar',
    prog.includes('lineas.slice(vistos)') && prog.includes('if (lineas.length < vistos)')],
  ['main (paquete): guardia 7 min (GmailHoraTimeout) + cierre de navegador/login',
    mainjs.includes('Promise.race([nucleo, guardia])') && mainjs.includes("'GmailHoraTimeout'") && /name === 'GmailHoraTimeout'[\s\S]{0,700}_gmailHoraLoginWin\.close\(\)/.test(mainjs)],
  ['service (paquete): «Bandeja: N correo(s)» + «12 s sin resultados ni aviso»',
    svc.includes('Bandeja: ${n} correo(s) traídos por la consulta.') && svc.includes('12 s sin resultados ni aviso de Gmail')],
  ['v3.2.17 intacto: ventana minimizable + showInactive + mensajes ✔/✖',
    mainjs.includes('minimizable: true') && mainjs.includes('showInactive()') && mainjs.includes('✔ Hora de recepción de «${nombre}»')],
  ['v3.2.16 intacto: regex multi-«(n)» + recorrido ordenado',
    svc.includes('(?:\\s*\\(\\d+\\))+\\s*$') && svc.includes('in:inbox has:attachment')]
];

let ok = 0;
for (const [n, v] of checks) { console.log((v ? '✓' : '✗ FALLO') + ' ' + n); if (v) ok++; }
console.log(ok + '/' + checks.length + ' verificaciones del paquete v3.2.18');
process.exit(ok === checks.length ? 0 : 1);
