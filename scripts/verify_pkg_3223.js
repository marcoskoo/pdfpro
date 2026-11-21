// Verificación del paquete v3.2.23: el login SIN marca de automatización
// (Google ya no deniega), el guardia de 20 min y la partición renovada
// deben estar dentro del binario que se instala.
const asar = require('@electron/asar');

const A = 'dist/win-unpacked/resources/app.asar';
const html = asar.extractFile(A, 'src/app/index.html').toString();
const mainjs = asar.extractFile(A, 'src/main.js').toString();
const svc = asar.extractFile(A, 'src/gmail-hora/GmailHoraService.js').toString();

const checks = [
  ['banner v3.2.23', html.includes('CORPAC AIS/ARO Platform v3.2.23')],
  ['service (paquete): loginVisible SIN marca de automatización (Google dejó de denegar el acceso)',
    svc.includes("ignoreDefaultArgs: ['--enable-automation']") && svc.includes('--disable-blink-features=AutomationControlled')],
  ['service (paquete): loginVisible con 10 min y sin diálogos de primera ejecución',
    /async loginVisible\(\{ minutos = 10 \} = \{\}\)/.test(svc) && svc.includes("'--no-first-run', '--no-default-browser-check'")],
  ['main (paquete): guardia global de 20 min (antes 7 cortaba el acceso humano)',
    mainjs.includes('20 * 60 * 1000') && mainjs.includes('excedió 20 minutos')],
  ['main (paquete): partición de login renovada (gmail-correo1, sin uso funcional de la vieja)',
    mainjs.split("'persist:gmail-correo1'").length - 1 >= 3 && mainjs.split("'persist:gmail-login'").length - 1 === 0],
  ['main (paquete): v3.2.22 intacto (loginVisible antes de la ventana de Electron, reinicio+reintento)',
    /const vis = await _gmailHoraSvc\.loginVisible\(\);[\s\S]{0,2000}abrirLoginGmailEnApp\(\)/.test(mainjs) && mainjs.includes('_gmailHoraLoginCancelado = false;   // v3.2.22')],
  ['main (paquete): v3.2.20-21 intactos (previa antes del candado, título con versión, guard OAuth)',
    /const previas = await _gmailHoraSesionYaValida\(\);[\s\S]{0,2400}if \(!manual && _gmailHoraLoginCancelado\)/.test(mainjs) && mainjs.includes("'PDFPro — Progreso Gmail (v' + app.getVersion() + ')'") && mainjs.includes("return { error: 'sin-credenciales' };")],
  ['service (paquete): v3.2.16-22 intactos (regex multi-«(n)», SID×2 confirmaciones, sin transferir cookies)',
    svc.includes('(?:\\s*\\(\\d+\\))+\\s*$') && /loginVisible[\s\S]{0,3000}\['SID', 'SAPISID', 'HSID', 'SSID', 'APISID'\][\s\S]{0,900}confirmaciones >= 2/.test(svc) && !/async loginVisible[\s\S]{0,3600}inyectarCookies/.test(svc)]
];

let ok = 0;
for (const [n, v] of checks) { console.log((v ? '✓' : '✗ FALLO') + ' ' + n); if (v) ok++; }
console.log(ok + '/' + checks.length + ' verificaciones del paquete v3.2.23');
process.exit(ok === checks.length ? 0 : 1);
