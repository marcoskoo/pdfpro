// Verificación del paquete v3.2.27: cada consulta recarga de verdad
// (about:blank) y la hora extraída se verifica contra el correo ABIERTO
// (debe traer el archivo como adjunto) — dentro del binario instalable.
const asar = require('@electron/asar');

const A = 'dist/win-unpacked/resources/app.asar';
const html = asar.extractFile(A, 'src/app/index.html').toString();
const mainjs = asar.extractFile(A, 'src/main.js').toString();
const svc = asar.extractFile(A, 'src/gmail-hora/GmailHoraService.js').toString();

const checks = [
  ['banner v3.2.27', html.includes('CORPAC AIS/ARO Platform v3.2.27')],
  ['service (paquete): _buscar pasa por about:blank antes de cada consulta (recarga real)',
    svc.includes("await this.page.goto('about:blank'") && /about:blank'[\s\S]{0,300}_urlBusqueda\(query\)/.test(svc)],
  ['service (paquete): el paso por about:blank tolera fallos (se fuerza la carga igual)',
    /try \{\s*\n\s*await this\.page\.goto\('about:blank'[\s\S]{0,200}\} catch \(_\) \{[\s\S]{0,120}\}/.test(svc)],
  ['service (paquete): el correo ABIERTO debe traer el archivo como adjunto antes de usar su hora',
    svc.includes('const adjuntosAbiertos = await this._adjuntosAbiertos();') && /if \(!adjuntoCoincide\(archivo, adjuntosAbiertos\)\) \{[\s\S]{0,200}throw new ArchivoNoEncontradoError\(archivo\);/.test(svc)],
  ['service (paquete): el recorrido de bandeja v3.2.14 intacto (in:inbox has:attachment, 40, adjuntoCoincide)',
    svc.includes("'in:inbox has:attachment'") && svc.includes('_recorrerBandeja(archivo, 40)') && /adjuntoCoincide\(archivo, adjuntos\)/.test(svc)],
  ['renderer (paquete): v3.2.26 intacto (búsqueda POR pestaña, reintento con SU pestaña, hora manual blindada)',
    /function gmailHoraAuto\(tab\)\{[\s\S]{0,900}if\(_gmailHoraTTabs\[tid\]\)clearTimeout\(_gmailHoraTTabs\[tid\]\);/.test(html) && html.includes('_gmailReintentoTab=(tab&&tab.id)?tab:null;') && html.includes('if(_horaDeEste||_gmailHoraManual){gmailLoginBtnOcultar();return;}')],
  ['renderer (paquete): v3.2.24-25 intactos (limpieza de ficha en loadPDF y openFilesList)',
    /_tabV\.fileName!==_nuevoNombre[\s\S]{0,400}_fdL\.value='';/.test(html) && /renderDocTabs\(\);[\s\S]{0,900}_fdN\.value='';if\(_htN\)_htN\.value='';if\(_mtN\)_mtN\.value='';/.test(html)],
  ['main (paquete): cola serializada + guardia 20 min + sin marca de automatización intactas',
    mainjs.includes("_gmailHoraCadena.then(() => _gmailHoraBuscar(") && mainjs.includes('20 * 60 * 1000') && svc.includes("ignoreDefaultArgs: ['--enable-automation']")]
];

let ok = 0;
for (const [n, v] of checks) { console.log((v ? '✓' : '✗ FALLO') + ' ' + n); if (v) ok++; }
console.log(ok + '/' + checks.length + ' verificaciones del paquete v3.2.27');
process.exit(ok === checks.length ? 0 : 1);
