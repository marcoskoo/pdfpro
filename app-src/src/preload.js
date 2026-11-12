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

  /** Descarga terminada (exportaciones) */
  onDownloadDone: (cb) => ipcRenderer.on('download:done', (_e, info) => cb(info)),

  /** El renderer terminó de cargar */
  ready: () => ipcRenderer.send('bridge:ready')
});
