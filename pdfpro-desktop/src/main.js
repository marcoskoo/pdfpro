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
const fpl = require('./fpl-registro');

const APP_DIR = path.join(__dirname, 'app');
const IS_DEV = !app.isPackaged;
const IS_SMOKE = process.argv.includes('--smoke');
const OPEN_EXTS = ['.pdf', '.xlsx', '.xlsm', '.xls', '.csv', '.docx', '.doc',
  '.jpg', '.jpeg', '.jfif', '.png', '.gif', '.bmp', '.webp', '.avif', '.ico', '.svg'];
const OAUTH_REDIRECT = 'https://propdf-editor.netlify.app';

/* Identidad de la app en Windows (agrupa notificaciones y accesos directos) */
app.setAppUserModelId('pe.gob.corpac.pdfpro');

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

  // v2.9.12 — ofrecer (una vez) establecer PDFPro como aplicación predeterminada
  setTimeout(maybeOfferDefaultApps, 3500);

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
                { name: 'Documentos e imágenes compatibles', extensions: ['pdf', 'xlsx', 'xlsm', 'xls', 'csv', 'docx', 'doc', 'jpg', 'jpeg', 'jfif', 'png', 'gif', 'bmp', 'webp', 'avif', 'ico', 'svg'] },
                { name: 'Documentos PDF', extensions: ['pdf'] },
                { name: 'Excel', extensions: ['xlsx', 'xlsm', 'xls', 'csv'] },
                { name: 'Word', extensions: ['docx', 'doc'] },
                { name: 'Imágenes', extensions: ['jpg', 'jpeg', 'jfif', 'png', 'gif', 'bmp', 'webp', 'avif', 'ico', 'svg'] },
                { name: 'Todos los archivos', extensions: ['*'] }
              ]
            });
            if (r.canceled) return;
            r.filePaths.forEach(sendOpenFile);
          }
        },
        { type: 'separator' },
        {
          label: 'Guardar exportaciones en la carpeta FPL',
          type: 'checkbox',
          checked: readSetting('guardarEnFPL') !== false,
          click: (item) => writeSetting('guardarEnFPL', item.checked)
        },
        {
          label: 'Abrir carpeta de registro FPL…',
          click: () => {
            try { fs.mkdirSync(carpetaRegistroFPL(), { recursive: true }); } catch (e) { /* noop */ }
            shell.openPath(carpetaRegistroFPL()).catch(() => {});
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
          label: 'Buscar actualizaciones…',
          click: () => buscarActualizaciones(true)
        },
        { type: 'separator' },
        {
          label: 'Hacer de PDFPro la aplicación predeterminada…',
          click: () => {
            dialog.showMessageBox(win, {
              type: 'info',
              title: 'Aplicación predeterminada',
              message: 'Se abrirá la configuración de Windows «Aplicaciones predeterminadas».',
              detail: 'Elige PDFPro en la lista y marca los formatos que quieres que abra:\n' +
                'PDF, Word (.docx/.doc), Excel (.xlsx/.xls/.csv) e imágenes (JPG, PNG, GIF, BMP, WebP…).\n\n' +
                'Nota: Windows 10/11 exige confirmar los valores predeterminados en esta\n' +
                'pantalla; ninguna aplicación puede cambiarlos por su cuenta.',
              buttons: ['Abrir configuración', 'Cancelar'],
              defaultId: 0,
              cancelId: 1,
              noLink: true
            }).then(({ response }) => {
              if (response === 0) openDefaultAppsSettings();
            }).catch(() => {});
          }
        },
        { type: 'separator' },
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

/* ── «Aplicación predeterminada» (v2.9.12) ──
   Windows 10/11 no permite que un programa se ponga como
   predeterminado por su cuenta: el usuario debe confirmarlo en la
   configuración del sistema. La app lo ofrece una vez (tras el primer
   arranque) y deja la opción siempre disponible en el menú Ayuda.
   Con el instalador, PDFPro queda registrado para esos formatos y
   Windows lo ofrece en «¿Cómo quieres abrir este archivo?» y en
   «Abrir con → Elegir otra aplicación». */
function settingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}
function readSetting(key) {
  try {
    return JSON.parse(fs.readFileSync(settingsPath(), 'utf8'))[key];
  } catch (e) {
    return undefined;
  }
}
function writeSetting(key, val) {
  try {
    let data = {};
    try { data = JSON.parse(fs.readFileSync(settingsPath(), 'utf8')) || {}; } catch (e) { /* nuevo */ }
    data[key] = val;
    fs.writeFileSync(settingsPath(), JSON.stringify(data, null, 2));
  } catch (e) { /* sin permisos: solo deja de persistir la oferta */ }
}
function openDefaultAppsSettings() {
  shell.openExternal('ms-settings:defaultapps').catch(() => {});
  writeSetting('defaultAppsOffer', 'done');
}
function maybeOfferDefaultApps() {
  if (IS_SMOKE) return;
  const st = readSetting('defaultAppsOffer');
  if (st === 'done' || st === 'never') return;
  if (!win || win.isDestroyed()) return;
  dialog.showMessageBox(win, {
    type: 'question',
    title: 'PDFPro como aplicación predeterminada',
    message: '¿Quieres que PDFPro sea la aplicación predeterminada para tus documentos e imágenes?',
    detail: 'PDFPro puede abrir y editar PDF, Word (.docx/.doc), Excel (.xlsx/.xls/.csv) e imágenes (JPG, PNG, GIF, BMP, WebP…).\n\n' +
      'Al continuar se abre la configuración de Windows «Aplicaciones predeterminadas»:\n' +
      'elige PDFPro y marca los formatos que quieras. También podrás hacerlo\n' +
      'en cualquier momento desde el menú Ayuda.',
    buttons: ['Hacer predeterminada', 'Ahora no', 'No volver a preguntar'],
    defaultId: 0,
    cancelId: 1,
    noLink: true
  }).then(({ response }) => {
    if (response === 0) openDefaultAppsSettings();
    else if (response === 2) writeSetting('defaultAppsOffer', 'never');
    /* «Ahora no» → se volverá a ofrecer en el siguiente arranque */
  }).catch(() => {});
}

/* ── Registro FPL (v2.9.13 · fecha UTC desde v2.9.14) ──
   Las exportaciones se archivan con nombre «MATRÍCULA INICIALES» (lo compone
   el renderer con la matrícula y las iniciales del operador) en
   <Escritorio>\REGISTROS FPL NOTAM\FPL\<año>\<MM Mes>\<DD> con la fecha
   UTC (hora zulú de aviación, la misma del sello de recepción). Las
   carpetas se crean solas: al archivar y también al arrancar la app
   (carpeta del día), de modo que el nuevo día/mes/año existe desde el
   primer momento. Se desactiva con la casilla del menú. */
function carpetaRegistroFPL() {
  return fpl.carpetaDia(path.join(app.getPath('desktop'), 'REGISTROS FPL NOTAM', 'FPL'));
}
ipcMain.handle('fpl:guardar', (_e, nombre, buffer) => {
  try {
    if (readSetting('guardarEnFPL') === false) return { ok: false, omitido: true };
    const dir = carpetaRegistroFPL();
    fs.mkdirSync(dir, { recursive: true });
    const ruta = fpl.rutaUnica(dir, fpl.saneaNombre(nombre));
    fs.writeFileSync(ruta, Buffer.from(buffer || new Uint8Array()));
    return { ok: true, ruta };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

/* ── Auto-actualización (v2.9.14) ──
   La versión INSTALADA se actualiza sola: al arrancar (y cada 4 horas)
   consulta el último release de GitHub; si hay versión nueva, avisa, la
   descarga e instala al confirmar. Ajustes, sesión y carpeta de registro
   FPL se conservan. La PORTABLE no puede reemplazarse a sí misma
   (limitación técnica): avisa y abre la página de descargas. No actúa en
   desarrollo ni en el smoke. */
let autoUpdater = null;
try { autoUpdater = require('electron-updater').autoUpdater; } catch (e) { /* no disponible */ }
const esPortable = !!process.env.PORTABLE_EXECUTABLE_DIR;
let updateOmitida = false;        // el usuario ya la rechazó en esta sesión
let updateChequeoManual = false;  // venimos del menú «Buscar actualizaciones…»

function versionMayor(a, b) {
  const pa = String(a).replace(/^v/, '').split('.').map(Number);
  const pb = String(b).replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return true;
    if ((pa[i] || 0) < (pb[i] || 0)) return false;
  }
  return false;
}

async function avisoActualizacionWeb() { // portable / desarrollo: avisar y abrir
  try {
    const r = await fetch('https://api.github.com/repos/marcoskoo/pdfpro/releases/latest', {
      headers: { 'User-Agent': 'PDFPro' }
    });
    if (!r.ok) throw new Error('GitHub ' + r.status);
    const rel = await r.json();
    const remota = String(rel.tag_name || '').replace(/^v/, '');
    if (versionMayor(remota, app.getVersion())) {
      const { response } = await dialog.showMessageBox(win, {
        type: 'info',
        title: 'Actualización disponible',
        message: 'Hay una nueva versión de PDFPro: ' + remota,
        detail: 'La versión actual es ' + app.getVersion() + '.\n\n' +
          'La versión portable no puede actualizarse sola: se abrirá la página\n' +
          'de descargas para que bajes el nuevo ejecutable (tus ajustes no cambian).',
        buttons: ['Descargar', 'Ahora no'],
        defaultId: 0, cancelId: 1, noLink: true
      });
      if (response === 0) shell.openExternal(rel.html_url).catch(() => {});
    } else {
      dialog.showMessageBox(win, {
        type: 'info', title: 'Sin actualizaciones',
        message: 'PDFPro ' + app.getVersion() + ' está al día.',
        buttons: ['Aceptar']
      }).catch(() => {});
    }
  } catch (e) {
    dialog.showErrorBox('PDFPro', 'No se pudo comprobar actualizaciones:\n' + e.message);
  }
}

function buscarActualizaciones(manual) {
  if (!win || win.isDestroyed()) return;
  if (!app.isPackaged || esPortable || !autoUpdater) { avisoActualizacionWeb(); return; }
  updateChequeoManual = !!manual;
  autoUpdater.checkForUpdates().catch((e) => {
    if (manual) dialog.showErrorBox('PDFPro', 'No se pudo comprobar actualizaciones:\n' + e.message);
  });
}

function iniciarAutoActualizacion() {
  if (IS_SMOKE || !autoUpdater || esPortable || !app.isPackaged) return;
  try {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on('update-available', (info) => {
      if (!win || win.isDestroyed()) return;
      if (updateOmitida && !updateChequeoManual) return; // no insistir
      dialog.showMessageBox(win, {
        type: 'info',
        title: 'Actualización disponible',
        message: 'Hay una nueva versión de PDFPro: ' + (info.version || ''),
        detail: 'La versión actual es ' + app.getVersion() + '.\n\n' +
          'Se descargará en segundo plano y te avisaremos cuando esté lista.\n' +
          'Tus ajustes, sesión y carpeta de registro FPL se conservan.',
        buttons: ['Descargar e instalar', 'Ahora no'],
        defaultId: 0, cancelId: 1, noLink: true
      }).then(({ response }) => {
        updateChequeoManual = false;
        if (response === 0) autoUpdater.downloadUpdate().catch(() => {});
        else updateOmitida = true;
      }).catch(() => {});
    });
    autoUpdater.on('update-not-available', () => {
      if (!updateChequeoManual) return;
      updateChequeoManual = false;
      dialog.showMessageBox(win, {
        type: 'info', title: 'Sin actualizaciones',
        message: 'PDFPro ' + app.getVersion() + ' está al día.',
        buttons: ['Aceptar']
      }).catch(() => {});
    });
    autoUpdater.on('download-progress', (p) => {
      try {
        if (win && !win.isDestroyed()) win.setTitle('PDFPro — Descargando actualización… ' + Math.round(p.percent) + ' %');
      } catch (e) { /* noop */ }
    });
    autoUpdater.on('update-downloaded', () => {
      try {
        if (win && !win.isDestroyed()) win.setTitle('PDFPro');
      } catch (e) { /* noop */ }
      dialog.showMessageBox(win, {
        type: 'info',
        title: 'Actualización lista',
        message: 'La nueva versión se ha descargado.',
        detail: 'PDFPro se cerrará y se actualizará ahora mismo.\nTarda menos de un minuto.',
        buttons: ['Reiniciar e instalar', 'Instalar al salir'],
        defaultId: 0, cancelId: 1, noLink: true
      }).then(({ response }) => {
        if (response === 0) autoUpdater.quitAndInstall(false, true);
      }).catch(() => {});
    });
    autoUpdater.on('error', () => { /* silencioso: no molestar */ });
    autoUpdater.checkForUpdates().catch(() => {});
    setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 4 * 60 * 60 * 1000);
  } catch (e) { /* sin app-update.yml u offline: sin auto-actualización */ }
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

    // v2.9.13 — crear ya la carpeta del registro FPL de hoy (nuevo día/mes/año)
    try { fs.mkdirSync(carpetaRegistroFPL(), { recursive: true }); } catch (e) { /* sin permisos */ }

    // v2.9.14 — auto-actualización (versión instalada)
    iniciarAutoActualizacion();

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
          try {
            const fr = await window.pdfproDesktop.guardarRegistroFPL('SMOKE OB2147 MK.pdf', new Uint8Array([37,80,68,70]));
            c.fplSave = !!(fr && fr.ok);
            c.fplRuta = fr ? String(fr.ruta || '') : '';
          } catch (e) { c.fplSave = false; c.fplRuta = ''; }
          // v2.9.15 — escáner de matrícula (fpl-scan.js) cargado y funcionando
          c.fplScanLib = !!(window.FPLScan && FPLScan.extraerMatricula &&
            FPLScan.extraerMatricula('(FPL-FAP211-IS -18/REG/OB1630 DOF/261114').matricula === 'OB1630');
          c.fplScanCasillero7 = !!(window.FPLScan &&
            FPLScan.extraerMatricula('(FPL-OB1630-IS -N0450F180 DCT').matricula === 'OB1630');
          return c;
        })()`);
        if (results.checks.fplRuta) {
          try { results.checks.fplArchivoExiste = fs.existsSync(results.checks.fplRuta); } catch (e) { /* noop */ }
        }
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
