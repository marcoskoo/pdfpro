/* PDFPro — PDF Editor Pro (CORPAC AIS/ARO SPHI) · versión de escritorio
 * Proceso principal de Electron.
 * Características:
 *  - Protocolo seguro propio app:// (los recursos y workers cargan locales)
 *  - Menú nativo en español (Abrir, Imprimir, Zoom, Pantalla completa…)
 *  - Instancia única + "Abrir con" de Windows para .pdf/.docx/.xlsx…
 *  - OAuth de Google Drive en ventana nativa (captura el code del redirect)
 *  - v3.0.0 — Monitoreo Gmail (sphiaisaro@gmail.com): OAuth propio + sondeo
 *    de correos con adjunto para capturar la hora de recepción
 *  - Enlaces externos en el navegador del sistema
 *  - Aviso de descargas completadas al renderer
 */
const { app, BrowserWindow, Menu, ipcMain, shell, dialog, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const fpl = require('./fpl-registro');
const gmail = require('./gmail-monitor');
/* v3.1.9 — hora de recepción por archivo cargado (Gmail asistido con
 * Playwright; perfil de Chrome persistente, sin OAuth) */
const GmailHoraService = require('./gmail-hora/GmailHoraService');
const { parseHoraGmail } = require('./gmail-hora/hora');

const APP_DIR = path.join(__dirname, 'app');
const IS_DEV = !app.isPackaged;
const IS_SMOKE = process.argv.includes('--smoke');
const OPEN_EXTS = ['.pdf', '.xlsx', '.xlsm', '.xls', '.csv', '.docx', '.doc',
  '.jpg', '.jpeg', '.jfif', '.png', '.gif', '.bmp', '.webp', '.avif', '.ico', '.svg'];
const OAUTH_REDIRECT = 'https://propdf-editor.netlify.app';
/* v3.0.0 — redirect del OAuth de Gmail (la página desplegada en Vercel
   muestra el código para pegarlo en la app si la ventana nativa no logra
   capturar el redirect) */
const GMAIL_REDIRECT = gmail.REDIRECT_URI;

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

/* ── Registro FPL (v2.9.13) ──
   Las exportaciones se archivan con nombre «MATRÍCULA INICIALES» (lo compone
   el renderer con la matrícula y las iniciales del operador) en
   <Escritorio>\REGISTROS FPL NOTAM\FPL\<año>\<MM Mes>\<DD> con la fecha de
   Lima (UTC-5). Las carpetas se crean solas: al archivar y también al
   arrancar la app (carpeta del día), de modo que el nuevo día/mes/año
   existe desde el primer momento. Se desactiva con la casilla del menú. */
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

/* ── v3.0.0 — MONITOREO GMAIL (sphiaisaro@gmail.com) ──
   IPC del panel «Correo» del editor:
     gmail:estado     → {conectado, cuenta, redirectUri}
     gmail:conectar   → abre la ventana nativa de consentimiento de Google,
                        intercambia el código y guarda los tokens
     gmail:codigo     → pegado manual del código (respaldo si la ventana no
                        captura el redirect)
     gmail:desconectar→ borra los tokens guardados
     gmail:barrer     → barrido manual: correos con adjunto + hora recepción
     gmail:perfil     → valida la cuenta conectada
   El sondeo automático lo dispara el renderer cada 5 min (gmail:barrer). */
ipcMain.handle('gmail:estado', () => {
  const t = gmail.loadTokens(app.getPath('userData'));
  return {
    conectado: !!(t && t.access_token),
    cuenta: gmail.ACCOUNT,
    redirectUri: gmail.REDIRECT_URI
  };
});

/* v3.1.2 — clientId público de Gmail para la capa web embebida (no es secreto:
   el mismo clientId viaja en las URLs de consentimiento del navegador). */
ipcMain.handle('gmail:clientId', () => gmail.CLIENT_ID || '');

ipcMain.handle('gmail:conectar', async () => {
  const state = Math.random().toString(36).slice(2);
  const authUrl = gmail.consentUrl(state);
  // La ventana de OAuth nativa captura redirects a GMAIL_REDIRECT
  const res = await new Promise((resolve) => {
    const child = new BrowserWindow({
      width: 520, height: 700, show: false,
      title: 'Conectar Gmail — ' + gmail.ACCOUNT,
      autoHideMenuBar: true, backgroundColor: '#ffffff',
      parent: win || undefined,
      webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
    });
    let settled = false;
    const finish = (r) => {
      if (settled) return;
      settled = true;
      try { if (!child.isDestroyed()) child.close(); } catch (e) { /* noop */ }
      resolve(r);
    };
    const check = (u) => {
      try {
        if (u && (u.startsWith(gmail.REDIRECT_URI) || u.startsWith(GMAIL_REDIRECT)) && u.includes('code=')) {
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
    const t = setTimeout(() => finish({ error: 'timeout' }), 5 * 60 * 1000);
    child.once('closed', () => clearTimeout(t));
  });
  if (!res || res.error) {
    return { ok: false, error: (res && res.error) || 'cancelado' };
  }
  try {
    const tokens = await gmail.exchangeCode(res.code);
    gmail.saveTokens(app.getPath('userData'), {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: String(Date.now() + (parseInt(tokens.expires_in || '3600', 10) - 60) * 1000),
      cuenta: gmail.ACCOUNT,
      conectado_en: new Date().toISOString()
    });
    return { ok: true, cuenta: gmail.ACCOUNT };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('gmail:codigo', async (_e, code) => {
  try {
    const tokens = await gmail.exchangeCode(code);
    gmail.saveTokens(app.getPath('userData'), {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: String(Date.now() + (parseInt(tokens.expires_in || '3600', 10) - 60) * 1000),
      cuenta: gmail.ACCOUNT,
      conectado_en: new Date().toISOString()
    });
    return { ok: true, cuenta: gmail.ACCOUNT };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('gmail:desconectar', () => {
  try { fs.unlinkSync(path.join(app.getPath('userData'), 'gmail-tokens.json')); } catch (e) { /* no existía */ }
  return { ok: true };
});

ipcMain.handle('gmail:barrer', async (_e, query, maxResults) => {
  try {
    const mensajes = await gmail.poll(app.getPath('userData'), query, maxResults);
    return { ok: true, mensajes };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('gmail:perfil', async () => {
  try {
    const p = await gmail.profile(app.getPath('userData'));
    return { ok: true, emailAddress: p.emailAddress || '' };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

/* ── v3.2.1 — HORA DE RECEPCIÓN POR ARCHIVO CARGADO (Gmail asistido) ──
   Alternativa al OAuth (funciona sin credenciales): Playwright abre Gmail
   de forma INVISIBLE con un perfil de Chrome persistente y busca el correo
   por el nombre del archivo adjunto del documento cargado (100% automático
   al cargar; sin botón).
     gmail-hora:estado  → {ok, disponible} (¿está Playwright instalado?)
     gmail-hora:buscar → {ok, horaRecepcion, recibidoMs (epoch, zona Lima),
                          recibidoUTC, fuente, asunto, remitente, …}
   LOGIN DENTRO DE LA APP: si Gmail pide sesión, se abre una ventana HIJA de
   la propia app con mail.google.com (partición persistente), el usuario
   inicia sesión ahí, se cosechan las cookies de google.com y se transfieren
   al navegador invisible; luego se reintenta la búsqueda (hasta 2 rondas:
   Google rota algunas cookies y una segunda cosecha puede completar la
   transferencia). La ventana de login se cierra sola al terminar.
   TODO el flujo queda anotado en <userData>/gmail-hora.log (en Windows:
   %APPDATA%\PDFPro\gmail-hora.log) para diagnosticar a distancia.
   El progreso llega por el evento 'gmail-hora:evento' {msg, tipo}
   (tipo 'login' = ventana de inicio de sesión abierta). */
let _gmailHoraSvc = null;
let _gmailHoraLoginWin = null;
let _gmailHoraLoginPromesa = null;               // login en curso (llamadas concurrentes comparten)
let _gmailHoraCadena = Promise.resolve();      // una búsqueda a la vez
let _gmailHoraUltimoFalloLogin = 0;            // cooldown tras cancelar login

/* Registro de diagnóstico del flujo completo (con rotación a .old). */
function gmailHoraLog(msg) {
  try {
    const fsX = require('fs');
    const f = path.join(app.getPath('userData'), 'gmail-hora.log');
    try {
      if (fsX.statSync(f).size > 512 * 1024) fsX.renameSync(f, f + '.old');
    } catch (e) { /* aún no existe */ }
    const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
    fsX.appendFileSync(f, `[${ts}] ${msg}\n`);
  } catch (e) { /* registro best-effort */ }
}
function gmailHoraEvento(msg, tipo) {
  gmailHoraLog((tipo === 'login' ? '[login] ' : '') + msg);
  try {
    if (win && !win.isDestroyed()) win.webContents.send('gmail-hora:evento', { msg, tipo: tipo || 'info' });
  } catch (e) { /* ventana cerrada */ }
}

/** Abre Gmail DENTRO de la app para iniciar sesión (ventana hija, sesión
    propia persistente 'gmail-login'). Resuelve con las cookies de
    google.com cuando el correo queda abierto (y cierra la ventana sola);
    null si se cancela o agota el tiempo.
    v3.2.3: (1) la ventana usa un User-Agent de Chrome REAL (sin los
    tokens «Electron/…» ni «PDFPro/…») fijado en la partición y en el
    webContents ANTES de cargar — Google BLOQUEA el inicio de sesión en
    navegadores embebidos con UA de Electron («Este navegador o
    aplicación podría no ser seguro»), causa raíz de los login que nunca
    completan desde v3.2.0; (2) una llamada concurrente espera la MISMA
    promesa (antes se resolvía null = «cancelado» y el reintento
    inmediato fallaba); (3) la ventana toma el foco al mostrarse. */
function abrirLoginGmailEnApp() {
  if (_gmailHoraLoginPromesa) return _gmailHoraLoginPromesa;
  _gmailHoraLoginPromesa = new Promise((resolve) => {
    const { session: ses } = require('electron');
    const particion = ses.fromPartition('persist:gmail-login');
    /* UA de Chrome real: fuera «Electron/x.y» y «PDFPro/x.y» (Google
       bloquea los embebidos); antes de loadURL para que valga también en
       las redirecciones de accounts.google.com */
    const uaChrome = particion.getUserAgent()
      .split(' ')
      .filter((t) => !/^(electron|pdfpro|pdfpro-suite)\/[\d.]+$/i.test(t))
      .join(' ');
    particion.setUserAgent(uaChrome);
    _gmailHoraLoginWin = new BrowserWindow({
      width: 1100, height: 780, show: false,
      title: 'Iniciar sesión en Gmail — PDFPro (una sola vez)',
      autoHideMenuBar: true, backgroundColor: '#ffffff',
      parent: win || undefined,
      webPreferences: {
        contextIsolation: true, nodeIntegration: false, sandbox: true,
        partition: 'persist:gmail-login'
      }
    });
    _gmailHoraLoginWin.webContents.setUserAgent(uaChrome);
    let resuelto = false;
    const finalizar = async (ok, motivo) => {
      if (resuelto) return;
      resuelto = true;
      clearInterval(poll);
      clearTimeout(limite);
      const salir = (v) => { _gmailHoraLoginPromesa = null; resolve(v); };
      if (!ok) {
        gmailHoraLog(`login no completado (${motivo || 'ventana cerrada'})`);
        salir(null);
        return;
      }
      try {
        /* cosecha las cookies de la sesión con la que se inició sesión */
        const todas = await particion.cookies.getAll({});
        const cookies = todas.filter((c) => {
          const dom = String(c.domain || '').replace(/^\./, '');
          return /(^|\.)google\.com$/.test(dom);
        });
        gmailHoraLog(`login completo: ${cookies.length} cookies de google.com cosechadas`);
        salir(cookies);
      } catch (e) {
        gmailHoraLog('error cosechando cookies: ' + e.message);
        salir(null);
      }
      /* la ventana ya cumplió su misión: se cierra sola */
      try { if (!_gmailHoraLoginWin.isDestroyed()) _gmailHoraLoginWin.close(); } catch (e) { /* noop */ }
    };
    /* ¿ya con sesión? mail.google.com carga directo; si redirige a
       accounts.google.com hay que iniciar sesión (URL vuelve a mail… al
       terminar). Se sondea la URL: robusto y sin tocar la página. */
    const enGmail = () => {
      try {
        const u = _gmailHoraLoginWin.webContents.getURL();
        return /^https:\/\/mail\.google\.com\//.test(u);
      } catch (e) { return false; }
    };
    const poll = setInterval(() => {
      if (!_gmailHoraLoginWin || _gmailHoraLoginWin.isDestroyed()) return;
      if (enGmail()) {
        /* pequeño margen para que se asienten las cookies de la sesión */
        setTimeout(() => finalizar(true), 1500);
      }
    }, 1000);
    const limite = setTimeout(() => finalizar(false, 'tiempo agotado (5 min)'), 5 * 60 * 1000);
    _gmailHoraLoginWin.on('closed', () => { _gmailHoraLoginWin = null; finalizar(false); });
    _gmailHoraLoginWin.once('ready-to-show', () => { _gmailHoraLoginWin.show(); _gmailHoraLoginWin.focus(); });
    _gmailHoraLoginWin.loadURL('https://mail.google.com/').catch(() => finalizar(false, 'no se pudo cargar Gmail'));
  });
}

ipcMain.handle('gmail-hora:estado', () => {
  const d = GmailHoraService.disponible();
  return { ok: true, disponible: !!d.playwright };
});
/* las cargas rápidas de archivos se encolan: una búsqueda a la vez sobre
   el mismo navegador invisible (evita carreras sobre la misma página).
   v3.2.3: «manual=true» (botón «Iniciar sesión en Gmail») salta el
   cooldown de 30 s tras un login cancelado — el usuario lo pidió
   expresamente, no es un rebote automático. */
ipcMain.handle('gmail-hora:buscar', (_e, archivo, manual) => {
  const tarea = _gmailHoraCadena.then(() => _gmailHoraBuscar(String(archivo || '').trim(), !!manual));
  _gmailHoraCadena = tarea.then(() => undefined, () => undefined);
  return tarea;
});
async function _gmailHoraBuscar(nombre, manual) {
  try {
    if (!nombre) return { ok: false, error: 'No hay archivo cargado', tipo: 'SinArchivo' };
    if (!GmailHoraService.disponible().playwright) {
      return { ok: false, error: 'Playwright no está instalado en la app (npm i playwright)', tipo: 'PlaywrightFalta' };
    }
    if (!_gmailHoraSvc) {
      _gmailHoraSvc = new GmailHoraService({
        userDataDir: path.join(app.getPath('userData'), 'gmail-playwright-profile'),
        headless: true,
        onProgress: (m) => gmailHoraEvento(m),
        onLoginRequired: (m) => gmailHoraEvento(m, 'login')
      });
    }
    gmailHoraLog(`buscar «${nombre}»`);
    try {
      await _gmailHoraSvc.iniciar();
    } catch (e) { gmailHoraLog('aviso al iniciar navegador: ' + e.message); }

    let r = null;
    try {
      r = await _gmailHoraSvc.buscarHoraPorArchivo(nombre, { copiar: false });
    } catch (e) {
      if (e.name !== 'LoginRequeridoError') throw e;
      /* Gmail pide sesión → login DENTRO de la app + transferir cookies.
         Hasta 2 rondas: si tras inyectar sigue pidiendo sesión se
         re-cosechan las cookies (Google las rota) y se reintenta. */
      for (let ronda = 1; ronda <= 2 && !r; ronda++) {
        if (!manual && Date.now() - _gmailHoraUltimoFalloLogin < 30000) {
          gmailHoraLog('login omitido: se canceló hace menos de 30 s');
          return { ok: false, error: 'Inicio de sesión en Gmail cancelado hace un momento', tipo: 'LoginCancelado' };
        }
        gmailHoraLog(`ronda ${ronda}: Gmail pide sesión (URL: ${_gmailHoraSvc.urlActual()})`);
        gmailHoraEvento('Gmail pide iniciar sesión: se abrió Gmail dentro de la app — inicie sesión (solo la primera vez)…', 'login');
        const cookies = await abrirLoginGmailEnApp();
        if (!cookies || !cookies.length) {
          _gmailHoraUltimoFalloLogin = Date.now();
          return { ok: false, error: 'No se completó el inicio de sesión en Gmail', tipo: 'LoginCancelado' };
        }
        const inj = await _gmailHoraSvc.inyectarCookies(cookies);
        gmailHoraLog(`cookies: ${inj.total} cosechadas, ${inj.ok} inyectadas${inj.fallos.length ? ' · fallos: ' + inj.fallos.join(' | ') : ''}`);
        gmailHoraEvento(`Sesión transferida (${inj.ok} cookies); buscando de nuevo…`);
        try {
          r = await _gmailHoraSvc.buscarHoraPorArchivo(nombre, { copiar: false });
        } catch (e2) {
          if (e2.name !== 'LoginRequeridoError') throw e2;
          gmailHoraLog(`ronda ${ronda}: sigue pidiendo sesión (URL: ${_gmailHoraSvc.urlActual()})`);
        }
      }
      if (!r) {
        return { ok: false, error: 'La sesión de Gmail no se pudo transferir al buscador invisible', tipo: 'SesionNoTransferida' };
      }
    }

    /* la hora llega como texto de visualización de Gmail (zona de la
       cuenta, por defecto Lima UTC−5): se convierte a epoch/UTC */
    const ms = parseHoraGmail(r.horaRecepcion);
    gmailHoraLog(`hora «${r.horaRecepcion}» (fuente: ${r.fuente}) → ${ms ? new Date(ms).toISOString() : 'NO INTERPRETADA (revisar formato)'}`);
    return {
      ok: true,
      archivo: nombre,
      asunto: r.asunto,
      remitente: r.remitente,
      remitenteCorreo: r.remitenteCorreo,
      archivoAdjunto: r.archivoAdjunto,
      horaRecepcion: r.horaRecepcion,
      fuente: r.fuente,
      recibidoMs: ms || 0,
      recibidoUTC: ms ? new Date(ms).toISOString() : ''
    };
  } catch (e) {
    gmailHoraLog(`ERROR ${e.name || 'Error'}: ${e.message}`);
    return { ok: false, error: e.message, tipo: e.name || 'Error' };
  }
}
/* cierra el navegador asistido al salir de la app (la sesión persiste) */
app.on('before-quit', () => {
  if (_gmailHoraSvc) { try { _gmailHoraSvc.cerrar(true); } catch (e) { /* noop */ } }
  if (_gmailHoraLoginWin && !_gmailHoraLoginWin.isDestroyed()) { try { _gmailHoraLoginWin.close(); } catch (e) { /* noop */ } }
});

/* ── v3.1.0 — VERIFICACIÓN DE LICENCIAS DGAC (SIVLAM) ──
   Ventana asistida: el usuario resuelve el captcha del registro una sola vez;
   el motor llena la búsqueda, abre el detalle y extrae los datos. */
const sivlam = require('./sivlam');
ipcMain.handle('sivlam:verificar', async (_e, opts) => {
  try {
    return await sivlam.verificarLicencia(() => {
      const child = new BrowserWindow({
        width: 1000, height: 760, show: true,
        title: 'Verificar licencia — DGAC (SIVLAM)',
        autoHideMenuBar: true, backgroundColor: '#ffffff',
        parent: win || undefined,
        webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
      });
      child.webContents.setWindowOpenHandler(({ url }) => {
        if (!url || url === 'about:blank') return { action: 'allow' };
        shell.openExternal(url).catch(() => {});
        return { action: 'deny' };
      });
      return child;
    }, {
      tipo: opts && opts.tipo,
      numero: opts && opts.numero,
      onStatus: (msg) => {
        try { if (win && !win.isDestroyed()) win.webContents.send('sivlam:status', msg); } catch (e) { /* noop */ }
      }
    });
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  }
});

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
          try { c.ocrLangFetch = (await fetch('vendor/tesseract/langs/spa.traineddata.gz')).ok; } catch (e) { c.ocrLangFetch = false; }
          try { c.fontFetch = (await fetch('vendor/fontsource/arimo-latin-400-normal.woff')).ok; } catch (e) { c.fontFetch = false; }
          try { c.cssFonts = (await fetch('vendor/fonts/fonts.css')).ok; } catch (e) { c.cssFonts = false; }
          try {
            const fr = await window.pdfproDesktop.guardarRegistroFPL('SMOKE OB2147 MK.pdf', new Uint8Array([37,80,68,70]));
            c.fplSave = !!(fr && fr.ok);
            c.fplRuta = fr ? String(fr.ruta || '') : '';
          } catch (e) { c.fplSave = false; c.fplRuta = ''; }
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
