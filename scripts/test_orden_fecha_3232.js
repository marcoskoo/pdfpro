/* Test v3.2.32 — orden EXPLÍCITO por fecha del recorrido de la bandeja.
   Ejercicio de los métodos REALES de GmailHoraService (sin navegador):
   _msDeTituloFila (fechas de fila de Gmail) y _ordenarInfoPorFecha
   (del más reciente al más viejo, como exige el usuario). */
'use strict';
const GmailHoraService = require('/home/z/my-project/src/gmail-hora/GmailHoraService.js');
const svc = new GmailHoraService({ onProgress: () => {} });
const ahora = { dia: 21, mes: 11, anio: 2026 };   /* 21 nov 2026, Lima */
let fallos = 0;

function chk(desc, obtenido, esperado) {
  const ok = JSON.stringify(obtenido) === JSON.stringify(esperado);
  if (!ok) fallos++;
  console.log((ok ? '  OK  ' : 'FALLA ') + '· ' + desc + ' → ' + JSON.stringify(obtenido) +
    (ok ? '' : ' (esperaba ' + JSON.stringify(esperado) + ')'));
}

/* 1) _msDeTituloFila: formatos de fecha de las filas de Gmail */
const iso = (ms) => (ms == null ? null : new Date(ms).toISOString());
chk('fecha completa con hora («sáb, 21 nov, 2:45 p. m.»)',
  iso(svc._msDeTituloFila('sáb, 21 nov, 2:45 p. m.', ahora)), '2026-11-21T19:45:00.000Z');
chk('fecha con año y hora 24 h («21 nov 2026, 14:45»)',
  iso(svc._msDeTituloFila('21 nov 2026, 14:45', ahora)), '2026-11-21T19:45:00.000Z');
/* «solo hora» la resuelve el reloj REAL (hoy Lima), no el «ahora» fijo del test */
const hoyReal = new Date(Date.now() - 300 * 60000);
chk('solo hora («2:45 p. m.» = hoy REAL en Lima)',
  iso(svc._msDeTituloFila('2:45 p. m.', ahora)),
  new Date(Date.UTC(hoyReal.getUTCFullYear(), hoyReal.getUTCMonth(), hoyReal.getUTCDate(), 19, 45)).toISOString());
chk('solo fecha («21 nov» → mediodía Lima)',
  iso(svc._msDeTituloFila('21 nov', ahora)), '2026-11-21T17:00:00.000Z');
chk('cambio de año («31 dic» visto en nov = 2025)',
  iso(svc._msDeTituloFila('31 dic', ahora)), '2025-12-31T17:00:00.000Z');
chk('fecha con año sin hora («14 nov 2025»)',
  iso(svc._msDeTituloFila('14 nov 2025', ahora)), '2025-11-14T17:00:00.000Z');
chk('nombre de adjunto NO es fecha («3122 LIM ACTUALIZADO.pdf»)',
  svc._msDeTituloFila('3122 LIM ACTUALIZADO.pdf', ahora), null);
chk('remitente NO es fecha («Correo de Juan Pérez»)',
  svc._msDeTituloFila('Correo de Juan Pérez', ahora), null);
chk('vacío', svc._msDeTituloFila('', ahora), null);

/* 2) _ordenarInfoPorFecha: lista como la de Gmail con «Resultados
      principales» primero (NO cronológica) — el recorrido debe ir del
      MÁS RECIENTE al más VIEJO: 2:45 p. m. hoy → 9:02 hoy → 20 nov →
      14 nov → sin fecha (al final, orden del DOM) */
const info = [
  { idx: 0, fecha: '14 nov' },              /* «Resultado principal» viejo */
  { idx: 1, fecha: '2:45 p. m.' },          /* el más nuevo (hoy 14:45) */
  { idx: 2, fecha: '21 nov, 9:02 a. m.' },  /* hoy 9:02 */
  { idx: 3, fecha: '20 nov' },              /* ayer */
  { idx: 4, fecha: '' }                     /* sin fecha legible */
];
chk('orden del más reciente al más viejo',
  svc._ordenarInfoPorFecha(info).map((f) => f.idx), [1, 2, 3, 0, 4]);
chk('la fecha viaja con el índice (para el registro)',
  svc._ordenarInfoPorFecha(info).map((f) => f.fecha),
  ['2:45 p. m.', '21 nov, 9:02 a. m.', '20 nov', '14 nov', '']);

/* 3) lista ya cronológica: el orden no cambia (regresión) */
const cronologica = [
  { idx: 0, fecha: '2:45 p. m.' },
  { idx: 1, fecha: '21 nov, 9:02 a. m.' },
  { idx: 2, fecha: '20 nov' }
];
chk('lista ya cronológica queda igual',
  svc._ordenarInfoPorFecha(cronologica).map((f) => f.idx), [0, 1, 2]);

console.log(fallos ? '✗ ' + fallos + ' fallo(s)' : '✓ ORDEN-POR-FECHA OK (12/12)');
process.exit(fallos ? 1 : 0);
