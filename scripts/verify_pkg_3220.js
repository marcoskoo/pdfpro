// Verificación del paquete v3.2.20: la SESIÓN PREVIA SIN VENTANA (la
// corrección para «gmail ya muestra los correos pero no obtiene la
// hora») debe estar dentro del binario que se instala.
const asar = require('@electron/asar');

const A = 'dist/win-unpacked/resources/app.asar';
const html = asar.extractFile(A, 'src/app/index.html').toString();
const mainjs = asar.extractFile(A, 'src/main.js').toString();
const svc = asar.extractFile(A, 'src/gmail-hora/GmailHoraService.js').toString();
const files = asar.listPackage(A).map((f) => String(f).replace(/^\/+/, ''));

const checks = [
  ['banner v3.2.20', html.includes('CORPAC AIS/ARO Platform v3.2.20')],
  ['main (paquete): _gmailHoraSesionYaValida() lee el almacén de la partición',
    mainjs.includes('async function _gmailHoraSesionYaValida()') && /_gmailHoraSesionYaValida\(\)[\s\S]{0,900}\['SID', 'SAPISID', 'HSID', 'SSID', 'APISID'\]/.test(mainjs)],
  ['main (paquete): sesión previa ANTES del candado y de la ventana — «sin abrir la ventana…»',
    mainjs.includes('La sesión de Gmail ya estaba activa — se transfiere (${previas.length} cookies) sin abrir la ventana…') && /const previas = await _gmailHoraSesionYaValida\(\);[\s\S]{0,2200}if \(!manual && _gmailHoraLoginCancelado\)/.test(mainjs)],
  ['main (paquete): cookies previas inyectadas + reintento dentro de la rama previa',
    /if \(previas && previas\.length\) \{[\s\S]{0,1400}buscarHoraPorArchivo/.test(mainjs) && mainjs.includes('las cookies previas no bastaron (Gmail sigue pidiendo sesión) — se abre la ventana de login')],
  ['main (paquete): anomalía <5 s (la haya visto o no) + cierre normal (resuelto) no es fallo',
    mainjs.includes('const anomal = edad < 5;') && !mainjs.includes('!vista && edad < 5') && /if \(resuelto\) return;[^\n]*cierre normal tras completar el login/.test(mainjs)],
  ['main (paquete): v3.2.19 intacto (render-process-gone, loadURL con reintento, guía 🔗)',
    mainjs.includes("on('render-process-gone'") && mainjs.includes('cargar(2);') && mainjs.includes('Cuando pueda, pulse «🔗 Iniciar sesión en Gmail»')],
  ['main (paquete): v3.2.18 intacto (guardia 7 min, GmailHoraTimeout)',
    mainjs.includes('Promise.race([nucleo, guardia])') && mainjs.includes("'GmailHoraTimeout'")],
  ['service (paquete): v3.2.16-18 intacto (regex multi-«(n)», «Bandeja: N correo(s)», contextBridge del preload)',
    svc.includes('(?:\\s*\\(\\d+\\))+\\s*$') && svc.includes('Bandeja: ${n} correo(s) traídos por la consulta.')]
];

let ok = 0;
for (const [n, v] of checks) { console.log((v ? '✓' : '✗ FALLO') + ' ' + n); if (v) ok++; }
console.log(ok + '/' + checks.length + ' verificaciones del paquete v3.2.20');
process.exit(ok === checks.length ? 0 : 1);
