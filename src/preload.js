/* PDFPro — preload: puente mínimo y seguro entre la app y Electron.
 * contextIsolation activado, nodeIntegration desactivado, sandbox activado. */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pdfproDesktop', {
  isDesktop: true,
  platform: process.platform,

  /** versión de la app (package.json) */
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),

  /** Abre la ventana nativa de OAuth; resuelve {code,state} o {error} */
  openAuthPopup: (url) => ipcRenderer.invoke('oauth:open', url),

  /** Archivo abierto desde Windows (doble clic / Abrir con / menú) */
  onOpenFile: (cb) => ipcRenderer.on('app:open-file', (_e, file) => cb(file)),

  /** v2.9.13 — Archivar una exportación en la carpeta de registro FPL
   *  (REGISTROS FPL NOTAM\FPL\año\MM Mes\DD, fecha de Lima). Devuelve
   *  {ok, ruta} | {ok:false, error} | {ok:false, omitido:true} */
  guardarRegistroFPL: (nombre, buffer) => ipcRenderer.invoke('fpl:guardar', nombre, buffer),

  /* ── v3.0.0 — Monitoreo Gmail (sphiaisaro@gmail.com) ── */
  gmailEstado: () => ipcRenderer.invoke('gmail:estado'),
  gmailConectar: () => ipcRenderer.invoke('gmail:conectar'),
  gmailCodigo: (code) => ipcRenderer.invoke('gmail:codigo', code),
  gmailDesconectar: () => ipcRenderer.invoke('gmail:desconectar'),
  gmailBarrer: (query, maxResults) => ipcRenderer.invoke('gmail:barrer', query, maxResults),
  gmailPerfil: () => ipcRenderer.invoke('gmail:perfil'),
  /** v3.1.2 — clientId público de Gmail (para la capa web embebida); vacío si
   *  no hay credenciales configuradas. */
  gmailClientId: () => ipcRenderer.invoke('gmail:clientId'),

  /* ── v3.1.9 — Hora de recepción por archivo cargado (Gmail asistido con
   *  Playwright; sin OAuth). Progreso por evento 'gmail-hora:evento'.
   *  v3.2.3: gmailHoraBuscar(archivo, manual) — manual salta el cooldown
   *  del login (botón «Iniciar sesión en Gmail»). ── */
  gmailHoraBuscar: (archivo, manual) => ipcRenderer.invoke('gmail-hora:buscar', archivo, manual),
  gmailHoraEstado: () => ipcRenderer.invoke('gmail-hora:estado'),
  onGmailHoraEvento: (cb) => ipcRenderer.on('gmail-hora:evento', (_e, d) => cb(d)),

  /* ── v3.1.0 — Verificación de licencias DGAC (SIVLAM) ── */
  sivlamVerificar: (tipo, numero) => ipcRenderer.invoke('sivlam:verificar', { tipo, numero }),
  onSivlamStatus: (cb) => ipcRenderer.on('sivlam:status', (_e, msg) => cb(msg)),

  /** Descarga terminada (exportaciones) */
  onDownloadDone: (cb) => ipcRenderer.on('download:done', (_e, info) => cb(info)),

  /** El renderer terminó de cargar */
  ready: () => ipcRenderer.send('bridge:ready')
});
