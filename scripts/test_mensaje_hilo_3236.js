/* Test v3.2.36 — RECEPCIÓN del MENSAJE DEL ADJUNTO dentro de un HILO.
   Reporte real (pv2066, log del usuario): el correo con el pv2066 no es
   un correo suelto — es un mensaje ANTERIOR de un hilo grande («ATC JAP
   7161 211126», último mensaje 21 nov 5:03 p. m.). La fila de la bandeja
   marca la recepción del ÚLTIMO del hilo (otro correo) y la cabecera del
   mensaje del adjunto es su Date header (ENVÍO: 20 nov 5:22), así que se
   capturaba 10:22 en vez de la RECEPCIÓN (5:34). Ahora se re-busca por
   filename:"…" — resultados por MENSAJE, fila = su recepción — y se abre
   el más reciente. Ejercicio de los métodos REALES del servicio con
   colaboradores sustituidos (sin navegador). */
'use strict';
const GmailHoraService = require('/home/z/my-project/src/gmail-hora/GmailHoraService.js');
const { parseHoraGmail } = require('/home/z/my-project/src/gmail-hora/hora.js');
let fallos = 0;

function chk(desc, obtenido, esperado) {
  const ok = JSON.stringify(obtenido) === JSON.stringify(esperado);
  if (!ok) fallos++;
  console.log((ok ? '  OK  ' : 'FALLA ') + '· ' + desc + ' → ' + JSON.stringify(obtenido) +
    (ok ? '' : ' (esperaba ' + JSON.stringify(esperado) + ')'));
}
const iso = (ms) => (ms == null ? null : new Date(ms).toISOString());

(async () => {
/* 1) _consultasFilename: «(n)» del descargado fuera, sin duplicados */
{
  const svc = new GmailHoraService({ onProgress: () => {} });
  chk('consultas de «pv2066 1200 (2).pdf»', svc._consultasFilename('pv2066 1200 (2).pdf'),
    ['pv2066 1200 (2)', 'pv2066 1200']);
  chk('consultas de «ATC JAP 7161.pdf» (una sola)', svc._consultasFilename('ATC JAP 7161.pdf'),
    ['ATC JAP 7161']);
}

/* 2) _horaFilaDelMensaje: el escenario del log — la búsqueda por filename
      devuelve el MENSAJE (no el hilo) y su fila trae la RECEPCIÓN 5:34 */
{
  const svc = new GmailHoraService({ onProgress: () => {} });
  const consultas = [];
  svc._buscar = async (q) => { consultas.push(q); };
  svc._haySinResultados = async () => false;
  svc._ordenFilasPorFecha = async () => [{ idx: 0, fecha: 'vie, 20 nov 2026, 5:34 a.m.' }];
  svc.page = { evaluate: async () => true, waitForTimeout: async () => {}, title: async () => 'Gmail' };
  svc._esperarAdjuntos = async () => {};
  svc._adjuntosAbiertos = async () => ['ATC 7161 211126.pdf', 'pv2066 1200.pdf'];
  const r = await svc._horaFilaDelMensaje('pv2066 1200 (2).pdf');
  chk('fila del MENSAJE = recepción 5:34 (no la cabecera 5:22)', r, 'vie, 20 nov 2026, 5:34 a.m.');
  chk('y se interpreta → 10:34 UTC del 20/11 (lo que espera el usuario)',
    iso(parseHoraGmail(r)), '2026-11-20T10:34:00.000Z');
  chk('la primera consulta fue filename: con la base', consultas[0], 'filename:"pv2066 1200 (2)"');

  /* la vista abierta ya no trae el adjunto → NO se usa la fila (v3.2.27) */
  svc._adjuntosAbiertos = async () => ['ATC 7161 211126.pdf'];
  chk('adjunto no visible al reabrir → null', await svc._horaFilaDelMensaje('pv2066 1200 (2).pdf'), null);

  /* fila sin hora legible («20 nov») → null (no valen medias fechas) */
  svc._adjuntosAbiertos = async () => ['pv2066 1200.pdf'];
  svc._ordenFilasPorFecha = async () => [{ idx: 0, fecha: '20 nov' }];
  chk('fila sin hora → null', await svc._horaFilaDelMensaje('pv2066 1200 (2).pdf'), null);
}

/* 3) sin resultados en filename: (prueba las 2 consultas) → null */
{
  const svc = new GmailHoraService({ onProgress: () => {} });
  const consultas = [];
  svc._buscar = async (q) => { consultas.push(q); };
  svc._haySinResultados = async () => true;
  chk('sin resultados → null', await svc._horaFilaDelMensaje('pv2066 1200 (2).pdf'), null);
  chk('probó la base y la versión sin «(n)»', consultas,
    ['filename:"pv2066 1200 (2)"', 'filename:"pv2066 1200"']);
}

/* 4) _resultadoDeCorreoAbierto — EL FLUJO COMPLETO del reporte: hilo, el
      adjunto en un mensaje anterior (esUltimo=false), cabecera 5:22, y la
      fila de la bandeja era la del último correo (5:03 p. m.) → la
      re-búsqueda entrega la RECEPCIÓN 5:34 como hora */
{
  const svc = new GmailHoraService({ onProgress: () => {} });
  let reBusco = 0;
  svc._extraerHoraMensajeAdjunto = async () => ({ hora: 'vie, 20 nov 2026, 5:22 a.m.', esUltimo: false });
  svc._extraerMeta = async () => ({
    asunto: 'ATC JAP 7161 211126', remitenteNombre: 'AIS CORPAC',
    remitenteCorreo: 'ais@corpac.gob.pe', archivoAdjunto: 'pv2066 1200.pdf'
  });
  svc._buscar = async () => { reBusco++; };
  svc._haySinResultados = async () => false;
  svc._ordenFilasPorFecha = async () => [{ idx: 0, fecha: 'vie, 20 nov 2026, 5:34 a.m.' }];
  svc.page = { evaluate: async () => true, waitForTimeout: async () => {}, title: async () => 'Gmail' };
  svc._esperarAdjuntos = async () => {};
  svc._adjuntosAbiertos = async () => ['pv2066 1200.pdf'];
  svc._horaFilaAbierta = 'sáb, 21 nov 2026, 5:03 p.m.';   /* fila de la BANDEJA = último del hilo */
  const r = await svc._resultadoDeCorreoAbierto('pv2066 1200 (2).pdf', false);
  chk('hora del resultado = RECEPCIÓN del mensaje (fila-recepcion)',
    { hora: r.horaRecepcion, fuente: r.fuente },
    { hora: 'vie, 20 nov 2026, 5:34 a.m.', fuente: 'fila-recepcion' });
  chk('→ 10:34 UTC (20/11), no 10:22', iso(parseHoraGmail(r.horaRecepcion)), '2026-11-20T10:34:00.000Z');
  chk('la re-búsqueda por filename: SÍ corrió', reBusco, 1);

  /* 5) adjunto en el ÚLTIMO mensaje (esUltimo=true): la fila de la bandeja
        YA es la recepción de ese mensaje → NO se re-busca (regla 3.2.35) */
  reBusco = 0;
  svc._extraerHoraMensajeAdjunto = async () => ({ hora: 'sáb, 21 nov 2026, 5:03 p.m.', esUltimo: true });
  const r2 = await svc._resultadoDeCorreoAbierto('pv2066 1200 (2).pdf', false);
  chk('último mensaje: fila de la bandeja directa (sin re-buscar)',
    { hora: r2.horaRecepcion, fuente: r2.fuente },
    { hora: 'sáb, 21 nov 2026, 5:03 p.m.', fuente: 'fila-recepcion' });
  chk('no hubo re-búsqueda', reBusco, 0);

  /* 6) re-búsqueda falla (sin resultados) → se queda con la cabecera (3.2.31) */
  svc._extraerHoraMensajeAdjunto = async () => ({ hora: 'vie, 20 nov 2026, 5:22 a.m.', esUltimo: false });
  svc._haySinResultados = async () => true;
  const r3 = await svc._resultadoDeCorreoAbierto('pv2066 1200 (2).pdf', false);
  chk('re-búsqueda sin resultados → cabecera del mensaje (3.2.31)',
    { hora: r3.horaRecepcion, fuente: r3.fuente },
    { hora: 'vie, 20 nov 2026, 5:22 a.m.', fuente: 'mensaje-del-adjunto' });
}

console.log(fallos ? '✗ ' + fallos + ' fallo(s)' : '✓ MENSAJE-EN-HILO OK (15/15)');
process.exit(fallos ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
