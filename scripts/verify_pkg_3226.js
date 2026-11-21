// Verificación del paquete v3.2.26: cada pestaña agenda SU búsqueda
// (temporizadores por pestaña, búsqueda en segundo plano, reintento con
// su pestaña, hora manual blindada) dentro del binario instalable.
const asar = require('@electron/asar');

const A = 'dist/win-unpacked/resources/app.asar';
const html = asar.extractFile(A, 'src/app/index.html').toString();
const mainjs = asar.extractFile(A, 'src/main.js').toString();
const svc = asar.extractFile(A, 'src/gmail-hora/GmailHoraService.js').toString();

const checks = [
  ['banner v3.2.26', html.includes('CORPAC AIS/ARO Platform v3.2.26')],
  ['html (paquete): gmailHoraAuto agenda POR PESTAÑA (el temporizador global que cancelaba a los demás YA NO existe)',
    /function gmailHoraAuto\(tab\)\{[\s\S]{0,900}if\(_gmailHoraTTabs\[tid\]\)clearTimeout\(_gmailHoraTTabs\[tid\]\);[\s\S]{0,400}gmailHoraArchivo\(false,false,tb\);/.test(html) && !/_gmailHoraT=setTimeout\(gmailHoraArchivo,1500\)/.test(html)],
  ['html (paquete): gmailHoraArchivo acepta tabForzado y el guard del campo solo vale para la pestaña VISIBLE',
    html.includes('if(tabForzado)_tab=tabForzado;') && html.includes('if(t&&t.value&&!manual&&_esActiva){') && html.includes('else if(!manual&&!_esActiva&&_tab&&_tab.selloHora){')],
  ['html (paquete): reintento captura y rebusca SU pestaña; los 5 puntos pasan _tab',
    html.includes('_gmailReintentoTab=(tab&&tab.id)?tab:null;') && (html.match(/gmailHoraReintentoAgendar\(_tab\)/g) || []).length === 5],
  ['html (paquete): gmailAplicarHitApi consciente de la pestaña (2.º plano mira SU estado)',
    html.includes("if(_act){var rxT=document.getElementById('selloRxTime');if(rxT&&rxT.value)return true;}") && html.includes('else if(tab&&tab.selloHora)return true;')],
  ['html (paquete): hora escrita a mano blindada (bandera + 2 inputs + móvil + guard)',
    html.includes('function selloHoraEditada(){_gmailHoraManual=true;}') && (html.match(/oninput="selloHoraEditada\(\);/g) || []).length === 2 && html.includes('if(_horaDeEste||_gmailHoraManual){gmailLoginBtnOcultar();return;}')],
  ['html (paquete): v3.2.24-25 intactos (loadPDF y openFilesList limpian; hora firmada con su archivo)',
    /_tabV\.fileName!==_nuevoNombre[\s\S]{0,400}_fdL\.value='';/.test(html) && /renderDocTabs\(\);[\s\S]{0,900}_fdN\.value='';if\(_htN\)_htN\.value='';if\(_mtN\)_mtN\.value='';/.test(html) && html.includes("t2.selloHoraArchivo=(t2.fileName||'');} /* v3.2.24")],
  ['main (paquete): cola serializada intacta (N pestañas → N búsquedas, de a una)',
    mainjs.includes("_gmailHoraCadena.then(() => _gmailHoraBuscar(")],
  ['main+service (paquete): v3.2.23 intactos (sin marca de automatización, guardia 20 min, partición nueva)',
    svc.includes("ignoreDefaultArgs: ['--enable-automation']") && mainjs.includes('20 * 60 * 1000') && mainjs.split("'persist:gmail-correo1'").length - 1 >= 3]
];

let ok = 0;
for (const [n, v] of checks) { console.log((v ? '✓' : '✗ FALLO') + ' ' + n); if (v) ok++; }
console.log(ok + '/' + checks.length + ' verificaciones del paquete v3.2.26');
process.exit(ok === checks.length ? 0 : 1);
