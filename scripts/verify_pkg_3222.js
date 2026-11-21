// Verificación del paquete v3.2.22: el LOGIN VISIBLE EN CHROME REAL
// (la corrección para «la ventana interna muere en <2 s y mi sesión de
// Chrome no la ve») debe estar dentro del binario que se instala.
const asar = require('@electron/asar');

const A = 'dist/win-unpacked/resources/app.asar';
const html = asar.extractFile(A, 'src/app/index.html').toString();
const mainjs = asar.extractFile(A, 'src/main.js').toString();
const svc = asar.extractFile(A, 'src/gmail-hora/GmailHoraService.js').toString();

const checks = [
  ['banner v3.2.22', html.includes('CORPAC AIS/ARO Platform v3.2.22')],
  ['service (paquete): loginVisible() abre Chrome/Edge REAL (headless:false, mismo perfil, maximizado)',
    /async loginVisible[\s\S]{0,1200}headless: false[\s\S]{0,200}--start-maximized[\s\S]{0,900}launchPersistentContext\(this\.opts\.userDataDir/.test(svc)],
  ['service (paquete): loginVisible libera el perfil antes (cerrar(true)) y NO transfiere cookies',
    /async loginVisible[\s\S]{0,400}await this\.cerrar\(true\)/.test(svc) && !/async loginVisible[\s\S]{0,3000}inyectarCookies/.test(svc)],
  ['service (paquete): loginVisible espera SID/SAPISID/HSID/SSID/APISID (2 confirmaciones) y detecta cierre/timeout',
    /async loginVisible[\s\S]{0,2200}\['SID', 'SAPISID', 'HSID', 'SSID', 'APISID'\][\s\S]{0,900}confirmaciones >= 2/.test(svc) && svc.includes('ventana cerrada antes de completar el acceso')],
  ['main (paquete): la ronda usa loginVisible ANTES de la ventana de Electron (respaldo)',
    /const vis = await _gmailHoraSvc\.loginVisible\(\);[\s\S]{0,2000}abrirLoginGmailEnApp\(\)/.test(mainjs) && mainjs.includes('se abre una ventana de Chrome — inicie sesión ahí (solo la primera vez)…')],
  ['main (paquete): con loginVisible OK reinicia el buscador y reintenta directo (candado limpio)',
    /if \(vis && vis\.ok\) \{\s*\n\s*gmailHoraLog\('loginVisible: sesión iniciada y guardada en el perfil del buscador'\)[\s\S]{0,500}await _gmailHoraSvc\.iniciar\(\);[\s\S]{0,300}buscarHoraPorArchivo/.test(mainjs) && mainjs.includes('_gmailHoraLoginCancelado = false;   // v3.2.22')],
  ['main (paquete): v3.2.20-21 intactos (previa antes del candado, título con versión, guard OAuth)',
    /const previas = await _gmailHoraSesionYaValida\(\);[\s\S]{0,2400}if \(!manual && _gmailHoraLoginCancelado\)/.test(mainjs) && mainjs.includes("'PDFPro — Progreso Gmail (v' + app.getVersion() + ')'") && mainjs.includes("return { error: 'sin-credenciales' };")],
  ['service+main (paquete): v3.2.16-19 intactos (regex multi-«(n)», anomalía <5 s, guardia 7 min)',
    svc.includes('(?:\\s*\\(\\d+\\))+\\s*$') && mainjs.includes('const anomal = edad < 5;') && mainjs.includes('Promise.race([nucleo, guardia])')]
];

let ok = 0;
for (const [n, v] of checks) { console.log((v ? '✓' : '✗ FALLO') + ' ' + n); if (v) ok++; }
console.log(ok + '/' + checks.length + ' verificaciones del paquete v3.2.22');
process.exit(ok === checks.length ? 0 : 1);
