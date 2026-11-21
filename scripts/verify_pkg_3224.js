// Verificación del paquete v3.2.24: la hora de recepción pertenece al
// ARCHIVO (loadPDF limpia la del anterior, gmailAplicarHora la firma,
// los guards la respetan solo si es de este archivo) debe estar dentro
// del binario que se instala.
const asar = require('@electron/asar');

const A = 'dist/win-unpacked/resources/app.asar';
const html = asar.extractFile(A, 'src/app/index.html').toString();
const mainjs = asar.extractFile(A, 'src/main.js').toString();
const svc = asar.extractFile(A, 'src/gmail-hora/GmailHoraService.js').toString();

const checks = [
  ['banner v3.2.24', html.includes('CORPAC AIS/ARO Platform v3.2.24')],
  ['html (paquete): loadPDF LIMPIA la hora del archivo anterior al cambiar de archivo',
    /_tabV\.fileName!==_nuevoNombre[\s\S]{0,400}_fdL\.value='';if\(_htL\)_htL\.value='';[\s\S]{0,300}_tabV\.selloFecha='';_tabV\.selloHora='';_tabV\.selloHoraArchivo='';/.test(html)],
  ['html (paquete): gmailAplicarHora firma la hora con su archivo (selloHoraArchivo)',
    html.includes("t2.selloFecha=fecha;t2.selloHora=hora;t2.selloHoraArchivo=(t2.fileName||'');} /* v3.2.24")],
  ['html (paquete): guard de gmailHoraArchivo consciente del archivo (hora de OTRO → limpia y busca)',
    /var _horaDeOtro=!!\(_tab&&_tab\.selloHoraArchivo&&_tab\.selloHoraArchivo!==nombre\);[\s\S]{0,200}if\(!_horaDeOtro\)\{gmailLoginBtnOcultar\(\);return;\}/.test(html)],
  ['html (paquete): guard del reintento consciente del archivo',
    html.includes("if(t&&t.value&&!(_tab.selloHoraArchivo&&_tab.selloHoraArchivo!==nombre))return;")],
  ['html (paquete): el guard antiguo «ya hay hora» sin distinguir archivo YA NO existe',
    !html.includes("if(t&&t.value&&!manual){gmailLoginBtnOcultar();return;}  // ya hay hora: no se toca")],
  ['main+service (paquete): v3.2.23 intactos (sin marca de automatización, guardia 20 min, partición nueva)',
    svc.includes("ignoreDefaultArgs: ['--enable-automation']") && mainjs.includes('20 * 60 * 1000') && mainjs.split("'persist:gmail-correo1'").length - 1 >= 3],
  ['main+service (paquete): v3.2.20-22 intactos (loginVisible antes de la ventana, título con versión)',
    /const vis = await _gmailHoraSvc\.loginVisible\(\);[\s\S]{0,2000}abrirLoginGmailEnApp\(\)/.test(mainjs) && mainjs.includes("'PDFPro — Progreso Gmail (v' + app.getVersion() + ')'")]
];

let ok = 0;
for (const [n, v] of checks) { console.log((v ? '✓' : '✗ FALLO') + ' ' + n); if (v) ok++; }
console.log(ok + '/' + checks.length + ' verificaciones del paquete v3.2.24');
process.exit(ok === checks.length ? 0 : 1);
