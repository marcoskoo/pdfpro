/* PDFPro — preload-progreso.js (v3.2.17)
 * Preload de la VENTANA DE PROGRESO de la búsqueda de la hora de
 * recepción: solo expone la escucha del histórico de líneas que envía el
 * proceso principal ('gmail-hora:progreso', array {ms, msg, tipo,
 * archivo?}). Aislado a propósito del preload principal: esta ventana es
 * un visor y puede minimizarse o cerrarse sin afectar la búsqueda. */
'use strict';
const { ipcRenderer } = require('electron');
window.pdfproProgreso = {
  onGmailProgreso: (cb) => ipcRenderer.on('gmail-hora:progreso', (_e, lineas) => cb(lineas))
};
