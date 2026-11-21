// Verificación del paquete v3.2.25: la pestaña nueva nace limpia (la
// hora del documento anterior ya no viaja al campo) y el guard solo
// respeta horas de este archivo o manuales — dentro del binario instalable.
const asar = require('@electron/asar');

const A = 'dist/win-unpacked/resources/app.asar';
const html = asar.extractFile(A, 'src/app/index.html').toString();
const mainjs = asar.extractFile(A, 'src/main.js').toString();
const svc = asar.extractFile(A, 'src/gmail-hora/GmailHoraService.js').toString();

const checks = [
  ['banner v3.2.25', html.includes('CORPAC AIS/ARO Platform v3.2.25')],
  ['html (paquete): openFilesList LIMPIA fecha/hora/matrícula al crear la pestaña nueva',
    /renderDocTabs\(\);[\s\S]{0,900}_fdN\.value='';if\(_htN\)_htN\.value='';if\(_mtN\)_mtN\.value='';[\s\S]{0,250}mobSelloSync\(false\)/.test(html)],
  ['html (paquete): la limpieza va DESPUÉS de guardar los campos de la pestaña saliente',
    /_selloCamposGuardar\(docTabGet\(activeTabId\)\);[\s\S]{0,1300}var _fdN=document\.getElementById\('selloRxDate'\)/.test(html)],
  ['html (paquete): el guard solo respeta horas firmadas con este archivo o guardadas sin firma (manuales)',
    html.includes('(_tab.selloHoraArchivo&&_tab.selloHoraArchivo===nombre)||(_tab.selloHora&&!_tab.selloHoraArchivo)') && /if\(_horaDeEste\)\{gmailLoginBtnOcultar\(\);return;\}/.test(html)],
  ['html (paquete): v3.2.24 intacto (loadPDF limpia al cambiar de archivo; hora firmada con su archivo)',
    /_tabV\.fileName!==_nuevoNombre[\s\S]{0,400}_fdL\.value='';if\(_htL\)_htL\.value='';[\s\S]{0,300}_tabV\.selloFecha='';_tabV\.selloHora='';_tabV\.selloHoraArchivo='';/.test(html) && html.includes("t2.selloHoraArchivo=(t2.fileName||'');} /* v3.2.24")],
  ['main+service (paquete): v3.2.23 intactos (sin marca de automatización, guardia 20 min, partición nueva)',
    svc.includes("ignoreDefaultArgs: ['--enable-automation']") && mainjs.includes('20 * 60 * 1000') && mainjs.split("'persist:gmail-correo1'").length - 1 >= 3],
  ['main+service (paquete): v3.2.20-22 intactos (loginVisible antes de la ventana, título con versión)',
    /const vis = await _gmailHoraSvc\.loginVisible\(\);[\s\S]{0,2000}abrirLoginGmailEnApp\(\)/.test(mainjs) && mainjs.includes("'PDFPro — Progreso Gmail (v' + app.getVersion() + ')'")]
];

let ok = 0;
for (const [n, v] of checks) { console.log((v ? '✓' : '✗ FALLO') + ' ' + n); if (v) ok++; }
console.log(ok + '/' + checks.length + ' verificaciones del paquete v3.2.25');
process.exit(ok === checks.length ? 0 : 1);
