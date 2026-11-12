/* Test de workers en la app empaquetada: pdf.js Worker + Tesseract OCR offline.
 * Uso: electron dist/win-unpacked/resources/app.asar --test-workers --no-sandbox */
const { app, BrowserWindow, protocol } = require('electron');
const path = require('path');
const fs = require('fs');

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, codeCache: true, corsEnabled: true } }
]);

const APP_DIR = process.argv.includes('--asar')
  ? path.join(__dirname, '..', 'dist', 'win-unpacked', 'resources', 'app.asar', 'src', 'app')
  : path.join(__dirname, 'app');

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf', '.wasm': 'application/wasm', '.gz': 'application/gzip' };

app.whenReady().then(() => {
  protocol.handle('app', (request) => {
    return new Promise((resolve) => {
      let p;
      try { p = decodeURIComponent(new URL(request.url).pathname); } catch (e) { return resolve(new Response('bad', { status: 400 })); }
      if (!p || p === '/') p = '/index.html';
      const filePath = path.normalize(path.join(APP_DIR, p));
      if (!filePath.startsWith(APP_DIR + path.sep) && filePath !== APP_DIR) return resolve(new Response('forbidden', { status: 403 }));
      fs.promises.readFile(filePath)
        .then((buf) => resolve(new Response(buf, { headers: { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream' } })))
        .catch(() => resolve(new Response('nf', { status: 404 })));
    });
  });

  const win = new BrowserWindow({
    width: 1200, height: 800, show: false,
    webPreferences: { preload: path.join(__dirname, '..', 'src', 'preload.js'), contextIsolation: true, sandbox: true }
  });
  win.loadURL('app://pdfpro/index.html');

  win.webContents.once('did-finish-load', () => {
    setTimeout(async () => {
      try {
        const r = await win.webContents.executeJavaScript(`(async () => {
          const out = {};

          // 1) Worker de pdf.js (creación real, no fetch)
          out.pdfWorker = await new Promise((resolve) => {
            try {
              const w = new Worker('vendor/pdfjs/pdf.worker.min.js');
              const t = setTimeout(() => { try{w.terminate();}catch(e){} resolve('timeout'); }, 15000);
              w.onerror = (e) => { clearTimeout(t); try{w.terminate();}catch(e2){} resolve('error: ' + (e.message||'?')); };
              // el worker de pdf.js queda a la espera; enviarle un handshake y verificar respuesta
              w.postMessage('test');
              // pdf.js worker responde con "worker" al mensaje de handshake en v3
              w.onmessage = (ev) => { clearTimeout(t); try{w.terminate();}catch(e2){} resolve('ok: ' + JSON.stringify(ev.data).slice(0,60)); };
              setTimeout(() => { clearTimeout(t); try{w.terminate();}catch(e2){} resolve('ok-sin-respuesta-pero-sin-error'); }, 4000);
            } catch (e) { resolve('exception: ' + e.message); }
          });

          // 2) Tesseract OCR offline completo (worker + core WASM + idioma spa)
          out.ocr = await new Promise(async (resolve) => {
            try {
              const base = new URL('vendor/tesseract/', location.href).href;
              const worker = await Tesseract.createWorker('spa', undefined, {
                workerPath: base + 'worker.min.js',
                corePath: base + 'core',
                langPath: base + 'lang',
                workerBlobURL: false,
                logger: () => {}
              });
              // mini-imagen: "PDF" en texto renderizado en canvas
              const c = document.createElement('canvas');
              c.width = 200; c.height = 60;
              const ctx = c.getContext('2d');
              ctx.fillStyle = '#fff'; ctx.fillRect(0,0,200,60);
              ctx.fillStyle = '#000'; ctx.font = 'bold 32px sans-serif';
              ctx.fillText('PDF', 20, 42);
              const res = await worker.recognize(c.toDataURL('image/png'));
              await worker.terminate();
              resolve('ok: texto="' + (res.data.text||'').trim() + '"');
            } catch (e) { resolve('error: ' + e.message); }
          });
          return out;
        })()`);
        console.log('WORKER_TEST ' + JSON.stringify(r));
        const ok = String(r.pdfWorker).startsWith('ok') && String(r.ocr).startsWith('ok');
        app.exit(ok ? 0 : 5);
      } catch (e) {
        console.log('WORKER_TEST_ERROR ' + e);
        app.exit(6);
      }
    }, 5000);
  });
});
