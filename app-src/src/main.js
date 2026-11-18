/* PDFPro — PDF Editor Pro (CORPAC AIS/ARO SPHI) · versión de escritorio
 * Proceso principal de Electron.
 * Características:
 *  - Protocolo seguro propio app:// (los recursos y workers cargan locales)
 *  - Menú nativo en español (Abrir, Imprimir, Zoom, Pantalla completa…)
 *  - Instancia única + "Abrir con" de Windows para .pdf/.docx/.xlsx…
 *  - OAuth de Google Drive en ventana nativa (captura el code del redirect)
 *  - Enlaces externos en el navegador del sistema
 *  - Aviso de descargas completadas al renderer
 */
const { app, BrowserWindow, Menu, ipcMain, shell, dialog, protocol } = require('electron');
const path = require('path');
const fs = require('fs');

const APP_DIR = path.join(__dirname, 'app');
const IS_DEV = !app.isPackaged;
const IS_SMOKE = process.argv.includes('--smoke');
const OPEN_EXTS = ['.pdf', '.xlsx', '.xlsm', '.xls', '.csv', '.docx', '.doc'];
const OAUTH_REDIRECT = 'https://propdf-editor.netlify.app';

/* ── Esquema app:// (debe registrarse antes de que la app esté lista) ── */
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      codeCache: true,
      corsEnabled: true
    }
  }
]);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.wasm': 'application/wasm',
  '.gz': 'application/gzip'
};

function handleAppProtocol(request) {
  return new Promise((resolve) => {
    let p;
    try {
      p = decodeURIComponent(new URL(request.url).pathname);
    } catch (e) {
      return resolve(new Response('URL inválida', { status: 400 }));
    }
    if (!p || p === '/') p = '/index.html';
    const filePath = path.normalize(path.join(APP_DIR, p));
    // bloquear path traversal fuera del directorio de la app
    if (!filePath.startsWith(APP_DIR + path.sep) && filePath !== APP_DIR) {
      return resolve(new Response('Prohibido', { status: 403 }));
    }
    fs.promises.readFile(filePath)
      .then((buf) => {
        const mime = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
        resolve(new Response(buf, { headers: { 'Content-Type': mime } }));
      })
      .catch(() => resolve(new Response('No encontrado', { status: 404 })));
  });
}

/* ── Ventana principal ── */
let win = null;
let bridgeReady = false;
const pendingFiles = [];

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: '#0f1013',
    show: false,
    title: 'PDFPro',
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  });

  win.once('ready-to-show', () => win.show());
  // mantener el título "PDFPro" aunque la página lo cambie
  win.on('page-title-updated', (e) => e.preventDefault());

  /* Ventanas emergentes:
     - about:blank → ventana de impresión interna (permitir)
     - OAuth de Google → permitir (lo gestiona el flujo nativo)
     - cualquier otro enlace http(s) → navegador del sistema */
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!url || url === 'about:blank') return { action: 'allow' };
    if (url.startsWith('https://accounts.google.com/') || url.startsWith(OAUTH_REDIRECT)) {
      return { action: 'allow' };
    }
    shell.openExternal(url).catch(() => {});
    return { action: 'deny' };
  });

  win.webContents.on('did-create-window', (child) => {
    // la ventana de impresión hereda comportamiento: enlaces externos al sistema
    child.webContents.setWindowOpenHandler(({ url }) => {
      if (!url || url === 'about:blank') return { action: 'allow' };
      shell.openExternal(url).catch(() => {});
      return { action: 'deny' };
    });
  });

  win.loadURL('app://pdfpro/index.html');

  win.on('closed', () => { win = null; });

  if (IS_DEV) {
    win.webContents.openDevTools({ mode: 'detach' });
  }

  if (IS_SMOKE) attachSmoke(win);
}

/* ── Menú nativo ── */
function buildMenu() {
  const send = (channel, payload) => { if (win) win.webContents.send(channel, payload); };
  const template = [
    {
      label: 'Archivo',
      submenu: [
        {
          label: 'Abrir archivo…',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const r = await dialog.showOpenDialog(win, {
              title: 'Abrir documento',
              properties: ['openFile', 'multiSelections'],
              filters: [
                { name: 'Documentos compatibles', extensions: ['pdf', 'xlsx', 'xlsm', 'xls', 'csv', 'docx', 'doc'] },
                { name: 'Documentos PDF', extensions: ['pdf'] },
                { name: 'Excel', extensions: ['xlsx', 'xlsm', 'xls', 'csv'] },
                { name: 'Word', extensions: ['docx', 'doc'] },
                { name: 'Todos los archivos', extensions: ['*'] }
              ]
            });
            if (r.canceled) return;
            r.filePaths.forEach(sendOpenFile);
          }
        },
        { type: 'separator' },
        { label: 'Cerrar ventana', role: 'close' },
        { type: 'separator' },
        { label: 'Salir', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
      ]
    },
    {
      label: 'Edición',
      submenu: [
        { label: 'Deshacer', role: 'undo' },
        { label: 'Rehacer', role: 'redo' },
        { type: 'separator' },
        { label: 'Cortar', role: 'cut' },
        { label: 'Copiar', role: 'copy' },
        { label: 'Pegar', role: 'paste' },
        { label: 'Seleccionar todo', role: 'selectAll' }
      ]
    },
    {
      label: 'Ver',
      submenu: [
        { label: 'Recargar', role: 'reload' },
        { label: 'Pantalla completa', role: 'togglefullscreen' },
        { type: 'separator' },
        { label: 'Zoom +', role: 'zoomIn' },
        { label: 'Zoom −', role: 'zoomOut' },
        { label: 'Zoom normal', role: 'resetZoom' },
        ...(IS_DEV
          ? [{ type: 'separator' }, { label: 'Herramientas de desarrollo', role: 'toggleDevTools' }]
          : [])
      ]
    },
    {
      label: 'Ayuda',
      submenu: [
        {
          label: 'Acerca de PDFPro',
          click: () => {
            dialog.showMessageBox(win, {
              type: 'info',
              title: 'Acerca de PDFPro',
              message: 'PDFPro ' + app.getVersion(),
              detail:
                'PDF Editor Pro — CORPAC AIS/ARO SPHI\n' +
                'Versión de escritorio para Windows\n\n' +
                'Electron ' + process.versions.electron + ' · Chromium ' + process.versions.chrome + '\n' +
                '© 2026 CORPAC AIS/ARO SPHI',
              buttons: ['Aceptar']
            });
          }
        }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/* ── Apertura de archivos (doble clic / "Abrir con" / segundo arranque) ── */
function extractFileArg(argv) {
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (!a || a.startsWith('-')) continue;
    if (OPEN_EXTS.includes(path.extname(a).toLowerCase()) && fs.existsSync(a)) return a;
  }
  return null;
}

function sendOpenFile(filePath) {
  try {
    const buf = fs.readFileSync(filePath);
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    if (win && bridgeReady) {
      win.webContents.send('app:open-file', {
        name: path.basename(filePath),
        path: filePath,
        buffer: ab
      });
    } else {
      pendingFiles.push({ name: path.basename(filePath), path: filePath, buffer: ab });
      if (win) win.show();
    }
  } catch (e) {
    dialog.showErrorBox('PDFPro', 'No se pudo abrir el archivo:\n' + filePath + '\n\n' + e.message);
  }
}

/* ── Descargas: aviso al terminar ── */
function setupDownloads() {
  const { session } = require('electron');
  session.defaultSession.on('will-download', (_event, item) => {
    const name = item.getFilename();
    item.once('done', (_e, state) => {
      if (win) {
        win.webContents.send('download:done', {
          name,
          ok: state === 'completed',
          path: item.getSavePath()
        });
      }
    });
  });
}

/* ── OAuth de Google Drive (ventana nativa, captura del código) ── */
let oauthPending = 0;
ipcMain.handle('oauth:open', async (_event, authUrl) => {
  return new Promise((resolve) => {
    const id = ++oauthPending;
    const child = new BrowserWindow({
      width: 520,
      height: 700,
      show: false,
      title: 'Conectar con Google Drive',
      autoHideMenuBar: true,
      backgroundColor: '#ffffff',
      parent: win || undefined,
      webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
    });
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      try { if (!child.isDestroyed()) child.close(); } catch (e) { /* noop */ }
      resolve(result);
    };
    const check = (u) => {
      try {
        if (u && u.startsWith(OAUTH_REDIRECT) && u.includes('code=')) {
          const params = new URL(u).searchParams;
          finish({ code: params.get('code'), state: params.get('state') });
        }
      } catch (e) { /* noop */ }
    };
    child.webContents.on('did-navigate', (_e, u) => check(u));
    child.webContents.on('did-navigate-in-page', (_e, u) => check(u));
    child.on('closed', () => finish({ error: 'cancelled' }));
    child.once('ready-to-show', () => child.show());
    child.loadURL(authUrl).catch(() => finish({ error: 'cancelled' }));
    // cierre por tiempo de espera (5 min)
    const t = setTimeout(() => finish({ error: 'timeout', id }), 5 * 60 * 1000);
    child.once('closed', () => clearTimeout(t));
  });
});

ipcMain.handle('app:get-version', () => app.getVersion());

ipcMain.on('bridge:ready', () => {
  bridgeReady = true;
  while (pendingFiles.length && win) {
    const f = pendingFiles.shift();
    win.webContents.send('app:open-file', f);
  }
});

/* ── Ciclo de vida ── */
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (_e, argv) => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
    }
    const f = extractFileArg(argv);
    if (f) sendOpenFile(f);
  });

  app.whenReady().then(async () => {
    protocol.handle('app', handleAppProtocol);
    setupDownloads();
    buildMenu();
    createWindow();

    // archivo recibido como argumento de arranque (Abrir con…)
    const f = extractFileArg(process.argv);
    if (f) sendOpenFile(f);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    app.quit();
  });
}

/* ── Modo smoke-test (verificación headless) ── */
function attachSmoke(w) {
  const results = { consoleErrors: [], checks: {}, url: '', screenshot: null };
  const timeout = setTimeout(() => {
    console.log('SMOKE_TIMEOUT');
    try { app.exit(3); } catch (e) { /* noop */ }
  }, 60000);

  w.webContents.on('console-message', (_ev, level, message) => {
    // compatibilidad de firmas entre versiones de Electron
    const lv = typeof level === 'object' ? level.level : level;
    if (String(lv) === '3' || String(lv) === 'error') {
      results.consoleErrors.push(String(message).slice(0, 400));
    }
  });

  w.webContents.once('did-finish-load', () => {
    setTimeout(async () => {
      try {
        results.checks = await w.webContents.executeJavaScript(`(async () => {
          const c = {};
          c.libPdfjs = typeof pdfjsLib !== 'undefined';
          c.libPdfLib = typeof PDFLib !== 'undefined';
          c.libXlsx = typeof XLSX !== 'undefined';
          c.libMammoth = typeof mammoth !== 'undefined';
          c.libJszip = typeof JSZip !== 'undefined';
          c.libLeaflet = typeof L !== 'undefined';
          c.libTesseract = typeof Tesseract !== 'undefined';
          c.bridge = !!window.pdfproDesktop;
          c.loginVisible = !!document.getElementById('loginLayer') &&
            getComputedStyle(document.getElementById('loginLayer')).display !== 'none';
          c.appVersion = (typeof window.pdfproDesktop !== 'undefined')
            ? await window.pdfproDesktop.getAppVersion() : '';
          localStorage.setItem('__smoke', 'ok');
          c.localStorage = localStorage.getItem('__smoke') === 'ok';
          try { c.workerFetch = (await fetch('vendor/pdfjs/pdf.worker.min.js')).ok; } catch (e) { c.workerFetch = false; }
          try { c.ocrLangFetch = (await fetch('vendor/tesseract/lang/spa.traineddata.gz')).ok; } catch (e) { c.ocrLangFetch = false; }
          try { c.fontFetch = (await fetch('vendor/fontsource/arimo-latin-400-normal.woff')).ok; } catch (e) { c.fontFetch = false; }
          try { c.cssFonts = (await fetch('vendor/fonts/fonts.css')).ok; } catch (e) { c.cssFonts = false; }
          return c;
        })()`);
        results.url = w.webContents.getURL();
        try {
          const img = await w.webContents.capturePage();
          fs.mkdirSync('/tmp/smoke', { recursive: true });
          fs.writeFileSync('/tmp/smoke/shot.png', img.toPNG());
          results.screenshot = '/tmp/smoke/shot.png';
        } catch (e) { /* noop */ }
        clearTimeout(timeout);
        console.log('SMOKE_RESULT ' + JSON.stringify(results));
        app.exit(results.consoleErrors.length ? 2 : 0);
      } catch (e) {
        console.log('SMOKE_ERROR ' + String(e));
        app.exit(4);
      }
    }, 6000);
  });
}
