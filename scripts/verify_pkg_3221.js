// Verificación del paquete v3.2.21: el guard del OAuth sin credenciales
// (botón «Conectar Gmail»), el título con versión y el log de la previa
// deben estar dentro del binario que se instala.
const asar = require('@electron/asar');

const A = 'dist/win-unpacked/resources/app.asar';
const html = asar.extractFile(A, 'src/app/index.html').toString();
const mainjs = asar.extractFile(A, 'src/main.js').toString();
const svc = asar.extractFile(A, 'src/gmail-hora/GmailHoraService.js').toString();

const checks = [
  ['banner v3.2.21', html.includes('CORPAC AIS/ARO Platform v3.2.21')],
  ['main (paquete): gmail:conectar rechaza sin credenciales (client_id vacío) sin abrir nada',
    /gmail:conectar', async \(\) => \{[\s\S]{0,900}if \(!gmail\.CLIENT_ID \|\| !gmail\.CLIENT_SECRET\)[\s\S]{0,200}return \{ error: 'sin-credenciales' \};/.test(mainjs)],
  ['html (paquete): aviso honesto del botón — la hora no necesita OAuth',
    html.includes("r.error==='sin-credenciales'") && html.includes('no hacen falta para la hora')],
  ['html (paquete): NavegadorFalta pide Chrome/Edge (ya no el OAuth roto)',
    html.includes('instala Google Chrome o Microsoft Edge y vuelve a cargar el PDF')],
  ['main (paquete): título de la ventana de progreso con la versión',
    mainjs.includes("'PDFPro — Progreso Gmail (v' + app.getVersion() + ')'")],
  ['main (paquete): la comprobación previa SIEMPRE queda al log',
    mainjs.includes("gmailHoraLog('previa: ' + (previas ? previas.length + ' cookies de google.com — sesión válida en el almacén de login' : 'sin sesión de google.com en el almacén de login'))")],
  ['main (paquete): v3.2.20 intacto (sesión previa antes del candado y de la ventana)',
    /const previas = await _gmailHoraSesionYaValida\(\);[\s\S]{0,2400}if \(!manual && _gmailHoraLoginCancelado\)/.test(mainjs) && mainjs.includes('La sesión de Gmail ya estaba activa — se transfiere (${previas.length} cookies) sin abrir la ventana…')],
  ['main+service (paquete): v3.2.18-19 intactos (guardia 7 min, anomalía <5 s, guía 🔗)',
    mainjs.includes('Promise.race([nucleo, guardia])') && mainjs.includes('const anomal = edad < 5;') && mainjs.includes('Cuando pueda, pulse «🔗 Iniciar sesión en Gmail»') && svc.includes('Bandeja: ${n} correo(s) traídos por la consulta.')]
];

let ok = 0;
for (const [n, v] of checks) { console.log((v ? '✓' : '✗ FALLO') + ' ' + n); if (v) ok++; }
console.log(ok + '/' + checks.length + ' verificaciones del paquete v3.2.21');
process.exit(ok === checks.length ? 0 : 1);
