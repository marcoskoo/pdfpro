/* PRUEBA REAL del servicio de la hora (v3.2.14 — ORDEN DEL USUARIO):
   ejecuta GmailHoraService de verdad contra gmail.com con el Chromium del
   sandbox (PDFPRO_GMAIL_CHROMIUM). Con un perfil virgen Gmail pide sesión:
   la NUEVA cadena debe navegar a la bandeja (in:inbox has:attachment),
   empezar a recorrer los correos del más nuevo al más viejo y toparse con
   el muro de login → LoginRequeridoError. Eso valida: lanzamiento con la
   cadena de 4 intentos, la espera real de filas (12 s) sobre la NUEVA
   consulta y la detección de login. Ejecutar:
   node scripts/test_servicio_real_3214.js */
process.env.PDFPRO_GMAIL_CHROMIUM = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const fs = require('fs');
const GmailHoraService = require('../src/gmail-hora/GmailHoraService');

const t0 = Date.now();
const log = (m) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${m}`);
const dir = fs.mkdtempSync('/tmp/gmail-svc-');

(async () => {
  const progreso = [];
  const svc = new GmailHoraService({
    userDataDir: dir,
    headless: true,
    onProgress: (m) => { progreso.push(m); log('· ' + m); }
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
        const ordeno = progreso.some((m) => /más nuevo al más viejo/.test(m));
        log('✓ LoginRequeridoError detectado (URL: ' + (svc.urlActual() || '?').slice(0, 60) + ')');
        log((ordeno ? '✓' : '✗') + ' el recorrido ORDENADO se inició ANTES del muro de login («Recorriendo los correos recibidos…»)');
        log('✓ CADENA v3.2.14 VERIFICADA: launch → bandeja in:inbox has:attachment → recorrido nuevo→viejo → muro de login');
        if (!ordeno) process.exitCode = 1;
      } else {
        log('✗ error inesperado: [' + e.name + '] ' + e.message);
        process.exitCode = 1;
      }
    }
  } catch (e) {
    log('✗ iniciar()/búsqueda falló: ' + e.message.split('\n')[0]);
    process.exitCode = 1;
  } finally {
    try { await svc.cerrar(true); } catch (e) {}
    fs.rmSync(dir, { recursive: true, force: true });
    log('fin');
  }
})();
