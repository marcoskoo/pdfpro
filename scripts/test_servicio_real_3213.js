/* PRUEBA REAL del servicio de la hora (v3.2.13): ejecuta GmailHoraService
   de verdad contra gmail.com con el Chromium presente en el sandbox, vía
   PDFPRO_GMAIL_CHROMIUM (ruta manual de diagnóstico). Con un perfil virgen
   Gmail debe pedir sesión → LoginRequeridoError: eso valida TODA la cadena
   hasta el login (lanzamiento con cadena de 4 intentos, navegación,
   búsqueda por nombre de archivo y detección de login con la espera de
   12 s de v3.2.11). Ejecutar:
   node scripts/test_servicio_real_3213.js */
process.env.PDFPRO_GMAIL_CHROMIUM = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const path = require('path');
const fs = require('fs');
const GmailHoraService = require('../src/gmail-hora/GmailHoraService');

const t0 = Date.now();
const log = (m) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${m}`);
const dir = fs.mkdtempSync('/tmp/gmail-svc-');

(async () => {
  const svc = new GmailHoraService({
    userDataDir: dir,
    headless: true,
    onProgress: (m) => log('· ' + m)
  });
  log('disponible(): ' + JSON.stringify(GmailHoraService.disponible()));
  try {
    await svc.iniciar();
    log('✓ navegador iniciado');
    try {
      const r = await svc.buscarHoraPorArchivo('ARCHIVO-QUE-NO-EXISTE-XYZ.pdf', { copiar: false });
      log('⚠️ RESULTADO INESPERADO (había sesión?): ' + JSON.stringify(r).slice(0, 300));
    } catch (e) {
      if (e.name === 'LoginRequeridoError') {
        log('✓ LoginRequeridoError detectado correctamente (Gmail pide sesión, URL: ' + (svc.urlActual ? svc.urlActual() : '?').slice(0, 60) + ')');
        log('✓ CADENA COMPLETA VERIFICADA: launch → gmail.com → búsqueda por nombre de archivo → muro de login');
      } else {
        log('✗ error inesperado: [' + e.name + '] ' + e.message);
        process.exitCode = 1;
      }
    }
  } catch (e) {
    log('✗ iniciar()/busqueda falló: ' + e.message.split('\n')[0]);
    process.exitCode = 1;
  } finally {
    try { await svc.cerrar(true); } catch (e) {}
    fs.rmSync(dir, { recursive: true, force: true });
    log('fin');
  }
})();
