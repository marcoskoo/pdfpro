#!/usr/bin/env node
/* Test unitario de _pdfOpen (v3.1.4): cadena de respaldo del worker PDF.
 * Stub de pdfjsLib: mkDoc falla con error de worker según la fuente activa. */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'https://firma-aisphi.vercel.app/pdfpro/' });
const G = globalThis;
for (const k of ['window', 'document', 'DOMParser', 'XMLSerializer', 'Node', 'Element']) { try { G[k] = dom.window[k]; } catch (e) {} }

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'app', 'index.html'), 'utf8');
const a = html.indexOf('var _pdfWorkerAlts=null;');
const b = html.indexOf('var _pdfWorkerIdx=0;');
if (a < 0 || b < 0) { console.log('✗ no se encontró el helper _pdfOpen en index.html'); process.exit(1); }
const src = html.slice(a, html.indexOf('}', html.indexOf('throw new Error', b)) + 1);

// stub pdfjsLib: falla con error de worker según workerSrc activo
const failing = new Set(['vendor/pdfjs/pdf.worker.min.js', 'https://firma-aisphi.vercel.app/vendor/pdfjs/pdf.worker.min.js']);
let lastSrc = '';
const pdfjsLib = {
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument(args) {
    lastSrc = this.GlobalWorkerOptions.workerSrc;
    if (failing.has(lastSrc)) return { promise: Promise.reject(new Error('Setting up fake worker failed: "Cannot load script at: ' + lastSrc + '"')) };
    if (args.data.byteLength === 0) return { promise: Promise.reject(new Error('buffer detached!')) };
    return { promise: Promise.resolve({ numPages: 1, __ok: true, __src: lastSrc }) };
  }
};
const toasts = [];
G.toast = (m) => toasts.push(m);

const api = new Function('pdfjsLib', 'toast', 'location',
  src + '\n; return { _pdfOpen, _pdfWorkerAltList };')(pdfjsLib, G.toast, dom.window.location);

(async () => {
  let pass = 0, fail = 0;
  const ck = (n, c, d) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n + (d ? ' — ' + d : '')); } };

  // W1 — la ruta relativa y la del origen fallan → CDN rescata
  const buf = new Uint8Array([1, 2, 3]);
  const doc = await api._pdfOpen(() => pdfjsLib.getDocument({ data: buf.slice() }).promise);
  ck('CDN rescata cuando relativa y raíz fallan', doc.__ok && /unpkg\.com/.test(doc.__src), 'src=' + doc.__src);
  ck('aviso de fuente alternativa mostrado', toasts.some(t => t.includes('fuente alternativa')), toasts.join('|'));

  // W2 — la fuente que funciona queda fijada (no reintenta las muertas)
  toasts.length = 0;
  const doc2 = await api._pdfOpen(() => pdfjsLib.getDocument({ data: buf.slice() }).promise);
  ck('la fuente CDN queda fijada para siguientes aperturas', doc2.__ok && doc2.__src === doc.__src, 'src=' + doc2.__src);
  ck('sin aviso repetido', toasts.length === 0, toasts.join('|'));

  // W3 — error REAL del PDF (no de worker) se propaga sin reintentos
  let realErr = null;
  try { await api._pdfOpen(() => Promise.reject(new Error('Invalid PDF structure'))); }
  catch (e) { realErr = e; }
  ck('error real del PDF se propaga tal cual', realErr && /Invalid PDF structure/.test(realErr.message), realErr && realErr.message);

  // W4 — todas las fuentes caídas → error accionable con la URL vigente
  for (const s of [...api._pdfWorkerAltList()]) failing.add(s);
  let werr = null;
  try { await api._pdfOpen(() => pdfjsLib.getDocument({ data: buf.slice() }).promise); }
  catch (e) { werr = e; }
  ck('error final accionable (URL vigente en el mensaje)', werr && /licencias-firmas\.vercel\.app/.test(werr.message), werr && werr.message);
  ck('workerSrc restaurado a la ruta local', pdfjsLib.GlobalWorkerOptions.workerSrc === 'vendor/pdfjs/pdf.worker.min.js', pdfjsLib.GlobalWorkerOptions.workerSrc);

  // W5 — cada reintento usa un buffer FRESCO (pdf.js detacha el primero)
  failing.clear(); failing.add('vendor/pdfjs/pdf.worker.min.js');
  const doc5 = await api._pdfOpen(() => pdfjsLib.getDocument({ data: buf.slice() }).promise);
  ck('buffer fresco por reintento (sin detached)', doc5.__ok, 'fallo');

  console.log('\n══════ WORKER: ' + pass + ' ✓ · ' + fail + ' ✗ ══════');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('ERROR:', e); process.exit(2); });
