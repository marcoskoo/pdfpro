#!/usr/bin/env node
/* Reproducción del bug: checkbox incrustados (w:sdt w14:checkbox) en .docx
 * se mueven/duplican al guardar con wordSaveDocx (la app real).
 *
 * Ejecuta el CÓDIGO REAL extraído de src/app/index.html (nvNormT, nvDomText,
 * _wzCharOps, wordSaveDocx) sobre un .docx generado con checkbox, renderizado
 * con el docx-preview y JSZip vendors REALES de la app, bajo jsdom.
 *
 * Tests:
 *   T1 sin edición     → document.xml debe quedar BYTE-IDÉNTICO al original
 *   T2 edición ajena   → el párrafo editado cambia; los checkbox quedan en su
 *                        lugar exacto (XML de cada párrafo idéntico salvo el
 *                        glifo en curso) y sin glifos sueltos en runs normales
 *   T3 toggle ☒→☐     → el control se sincroniza (glifo + w14:checked=0) en
 *                        su misma posición; nada duplicado
 *   T4 borrar checkbox → el control se elimina del párrafo; el resto intacto
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..', '..');
const IDX = path.join(ROOT, 'src', 'app', 'index.html');
const VENDOR = path.join(ROOT, 'web', 'vendor');
const DOCX = path.join(__dirname, 'test_cb.docx');

/* ── jsdom global ── */
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { pretendToBeVisual: true, url: 'https://localhost/' });
const G = globalThis;
for (const k of ['window', 'document', 'DOMParser', 'XMLSerializer', 'Node', 'Element', 'HTMLElement', 'navigator', 'getComputedStyle']) {
  try { G[k] = dom.window[k]; } catch (e) { /* algunas no existen */ }
}
G.Blob = dom.window.Blob;
G.self = dom.window;
G.globalThis.fetch = () => Promise.reject(new Error('fetch no esperado en el harness'));

/* ── vendors reales (UMD → window/globalThis, según el wrapper de cada uno) ── */
function loadVendor(file, globalName) {
  const src = fs.readFileSync(file, 'utf8');
  const mod = new Function('window', 'document', 'self', 'module', 'exports', 'define',
    src + '\nreturn [window, self, (typeof globalThis!=="undefined"?globalThis:null)].filter(Boolean).map(function(o){return o.' + globalName + ';}).find(function(v){return !!v;});');
  const val = mod(dom.window, dom.window.document, dom.window, undefined, undefined, undefined);
  if (!val) throw new Error('vendor ' + file + ' no exportó ' + globalName);
  G[globalName] = val; dom.window[globalName] = val;
  return val;
}
loadVendor(path.join(VENDOR, 'jszip.min.js'), 'JSZip');
loadVendor(path.join(VENDOR, 'docx-preview.min.js'), 'docx');
if (!G.docx || !G.docx.renderAsync) throw new Error('docx-preview sin renderAsync');
if (!G.JSZip || !G.JSZip.loadAsync) throw new Error('JSZip sin loadAsync');

/* ── extraer el CÓDIGO REAL de index.html ── */
const html = fs.readFileSync(IDX, 'utf8');
function slice(startMark, endMark) {
  const a = html.indexOf(startMark);
  if (a < 0) throw new Error('no se encontró: ' + startMark);
  const b = html.indexOf(endMark, a);
  if (b < 0) throw new Error('no se encontró fin: ' + endMark);
  return html.slice(a, b);
}
const realSrc = [
  slice('function nvNormT(', 'function nvDomText('),
  slice('function nvDomText(', 'function nativeTabOpen('),
  slice('function _wzCharOps(', '// ════ v2.9.0 — WORD: GUARDADO'),
  slice('async function wordSaveDocx(', '// ════ v2.9.2 — SELLOS DIRECTOS'),
].join('\n');

/* ── stubs del entorno de la app ── */
const toasts = [];
let lastBlob = null;
G.toast = (m) => toasts.push(m);
G.setProg = () => {};
G.hideProg = () => {};
G.renderDocTabs = () => {};
G.dlBlob = (blob) => { lastBlob = blob; };

const api = new Function('window', 'document', 'JSZip', 'DOMParser', 'XMLSerializer',
  'toast', 'setProg', 'hideProg', 'renderDocTabs', 'dlBlob',
  realSrc + '\n; return { wordSaveDocx, nvDomText, nvNormT, _wzCharOps };')(
    dom.window, dom.window.document, G.JSZip, dom.window.DOMParser, dom.window.XMLSerializer,
    G.toast, G.setProg, G.hideProg, G.renderDocTabs, G.dlBlob);

/* ── helpers ── */
const ab = (() => { const b = fs.readFileSync(DOCX); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); })();
async function zipXml(buf, entry) {
  const b = buf instanceof G.Blob ? buf : new G.Blob([buf]);
  const zz = await G.JSZip.loadAsync(await b.arrayBuffer());
  return zz.file(entry).async('string');
}
async function getSavedXml() {
  if (!lastBlob) throw new Error('wordSaveDocx no produjo blob');
  return zipXml(lastBlob, 'word/document.xml');
}
function parseXml(s) { return new dom.window.DOMParser().parseFromString(s, 'application/xml'); }
const GLYPHS = /[\u2610\u2612]/g;
const mask = (s) => String(s).replace(GLYPHS, '#');
function sdtInfos(xdoc) {
  return Array.from(xdoc.getElementsByTagName('w:sdt')).map((s) => ({
    id: (s.getElementsByTagName('w:id')[0] || {}).getAttribute ? s.getElementsByTagName('w:id')[0].getAttribute('w:val') : '?',
    glyph: Array.from(s.getElementsByTagName('w:t')).map((t) => t.textContent).join(''),
    checked: (() => { const c = s.getElementsByTagName('w14:checked')[0]; return c ? c.getAttribute('w14:val') : null; })(),
    xml: new dom.window.XMLSerializer().serializeToString(s),
  }));
}
function looseGlyphs(xdoc) { // glifos en w:t FUERA de sdtContent
  const out = [];
  Array.from(xdoc.getElementsByTagName('w:t')).forEach((t) => {
    let n = t, inside = false;
    while (n) { if (n.tagName === 'w:sdtContent') { inside = true; break; } n = n.parentElement; }
    if (!inside && GLYPHS.test(t.textContent)) out.push(t.textContent);
  });
  return out;
}
async function render() {
  const holder = dom.window.document.createElement('div');
  dom.window.document.body.appendChild(holder);
  await G.docx.renderAsync(ab.slice(0), holder, null, {
    inWrapper: true, breakPages: true, ignoreWidth: false, ignoreHeight: false,
    ignoreFonts: false, ignoreLastRenderedPageBreak: false, useBase64URL: true,
    experimental: true, debug: false,
  });
  return holder;
}
function makeTab(wrap) {
  return { _docx: { ab: ab.slice(0), marg: {}, wrap, zoom: 1 }, nvStamps: [], fileName: 'test_cb', _dirty: true };
}

/* ── tests ── */
let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (detail ? ' — ' + detail : '')); }
}
(async () => {
  const originalDocXml = await zipXml(new G.Blob([ab]), 'word/document.xml');
  const origSdts = sdtInfos(parseXml(originalDocXml));

  /* T1 — sin edición: el guardado NO debe tocar el archivo */
  console.log('T1 · sin edición → XML byte-idéntico');
  {
    const wrap = await render();
    toasts.length = 0; lastBlob = null;
    await api.wordSaveDocx(makeTab(wrap));
    const saved = lastBlob ? await getSavedXml() : null;
    if (!saved) {
      check('guardó sin cambios (changes=0 → no reescribe el zip)', toasts.some(t => t.includes('0 cambio')), toasts.join(' | '));
    } else {
      check('XML idéntico al original', saved === originalDocXml,
        'diff: ' + (saved.length === originalDocXml.length ? 'mismo largo, contenido distinto' : 'longitud ' + originalDocXml.length + '→' + saved.length));
    }
    const sd = sdtInfos(parseXml(saved || originalDocXml));
    check('5 controles checkbox presentes', sd.length === 5, 'encontrados: ' + sd.length);
    check('sin glifos sueltos en runs normales', looseGlyphs(parseXml(saved || originalDocXml)).length === 0,
      JSON.stringify(looseGlyphs(parseXml(saved || originalDocXml))));
  }

  /* T2 — edición en OTRO párrafo: los checkbox quedan en su lugar exacto */
  console.log('T2 · edición ajena → checkbox intactos en su lugar');
  {
    const wrap = await render();
    // editar P1: «123 — control de checkbox» → «456 — EDITADO»
    let edited = false;
    wrap.querySelectorAll('section.docx article p').forEach((p) => {
      p.childNodes.forEach((n) => {
        if (n.nodeType === 3 && n.nodeValue.includes('123 — control de checkbox')) { n.nodeValue = n.nodeValue.replace('123 — control de checkbox', '456 — EDITADO'); edited = true; }
      });
      if (!edited) p.querySelectorAll('span').forEach((sp) => sp.childNodes.forEach((n) => {
        if (n.nodeType === 3 && n.nodeValue.includes('123 — control de checkbox')) { n.nodeValue = n.nodeValue.replace('123 — control de checkbox', '456 — EDITADO'); edited = true; }
      }));
    });
    if (!edited) { check('ERROR: no se pudo editar el DOM (selector)', false); }
    else {
      toasts.length = 0; lastBlob = null;
      await api.wordSaveDocx(makeTab(wrap));
      const saved = await getSavedXml();
      const sx = parseXml(saved), ox = parseXml(originalDocXml);
      check('edición aplicada («456 — EDITADO»)', saved.includes('456 — EDITADO'));
      check('edición única (1 cambio)', toasts.some(t => t.includes('1 cambio')), toasts.join(' | '));
      const sd = sdtInfos(sx);
      check('5 controles presentes', sd.length === 5, 'encontrados: ' + sd.length);
      check('checkbox en su lugar exacto (XML de cada sdt idéntico)',
        sd.every((s, i) => s.xml === origSdts[i].xml),
        sd.map((s, i) => s.xml === origSdts[i].xml ? i + ':ok' : i + ':DISTINTO').join(' '));
      check('sin glifos sueltos en runs normales', looseGlyphs(sx).length === 0, JSON.stringify(looseGlyphs(sx)));
      const savedTxt = Array.from(sx.getElementsByTagName('w:t')).map(t => t.textContent).join('');
      check('texto del documento completo (sin perder nada)', mask(savedTxt) === mask(Array.from(ox.getElementsByTagName('w:t')).map(t => t.textContent).join('')).replace('123 — control de checkbox', '456 — EDITADO'));
    }
  }

  /* T3 — toggle ☒→☐ en la vista: sincronizar el control, mismo lugar */
  console.log('T3 · toggle ☒→☐ → control sincronizado en su posición');
  {
    const wrap = await render();
    let toggled = false;
    wrap.querySelectorAll('section.docx article p').forEach((p) => {
      const walker = dom.window.document.createTreeWalker(p, 4 /* SHOW_TEXT */);
      let n; while ((n = walker.nextNode())) {
        if (n.nodeValue.includes('\u2612')) { n.nodeValue = n.nodeValue.replace('\u2612', '\u2610'); toggled = true; }
      }
    });
    if (!toggled) check('ERROR: glifo ☒ no visible en la vista (docx-preview)', false);
    else {
      toasts.length = 0; lastBlob = null;
      await api.wordSaveDocx(makeTab(wrap));
      const saved = await getSavedXml();
      const sd = sdtInfos(parseXml(saved));
      check('5 controles presentes', sd.length === 5, 'encontrados: ' + sd.length);
      const t1 = sd.find(s => s.id === '1001');
      check('checkbox 1001 ahora ☐', t1 && t1.glyph === '\u2610', t1 && 'glifo=' + JSON.stringify(t1.glyph));
      check('checkbox 1001 w14:checked=0', t1 && t1.checked === '0', t1 && 'checked=' + t1.checked);
      const t2 = sd.find(s => s.id === '1002');
      check('checkbox 1002 intacto (☐, unchecked)', t2 && t2.glyph === '\u2610' && t2.checked === '0');
      const t3 = sd.find(s => s.id === '1003');
      check('checkbox de celda 1003 también sincronizado (☐, checked=0)', t3 && t3.glyph === '\u2610' && t3.checked === '0',
        t3 && 'glifo=' + JSON.stringify(t3.glyph) + ' checked=' + t3.checked);
      check('sin glifos sueltos en runs normales', looseGlyphs(parseXml(saved)).length === 0, JSON.stringify(looseGlyphs(parseXml(saved))));
      // posición exacta: el párrafo 2 con glifos/estados enmascarados debe ser idéntico
      const maskState = (s) => s.replace(/w14:val="[01]"/g, 'w14:val="#"').replace(GLYPHS, '#');
      const psSaved = Array.from(parseXml(saved).getElementsByTagName('w:p'));
      const psOrig = Array.from(parseXml(originalDocXml).getElementsByTagName('w:p'));
      const p2s = new dom.window.XMLSerializer().serializeToString(psSaved[1]);
      const p2o = new dom.window.XMLSerializer().serializeToString(psOrig[1]);
      check('párrafo del checkbox: misma estructura y posición', maskState(p2s) === maskState(p2o));
    }
  }

  /* T4 — borrar el checkbox en la vista: el control se elimina, el resto intacto */
  console.log('T4 · borrar checkbox → control eliminado, resto intacto');
  {
    const wrap = await render();
    let removed = false;
    wrap.querySelectorAll('section.docx article p').forEach((p) => {
      const walker = dom.window.document.createTreeWalker(p, 4);
      let n; while ((n = walker.nextNode())) {
        if (!removed && n.nodeValue.includes('\u2612')) { n.nodeValue = n.nodeValue.replace('\u2612', ''); removed = true; }
      }
    });
    if (!removed) check('ERROR: no se pudo borrar el glifo en la vista', false);
    else {
      toasts.length = 0; lastBlob = null;
      await api.wordSaveDocx(makeTab(wrap));
      const saved = await getSavedXml();
      const sd = sdtInfos(parseXml(saved));
      check('quedan 4 controles (1001 eliminado)', sd.length === 4 && !sd.find(s => s.id === '1001'), 'encontrados: ' + sd.map(s => s.id).join(','));
      check('sin glifos sueltos en runs normales', looseGlyphs(parseXml(saved)).length === 0, JSON.stringify(looseGlyphs(parseXml(saved))));
      check('el resto del texto sobrevive', saved.includes('Vuelo militar') && saved.includes('Fin del documento') && saved.includes('Parrafo dentro de bloque sdt'));
    }
  }

  console.log('\n══════ RESUMEN: ' + pass + ' ✓ · ' + fail + ' ✗ ' + (fail ? '← BUG REPRODUCIDO (código actual)' : '← TODO OK') + ' ══════');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
