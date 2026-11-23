// Verificación del paquete v3.2.19: el blindaje del login (instrumentación
// del cierre, reintento anómalo, candado solo real, loadURL con reintento,
// motivos honestos) debe estar dentro del binario que se instala.
const asar = require('@electron/asar');

const A = 'dist/win-unpacked/resources/app.asar';
const html = asar.extractFile(A, 'src/app/index.html').toString();
const mainjs = asar.extractFile(A, 'src/main.js').toString();
const svc = asar.extractFile(A, 'src/gmail-hora/GmailHoraService.js').toString();
const pre = asar.extractFile(A, 'src/preload-progreso.js').toString();
const files = asar.listPackage(A).map((f) => String(f).replace(/^\/+/, ''));

const checks = [
  ['banner v3.2.19', html.includes('CORPAC AIS/ARO Platform v3.2.19')],
  ['ventana de progreso empaquetada (v3.2.17-18 intacto)',
    files.includes('src/progreso.html') && files.includes('src/preload-progreso.js') &&
    pre.includes("contextBridge.exposeInMainWorld('pdfproProgreso'")],
  ['main (paquete): cierre de login instrumentado (edad + visible + CIERRE ANÓMALO)',
    mainjs.includes('login: ventana cerrada a los ${') && mainjs.includes('CIERRE ANÓMALO')],
  ['main (paquete): reintento ante cierre anómalo y candado SOLO con cancelación real',
    mainjs.includes('login.anomalia && intento === 1') && /if \(!\(login && login\.anomalia\)\) \{\s*\n\s*_gmailHoraLoginCancelado = true;/.test(mainjs)],
  ['main (paquete): render-process-gone + loadURL con reintento',
    mainjs.includes("on('render-process-gone'") && mainjs.includes('cargar(2);')],
  ['main (paquete): motivos honestos + guía con el botón 🔗',
    mainjs.includes("'sesión ok'") && mainjs.includes('Cuando pueda, pulse «🔗 Iniciar sesión en Gmail»')],
  ['main (paquete): guardia 7 min v3.2.18 intacta',
    mainjs.includes('Promise.race([nucleo, guardia])') && mainjs.includes("'GmailHoraTimeout'")],
  ['v3.2.16-18 intacto: regex multi-«(n)» + «Bandeja: N correo(s)» + dedupe',
    svc.includes('(?:\\s*\\(\\d+\\))+\\s*$') && svc.includes('Bandeja: ${n} correo(s) traídos por la consulta.')]
];

let ok = 0;
for (const [n, v] of checks) { console.log((v ? '✓' : '✗ FALLO') + ' ' + n); if (v) ok++; }
console.log(ok + '/' + checks.length + ' verificaciones del paquete v3.2.19');
process.exit(ok === checks.length ? 0 : 1);
