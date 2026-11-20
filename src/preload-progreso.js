/* PDFPro — preload-progreso.js (v3.2.18)
 * Preload de la VENTANA DE PROGRESO de la búsqueda de la hora de
 * recepción: expone la escucha del histórico de líneas que envía el
 * proceso principal ('gmail-hora:progreso', array {ms, msg, tipo,
 * archivo?}).
 * v3.2.18 — CORRECCIÓN CRÍTICA: antes se asignaba «window.pdfproProgreso
 * = …» directamente, pero con contextIsolation ACTIVADO el preload corre
 * en un mundo aislado y esa asignación NUNCA llegaba a la página: el
 * listener no se registraba y la ventana quedaba VACÍA («no indica
 * nada»). Ahora se expone con contextBridge.exposeInMainWorld, igual que
 * el puente principal 'pdfproDesktop'. Aislado a propósito: esta ventana
 * es un visor y puede minimizarse o cerrarse sin afectar la búsqueda. */
'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('pdfproProgreso', {
  onGmailProgreso: (cb) => ipcRenderer.on('gmail-hora:progreso', (_e, lineas) => cb(lineas))
});
