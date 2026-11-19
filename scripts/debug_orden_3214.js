/* debug del fallo de las pruebas ordered-first de la suite 3214 */
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'web', 'index.html'), 'utf8');

function extraerFn(nombre, asinc) {
  const marca = (asinc ? 'async ' : '') + 'function ' + nombre + '(';
  const ini = html.indexOf(marca);
  if (ini < 0) throw new Error('no se encontró ' + nombre);
  let i = html.indexOf('{', ini), prof = 0, j = i;
  for (; j < html.length; j++) {
    const c = html[j];
    if (c === '{') prof++;
    else if (c === '}') { prof--; if (!prof) break; }
  }
  return html.slice(ini, j + 1);
}

const src = [
  extraerFn('gmailNombreBase'),
  extraerFn('gmailWebBarridoOrdenado', true),
  extraerFn('gmailAplicarHitApi'),
  extraerFn('gmailHoraApiPorArchivo', true),
  extraerFn('gmailHoraLimaTxt')
].join('\n');
(0, eval)(src);

const campos = {};
global.document = { getElementById: (id) => (campos[id] = campos[id] || { value: '' }) };
global.window = global;
gmailIsDesktop = function () { return false; };
gmailWebTokens = function () { return { access_token: 'tok' }; };
gmailWebBarridoOrdenado = async function () { return { recibidoMs: 12345, de: 'CORPAC', adjuntos: ['PV CIX LIM 2226.pdf'] }; };
gmailWebBarrido = async function () { return []; };
gmailQuerysPorArchivo = function () { return []; };
gmailBuscarHitPorAdjunto = function () { return null; };
gmailAplicarHora = function (ms) { console.log('gmailAplicarHora llamado con ms=', ms); };
(async () => {
  try {
    const r0 = gmailAplicarHitApi({ recibidoMs: 999, de: 'X', adjuntos: ['a.pdf'] }, 'a.pdf', null);
    console.log('gmailAplicarHitApi directo →', r0);
  } catch (e) { console.log('gmailAplicarHitApi directo LANZA →', e.message); }
  try {
    const r = await gmailHoraApiPorArchivo('PV CIX LIM 2226.pdf');
    console.log('resultado:', r);
  } catch (e) { console.log('gmailHoraApiPorArchivo LANZA →', e.message); }
})();
