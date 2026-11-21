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
  /* v3.2.21 — este instalador no incluye las credenciales OAuth del
     monitor (src/gmail-credentials.json no viaja en el build): abrir el
     consentimiento con el client_id VACÍO solo producía el «Error 400:
     invalid_request — Missing required parameter: client_id» de Google
     (captura del usuario). Ahora se responde con un error claro y SIN
     abrir ventana alguna. La búsqueda de la hora NO necesita este flujo:
     usa la sesión de Gmail directamente (cargando el PDF). */
  if (!gmail.CLIENT_ID || !gmail.CLIENT_SECRET) {
    gmailHoraLog('gmail:conectar rechazado: build sin credenciales OAuth del monitor (client_id vacío) — la búsqueda de la hora no las necesita');
    return { error: 'sin-credenciales' };
  }
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

/* v3.2.14 — el ORDEN del usuario: recorre los correos recibidos del más
   nuevo al más viejo comparando el nombre de cada adjunto con el del
   archivo cargado; el primer match entrega su hora (corta ahí). */
ipcMain.handle('gmail:buscar-por-adjunto', async (_e, archivo, maxResults) => {
  try {
    const mensaje = await gmail.pollOrdenado(app.getPath('userData'), String(archivo || '').trim(), maxResults || 50);
    return { ok: true, mensaje };
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
let _gmailHoraLoginCancelado = false;          // v3.2.15: candado por sesión — tras UN login cancelado, las búsquedas automáticas no vuelven a abrir la ventana (solo el botón «🔗 Iniciar sesión en Gmail»)

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
  gmailProgresoLinea(msg, tipo);
}

/* ── v3.2.17 — VENTANA DE PROGRESO de la búsqueda de la hora ──
   Ventana PEQUEÑA, independiente y minimizable que muestra EN TEXTO los
   pasos que va ejecutando la búsqueda: navegador, login, cookies, cada
   consulta a Gmail, el recorrido de la bandeja CORREO POR CORREO y el
   resultado final. Antes los pasos solo llegaban como toasts que
   desaparecen a los pocos segundos y la búsqueda parecía quedarse quieta
   («carga Gmail y no hace nada más»). Minimizarla o cerrarla NO cancela
   la búsqueda: es solo un visor (el historial completo se reenvía al
   volver a abrirla con la siguiente búsqueda). */
let _gmailProgresoWin = null;
let _gmailProgresoLista = [];            /* {ms, msg, tipo, archivo?} */
let _gmailProgresoArchivo = '';
const _GMAIL_PROGRESO_MAX = 400;

function gmailProgresoEnviar() {
  try {
    if (_gmailProgresoWin && !_gmailProgresoWin.isDestroyed() && _gmailProgresoWin.webContents) {
      _gmailProgresoWin.webContents.send('gmail-hora:progreso', _gmailProgresoLista);
    }
  } catch (e) { /* ventana cerrándose */ }
}

/* Añade una línea al historial y la envía a la ventana (si está abierta). */
function gmailProgresoLinea(msg, tipo, archivo) {
  _gmailProgresoLista.push({
    ms: Date.now(), msg: String(msg || ''),
    tipo: tipo || 'info',
    archivo: archivo || _gmailProgresoArchivo || undefined
  });
  if (_gmailProgresoLista.length > _GMAIL_PROGRESO_MAX) {
    _gmailProgresoLista.splice(0, _gmailProgresoLista.length - _GMAIL_PROGRESO_MAX);
  }
  gmailProgresoEnviar();
}

/* Abre (o reutiliza) la ventana de progreso. showInactive: se muestra sin
   robar el foco de la ventana principal — el usuario puede seguir
   trabajando y minimizarla cuando quiera. */
function gmailProgresoAbrir(archivo) {
  if (archivo) _gmailProgresoArchivo = archivo;
  if (_gmailProgresoWin && !_gmailProgresoWin.isDestroyed()) {
    gmailProgresoEnviar();               /* ya abierta: refresca el historial */
    return;
  }
  _gmailProgresoWin = new BrowserWindow({
    width: 480, height: 360,
    minWidth: 320, minHeight: 200,
    minimizable: true, maximizable: false, resizable: true,
    autoHideMenuBar: true,
    /* v3.2.21 — la versión en el título: cada captura de pantalla del
       usuario delata qué build corre (la captura de las 08:41 mostraba
       el flujo de la v3.2.19 sin la línea «sesión ya activa» de la
       v3.2.20 — imposible saberlo sin este dato) */
    title: 'PDFPro — Progreso Gmail (v' + app.getVersion() + ')',
    backgroundColor: '#15171c',
    show: false,                         /* se muestra al cargar (sin flash blanco) */
    webPreferences: {
      preload: path.join(__dirname, 'preload-progreso.js'),
      contextIsolation: true, nodeIntegration: false
    }
  });
  _gmailProgresoWin.loadFile(path.join(__dirname, 'progreso.html'));
  _gmailProgresoWin.once('ready-to-show', () => {
    try { _gmailProgresoWin.showInactive(); } catch (e) { /* ya cerrada */ }
  });
  _gmailProgresoWin.webContents.on('did-finish-load', gmailProgresoEnviar);
  _gmailProgresoWin.on('closed', () => { _gmailProgresoWin = null; });
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
    inmediato fallaba); (3) la ventana toma el foco al mostrarse.
    v3.2.4: la ventana ya NO se cierra por la URL sola — durante la
    pantalla de carga inicial mail.google.com aparece SIN sesión 1-3 s
    antes del redirect al login: se exige sesión real (cookies
    SID/SAPISID/…) con la navegación terminada, 2 sondeos seguidos. */
/* v3.2.20 — ¿La partición de login ('persist:gmail-correo1') ya tiene una
   sesión de google.com? Devuelve las cookies de google.com si hay
   cookies de SESIÓN (SID/SAPISID/HSID/SSID/APISID), o null si no. Así la
   búsqueda puede transferir la sesión SIN abrir la ventana de login: el
   usuario lo vio en pantalla — la ventana abría con el buzón YA visible
   (sesión válida) y aun así la búsqueda fallaba con «ventana cerrada»,
   porque la sesión nunca se cosechaba: se dependía de que la ventana
   viviera los ~3,5 s que tarda el sondeo en confirmarla.
   v3.2.23 — PARTICIÓN NUEVA ('gmail-correo1', antes 'gmail-login'): en la
   máquina del usuario la ventana interna moría en <2 s EN TODAS las
   versiones mientras las demás ventanas de la app vivían meses — síntoma
   clásico de partición corrompida (GPUCache) que sobrevive a las
   reinstalaciones en %APPDATA%\PDFPro\Partitions; con nombre nuevo se
   arranca con un almacén limpio. */
async function _gmailHoraSesionYaValida() {
  try {
    const { session: ses } = require('electron');
    const particion = ses.fromPartition('persist:gmail-correo1');
    const todas = await particion.cookies.getAll({});
    const deGoogle = todas.filter((c) => {
      const dom = String(c.domain || '').replace(/^\./, '');
      return /(^|\.)google\.com$/.test(dom);
    });
    const nombres = new Set(deGoogle.map((c) => c.name));
    const conSesion = ['SID', 'SAPISID', 'HSID', 'SSID', 'APISID'].some((n) => nombres.has(n));
    return conSesion ? deGoogle : null;
  } catch (e) {
    gmailHoraLog('error comprobando la sesión previa: ' + e.message);
    return null;
  }
}

function abrirLoginGmailEnApp() {
  if (_gmailHoraLoginPromesa) return _gmailHoraLoginPromesa;
  _gmailHoraLoginPromesa = new Promise((resolve) => {
    const { session: ses } = require('electron');
    const particion = ses.fromPartition('persist:gmail-correo1');
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
      alwaysOnTop: true, /* v3.2.15 — la ventana de login no puede quedar
        oculta tras otras ventanas: el usuario no la veía, pasaban los 5
        minutos y aparecía «No se completó el inicio de sesión» */
      webPreferences: {
        contextIsolation: true, nodeIntegration: false, sandbox: true,
        partition: 'persist:gmail-correo1'
      }
    });
    _gmailHoraLoginWin.webContents.setUserAgent(uaChrome);
    /* v3.2.19 — instrumentación del ciclo de vida: en la máquina de un
       usuario la ventana se cerró sola en <1 s («ventana cerrada» al
       instante, imposible de hacer a mano). Se anota cuándo nació y si
       llegó a verse, para distinguir un cierre REAL del usuario de uno
       ANÓMALO (antivirus, bloqueador, proceso del renderer muerto). */
    const nacio = Date.now();
    let vista = false;
    let resuelto = false;
    /* v3.2.15 — resuelve { cookies, motivo, anomalia? }: el PORQUÉ del
       fallo («ventana cerrada», «tiempo agotado (5 min)», «no se pudo
       cargar Gmail») llega al aviso del usuario; antes todo se reportaba
       igual y no se podía diagnosticar nada desde la pantalla.
       v3.2.19: «anomalia» = la ventana murió sin que el usuario pudiera
       cerrarla (cierra sola en <5 s o el proceso se cae) — el llamador
       la reintenta una vez y NO dispara el candado de sesión. */
    const finalizar = async (ok, motivo, anomalia) => {
      if (resuelto) return;
      resuelto = true;
      clearInterval(poll);
      clearTimeout(limite);
      const salir = (v) => { _gmailHoraLoginPromesa = null; resolve(v); };
      if (!ok) {
        /* URL final de la ventana: distingue «el usuario cerró el login»
           de «Google mostró una página inesperada» en gmail-hora.log */
        let urlLogin = '';
        try {
          if (_gmailHoraLoginWin && !_gmailHoraLoginWin.isDestroyed()) urlLogin = _gmailHoraLoginWin.webContents.getURL();
        } catch (e) { /* ventana ya cerrada */ }
        gmailHoraLog(`login no completado (${motivo || 'ventana cerrada'})${urlLogin ? ' · URL: ' + urlLogin : ''}`);
        salir({ cookies: null, motivo: motivo || 'ventana cerrada', anomalia: !!anomalia });
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
        /* v3.2.19 — motivo SIEMPRE informado: antes venía vacío y el
           llamador imprimía «ventana cerrada» (una mentira) con '' || … */
        salir({ cookies, motivo: cookies.length ? 'sesión ok' : 'sesión detectada pero sin cookies de google.com', anomalia: false });
      } catch (e) {
        gmailHoraLog('error cosechando cookies: ' + e.message);
        salir({ cookies: null, motivo: 'no se pudieron leer las cookies de la sesión', anomalia: false });
      }
      /* la ventana ya cumplió su misión: se cierra sola */
      try { if (!_gmailHoraLoginWin.isDestroyed()) _gmailHoraLoginWin.close(); } catch (e) { /* noop */ }
    };
    /* ¿sesión REAL? La URL sola NO basta (v3.2.4): al abrir sin sesión,
       mail.google.com muestra su pantalla de carga 1-3 s ANTES de
       redirigir al login (accounts.google.com) y v3.2.3 cerraba la
       ventana ahí mismo («cargó por un segundo y se cerró») cosechando
       cookies parciales sin sesión. Se exigen las TRES señales: URL en
       Gmail + navegación terminada + cookies de SESIÓN de google.com
       (SID/SAPISID/HSID/SSID/APISID), confirmadas 2 sondeos seguidos. */
    const conSesionGoogle = async () => {
      try {
        const todas = await particion.cookies.getAll({});
        const nombres = new Set(todas.filter((c) => {
          const dom = String(c.domain || '').replace(/^\./, '');
          return /(^|\.)google\.com$/.test(dom);
        }).map((c) => c.name));
        return ['SID', 'SAPISID', 'HSID', 'SSID', 'APISID'].some((n) => nombres.has(n));
      } catch (e) { return false; }
    };
    const enGmail = () => {
      try {
        const u = _gmailHoraLoginWin.webContents.getURL();
        if (!/^https:\/\/mail\.google\.com\//.test(u)) return false;
        return !_gmailHoraLoginWin.webContents.isLoading();
      } catch (e) { return false; }
    };
    let confirmaciones = 0;
    const poll = setInterval(() => {
      if (!_gmailHoraLoginWin || _gmailHoraLoginWin.isDestroyed()) return;
      if (!enGmail()) { confirmaciones = 0; return; }
      conSesionGoogle().then((conSesion) => {
        if (!conSesion) { confirmaciones = 0; return; }
        confirmaciones++;
        if (confirmaciones === 2) {
          /* pequeño margen para que se asienten las cookies de la sesión */
          setTimeout(() => finalizar(true), 1500);
        }
      }).catch(() => { confirmaciones = 0; });
    }, 1000);
    const limite = setTimeout(() => finalizar(false, 'tiempo agotado (5 min)'), 5 * 60 * 1000);
    /* v3.2.19 — al cerrarse se anota la EDAD y si llegó a VERSE: un cierre
       a los <5 s sin haberse mostrado es ANÓMALO (antivirus, bloqueador,
       crash) y se reintenta; uno del usuario (ventana visible, abierta un
       rato) es una cancelación real. Antes TODO cierre se reportaba como
       «ventana cerrada» y disparaba el candado de sesión. */
    _gmailHoraLoginWin.on('closed', () => {
      const edad = (Date.now() - nacio) / 1000;
      _gmailHoraLoginWin = null;
      if (resuelto) return;   /* v3.2.20: cierre normal tras completar el login — no es fallo */
      /* v3.2.20 — ANOMALÍA = cierre a los <5 s, la haya visto o no: en la
         máquina del usuario la ventana murió en <1 s HABIENDO sesión
         válida detrás; exigir además «nunca vista» (v3.2.19) dejaba ese
         caso fuera. Nadie cierra a mano una ventana de login en menos de
         5 segundos. */
      const anomal = edad < 5;
      gmailHoraLog(`login: ventana cerrada a los ${edad.toFixed(1)} s (visible: ${vista ? 'sí' : 'no'})${anomal ? ' — CIERRE ANÓMALO: nadie la cierra a mano tan rápido (¿antivirus o bloqueador?)' : ''}`);
      finalizar(false, anomal ? `la ventana de inicio de sesión se cerró sola a los ${edad.toFixed(1)} s` : undefined, anomal);
    });
    _gmailHoraLoginWin.once('ready-to-show', () => { vista = true; _gmailHoraLoginWin.show(); _gmailHoraLoginWin.focus(); });
    /* v3.2.19 — si el proceso del renderer muere (GPU/sandbox/antivirus)
       la ventana queda muerta sin pasar por 'closed': se reporta con la
       CAUSA y se marca anómala para que el llamador reintente */
    _gmailHoraLoginWin.webContents.on('render-process-gone', (_e, det) => {
      gmailHoraLog(`login: proceso del navegador muerto (${det && det.reason})`);
      finalizar(false, 'la ventana de inicio de sesión falló (' + ((det && det.reason) || 'proceso muerto') + ')', true);
      try { if (!_gmailHoraLoginWin.isDestroyed()) _gmailHoraLoginWin.close(); } catch (e) { /* noop */ }
    });
    /* v3.2.19 — loadURL ya NO rinde al primer fallo: el redirect de Google
       a accounts.google.com puede abortar la carga inicial (ERR_ABORTED)
       sin que nada esté roto. Se reintenta una vez tras 1,5 s; solo un
       segundo fallo termina el intento con la causa exacta. */
    const cargar = (n) => {
      _gmailHoraLoginWin.loadURL('https://mail.google.com/').catch((e) => {
        gmailHoraLog(`login: loadURL falló (intento ${n}): ${e && e.message}`);
        if (n < 2) {
          setTimeout(() => {
            try { if (_gmailHoraLoginWin && !_gmailHoraLoginWin.isDestroyed()) cargar(2); } catch (e2) { /* cerrada */ }
          }, 1500);
        } else {
          finalizar(false, 'no se pudo cargar Gmail (' + ((e && e.message) || 'error de red') + ')');
        }
      });
    };
    cargar(1);
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
  /* v3.2.17 — la ventana de progreso se abre (o refresca) con cada
     búsqueda: el usuario VE los pasos en texto en vez de toasts fugaces */
  gmailProgresoAbrir(nombre);
  gmailProgresoLinea(`Búsqueda de la hora de recepción de «${nombre}» (vía asistida)…`);
  /* v3.2.18 — GUARDIA GLOBAL: si algo se cuelga de verdad (un arranque de
     Playwright que nunca responde, una navegación eterna con el antivirus
     frenando el navegador), la cola de búsquedas quedaba bloqueada PARA
     SIEMPRE: cada PDF cargado se encolaba detrás y no pasaba nada. Al
     vencer el plazo se cierra el navegador de búsqueda y la ventana de
     login, y la siguiente búsqueda arranca limpia.
     v3.2.23 — de 7 a 20 MIN: el login visible puede durar hasta 10 min
     (credenciales + verificación en dos pasos + avisos de Google) y el
     usuario de la 09:28 quedó cortado a mitad del acceso; cada fase
     interna sigue con su propio límite (loginVisible 10 min, ventana
     interna 5 min, navegaciones ~45 s). */
  let timer = null;
  const guardia = new Promise((_, rej) => {
    timer = setTimeout(() => {
      const e = new Error('La búsqueda de la hora excedió 20 minutos — se canceló para no bloquear las siguientes');
      e.name = 'GmailHoraTimeout';
      rej(e);
    }, 20 * 60 * 1000);
  });
  const nucleo = _gmailHoraBuscarNucleo(nombre, manual);
  nucleo.catch(() => {});   /* fallos tardíos tras vencer la guardia: el timeout ya se reportó */
  try {
    return await Promise.race([nucleo, guardia]);
  } catch (e) {
    if (e && e.name === 'GmailHoraTimeout') {
      gmailHoraLog('TIMEOUT global: se cierra el navegador de búsqueda y la ventana de login');
      gmailProgresoLinea('✖ ' + e.message, 'err');
      try { _gmailHoraSvc.cerrar(true); } catch (e2) { /* ya cerrado */ }
      _gmailHoraSvc = null;                    /* la próxima búsqueda lanza navegador nuevo */
      try { if (_gmailHoraLoginWin && !_gmailHoraLoginWin.isDestroyed()) _gmailHoraLoginWin.close(); } catch (e2) { /* noop */ }
      return { ok: false, error: e.message, tipo: 'GmailHoraTimeout' };
    }
    return { ok: false, error: (e && e.message) || String(e), tipo: (e && e.name) || 'Error' };
  } finally {
    clearTimeout(timer);
  }
}
/* Cuerpo de la búsqueda (todo lo que puede colgarse), protegido por la
   guardia de 7 min de _gmailHoraBuscar. */
async function _gmailHoraBuscarNucleo(nombre, manual) {
  try {
    /* v3.2.13 — si ningún navegador está disponible (Chrome/Edge/Chromium)
       el error NO se traga: antes un «Executable doesn't exist» seguía como
       «aviso» y la búsqueda moría en un error genérico sin explicación. */
    try {
      await _gmailHoraSvc.iniciar();
    } catch (e) {
      gmailHoraLog('ERROR al iniciar navegador: ' + e.message);
      gmailProgresoLinea('✖ No se pudo iniciar el navegador de búsqueda: ' + e.message, 'err');
      return { ok: false, error: e.message, tipo: 'NavegadorFalta' };
    }

    let r = null;
    try {
      r = await _gmailHoraSvc.buscarHoraPorArchivo(nombre, { copiar: false });
    } catch (e) {
      if (e.name !== 'LoginRequeridoError') throw e;
      /* Gmail pide sesión → login DENTRO de la app + transferir cookies.
         Hasta 2 rondas: si tras inyectar sigue pidiendo sesión se
         re-cosechan las cookies (Google las rota) y se reintenta. */
      for (let ronda = 1; ronda <= 2 && !r; ronda++) {
        /* v3.2.20 — ANTES de abrir cualquier ventana (y antes del candado:
           una sesión válida guardada no es una cancelación): ¿la partición
           de login ya tiene sesión de google.com? El usuario lo vio en
           pantalla — la ventana abría con el buzón YA visible (sesión
           válida) y aun así la búsqueda fallaba con «ventana cerrada»,
           porque la sesión solo se cosechaba si la ventana sobrevivía los
           ~3,5 s del sondeo. Con sesión previa se cosechan las cookies
           DIRECTAMENTE del almacén y se transfieren SIN abrir nada: no hay
           ventana que cerrarse sola, nada que cancelar, cero ceremonia. */
        const previas = await _gmailHoraSesionYaValida();
        /* v3.2.21 — la comprobación previa SIEMPRE queda registrada: el
           log del usuario mostraba el flujo de la ventana de login sin la
           línea «sesión ya activa» y era imposible distinguir «corre una
           versión sin sesión previa» de «la sesión previa no encontró
           cookies». Ahora gmail-hora.log lo cuenta en cada ronda. */
        gmailHoraLog('previa: ' + (previas ? previas.length + ' cookies de google.com — sesión válida en el almacén de login' : 'sin sesión de google.com en el almacén de login'));
        if (previas && previas.length) {
          gmailHoraLog(`ronda ${ronda}: sesión ya activa en la partición de login — ${previas.length} cookies de google.com, se transfieren sin abrir ventana`);
          gmailProgresoLinea(`La sesión de Gmail ya estaba activa — se transfiere (${previas.length} cookies) sin abrir la ventana…`, 'ok');
          _gmailHoraLoginCancelado = false;
          const inj0 = await _gmailHoraSvc.inyectarCookies(previas);
          gmailHoraLog(`cookies previas: ${inj0.total} cosechadas, ${inj0.ok} inyectadas${inj0.fallos.length ? ' · fallos: ' + inj0.fallos.join(' | ') : ''}`);
          gmailHoraEvento('Sesión transferida; buscando de nuevo…');
          try {
            r = await _gmailHoraSvc.buscarHoraPorArchivo(nombre, { copiar: false });
          } catch (e3) {
            if (e3.name !== 'LoginRequeridoError') throw e3;
            gmailHoraLog('las cookies previas no bastaron (Gmail sigue pidiendo sesión) — se abre la ventana de login');
            gmailProgresoLinea('La sesión guardada no bastó — se abre la ventana de inicio de sesión…', 'login');
          }
          if (r) break;
        }
        /* v3.2.15 — candado por sesión: tras UN login cancelado, las
           búsquedas AUTOMÁTICAS no vuelven a abrir la ventana. Antes el
           cooldown era de solo 30 s: cada PDF cargado reabría la ventana,
           el usuario la cerraba y el aviso «No se completó el inicio de
           sesión» salía una y otra vez. Solo el botón «🔗 Iniciar sesión
           en Gmail» (manual=true) la abre de nuevo. */
        if (!manual && _gmailHoraLoginCancelado) {
          gmailHoraLog('login omitido: ya se canceló una vez en esta sesión');
          gmailProgresoLinea('✖ Se omitió el inicio de sesión: ya se canceló una vez en esta sesión — pulsa «🔗 Iniciar sesión en Gmail» en la app', 'err');
          return { ok: false, error: 'Inicio de sesión en Gmail cancelado — pulsa «🔗 Iniciar sesión en Gmail» para completarlo cuando quieras', tipo: 'LoginCancelado' };
        }
        gmailHoraLog(`ronda ${ronda}: Gmail pide sesión (URL: ${_gmailHoraSvc.urlActual()})`);
        /* v3.2.22 — LOGIN VISIBLE EN CHROME REAL, CON EL PERFIL DEL
           BUSCADOR. Las capturas del usuario lo demostraron: la ventana
           de login de Electron moría en <2 s (algo la cerraba antes de
           poder verse) y su sesión de Chrome normal NO es visible para
           la app — el almacén quedaba vacío y la búsqueda siempre chocaba
           con el muro. Se abre una ventana de Chrome/Edge REAL con el
           MISMO perfil persistente del buscador: el usuario inicia
           sesión ahí una sola vez, la sesión queda en el perfil y NO se
           transfiere cookie alguna. La ventana de Electron queda solo
           como respaldo. */
        gmailHoraEvento('Gmail pide iniciar sesión: se abre una ventana de Chrome — inicie sesión ahí (solo la primera vez)…', 'login');
        const vis = await _gmailHoraSvc.loginVisible();
        if (vis && vis.ok) {
          gmailHoraLog('loginVisible: sesión iniciada y guardada en el perfil del buscador');
          gmailProgresoLinea('✔ Sesión iniciada en Chrome — queda guardada: la hora se buscará sola desde ahora', 'ok');
          _gmailHoraLoginCancelado = false;   // v3.2.22: el acceso sí se completó
          await _gmailHoraSvc.iniciar();
          try {
            r = await _gmailHoraSvc.buscarHoraPorArchivo(nombre, { copiar: false });
          } catch (e4) {
            if (e4.name !== 'LoginRequeridoError') throw e4;
            gmailHoraLog(`ronda ${ronda}: aun con sesión en el perfil, Gmail volvió a pedir login (URL: ${_gmailHoraSvc.urlActual()})`);
          }
          if (r) break;
        } else {
          gmailHoraLog('loginVisible no completó: ' + ((vis && vis.motivo) || 'falló') + ' — se usa la ventana dentro de la app como respaldo');
          gmailProgresoLinea('⚠ La ventana de Chrome no completó el acceso (' + ((vis && vis.motivo) || 'falló') + ') — se abre Gmail dentro de la app…', 'login');
        }
        /* respaldo: la ventana de login DENTRO de la app (Electron) */
        gmailHoraEvento('Gmail pide iniciar sesión: se abrió Gmail dentro de la app — inicie sesión (solo la primera vez)…', 'login');
        /* v3.2.19 — reintento ante CIERRE ANÓMALO de la ventana de login
           (se cerró sola en <5 s o su proceso murió: antivirus, bloqueador,
           crash): se reabre UNA vez antes de rendirse. Un cierre REAL del
           usuario (ventana visible, abierta un rato) NO se reintenta y sí
           activa el candado v3.2.15. */
        let login = null;
        for (let intento = 1; intento <= 2; intento++) {
          login = await abrirLoginGmailEnApp();
          if (login && login.cookies && login.cookies.length) break;
          if (login && login.anomalia && intento === 1) {
            gmailHoraLog('login: cierre anómalo — se reabre la ventana una vez');
            gmailProgresoLinea('⚠ ' + login.motivo + ' — se reabre la ventana una vez…', 'login');
            continue;
          }
          break;
        }
        const cookies = login && login.cookies;
        if (!cookies || !cookies.length) {
          const motivo = (login && login.motivo) || 'ventana cerrada';
          _gmailHoraUltimoFalloLogin = Date.now();
          if (!(login && login.anomalia)) {
            _gmailHoraLoginCancelado = true;   // v3.2.15: por el resto de la sesión no se reabre sola
          }
          gmailProgresoLinea('✖ No se completó el inicio de sesión en Gmail (' + motivo + ')', 'err');
          gmailProgresoLinea('Cuando pueda, pulse «🔗 Iniciar sesión en Gmail» en la app y complete el acceso — con la sesión lista, la hora se capturará sola en los siguientes archivos.', 'login');
          return { ok: false, error: 'No se completó el inicio de sesión en Gmail (' + motivo + ')', tipo: 'LoginCancelado' };
        }
        _gmailHoraLoginCancelado = false;    // el login sí se completó: se permite de nuevo si la sesión expira
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
        gmailProgresoLinea('✖ La sesión de Gmail no se pudo transferir al buscador invisible', 'err');
        return { ok: false, error: 'La sesión de Gmail no se pudo transferir al buscador invisible', tipo: 'SesionNoTransferida' };
      }
    }

    /* la hora llega como texto de visualización de Gmail (zona de la
       cuenta, por defecto Lima UTC−5): se convierte a epoch/UTC */
    const ms = parseHoraGmail(r.horaRecepcion);
    gmailHoraLog(`hora «${r.horaRecepcion}» (fuente: ${r.fuente}) → ${ms ? new Date(ms).toISOString() : 'NO INTERPRETADA (revisar formato)'}`);
    gmailProgresoLinea(`✔ Hora de recepción de «${nombre}»: ${r.horaRecepcion}${r.asunto ? ' — «' + r.asunto + '»' : ''}`, 'ok');
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
    gmailProgresoLinea(`✖ ${e.name === 'ArchivoNoEncontradoError' ? 'No se encontró el correo del archivo' : e.message}`, 'err');
    return { ok: false, error: e.message, tipo: e.name || 'Error' };
  }
}
/* cierra el navegador asistido al salir de la app (la sesión persiste) */
app.on('before-quit', () => {
  if (_gmailHoraSvc) { try { _gmailHoraSvc.cerrar(true); } catch (e) { /* noop */ } }
  if (_gmailHoraLoginWin && !_gmailHoraLoginWin.isDestroyed()) { try { _gmailHoraLoginWin.close(); } catch (e) { /* noop */ } }
  if (_gmailProgresoWin && !_gmailProgresoWin.isDestroyed()) { try { _gmailProgresoWin.close(); } catch (e) { /* noop */ } }
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
