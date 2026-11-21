// Verificación del paquete v3.2.28: el EOBT con dos puntos («18:50») se
// detecta en el campo «Matrícula (Aeronave / Espacio)» de vuelos que NO
// son tipo «S» — dentro del binario instalable.
const asar = require('@electron/asar');

const A = 'dist/win-unpacked/resources/app.asar';
const html = asar.extractFile(A, 'src/app/index.html').toString();
const mainjs = asar.extractFile(A, 'src/main.js').toString();
const svc = asar.extractFile(A, 'src/gmail-hora/GmailHoraService.js').toString();

const checks = [
  ['banner v3.2.28', html.includes('CORPAC AIS/ARO Platform v3.2.28')],
  ['renderer (paquete): normalización «18:50»→«1850» antes de los patrones del EOBT (tcH)',
    html.includes("var tcH=tc.replace(/\\b(\\d{1,2})\\s*[:.]\\s*(\\d{2})\\b/g,function(_,h,mi){return (h.length<2?'0':'')+h+mi;});")],
  ['renderer (paquete): los 4 patrones del EOBT usan tcH (2 etiqueta · 3 EOBT · 4 télex)',
    html.includes('var seg=tcH.slice(iDep,fin>0?iDep+fin:iDep+160);') &&
    html.includes('m=tcH.match(/\\bEOBT\\b[^0-9]{0,25}(\\d{4})/)||tcH.match(/FUERA\\s*DE\\s*CALZOS\\b[^0-9]{0,25}(\\d{4})/);') &&
    html.includes('m=tcH.match(/(?:^|[-–\\s])([A-Z]{4})\\s*(\\d{4})(?=[-–\\s]|$)/);') &&
    html.includes('var iDep=tcH.search(/AERODROMO')],
  ['renderer (paquete): geometría del EOBT admite «18:50» entero / «1850» / parejas / «:» suelto',
    html.includes('/^\\d{1,4}$|^\\d{1,2}[:.]\\d{1,2}$|^[:.]$/') && html.includes('var mh=g.match(/^(\\d{1,2})[:.](\\d{2})$/);')],
  ['renderer (paquete): v3.2.27 intacto (about:blank + hora verificada contra el correo abierto)',
    svc.includes("await this.page.goto('about:blank'") && svc.includes('const adjuntosAbiertos = await this._adjuntosAbiertos();')],
  ['renderer (paquete): v3.2.26 intacto (búsqueda POR pestaña, reintento con SU pestaña, hora manual blindada)',
    /function gmailHoraAuto\(tab\)\{[\s\S]{0,900}if\(_gmailHoraTTabs\[tid\]\)clearTimeout\(_gmailHoraTTabs\[tid\]\);/.test(html) && html.includes('_gmailReintentoTab=(tab&&tab.id)?tab:null;') && html.includes('if(_horaDeEste||_gmailHoraManual){gmailLoginBtnOcultar();return;}')],
  ['main (paquete): cola serializada + guardia 20 min intactas',
    mainjs.includes("_gmailHoraCadena.then(() => _gmailHoraBuscar(") && mainjs.includes('20 * 60 * 1000')]
];

let ok = 0;
for (const [n, v] of checks) { console.log((v ? '✓' : '✗ FALLO') + ' ' + n); if (v) ok++; }
console.log(ok + '/' + checks.length + ' verificaciones del paquete v3.2.28');
process.exit(ok === checks.length ? 0 : 1);
