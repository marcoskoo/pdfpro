/* Test v3.2.33 — ORDEN EXPLÍCITO POR FECHA en la búsqueda API de la hora
   (pollOrdenado, proceso principal). Reproduce EXACTAMENTE el reporte del
   usuario: el FPL «pv2066» llegó a las 10:34 UTC (05:34 Lima) pero la app
   mostraba 10:22 UTC (05:22) — messages.list NO garantiza orden y dentro
   de un mismo hilo el mensaje VIEJO puede venir ANTES que el nuevo. */
'use strict';
const gmail = require('/home/z/my-project/src/gmail-monitor.js');
const T1022 = Date.UTC(2026, 10, 21, 10, 22);   /* correo viejo */
const T1034 = Date.UTC(2026, 10, 21, 10, 34);   /* el más reciente */
const T1100 = Date.UTC(2026, 10, 21, 11, 0);    /* más reciente aún, otro adjunto */
const ADJ = 'PV 2066  LIM 21 NOV 2026.pdf';
let fallos = 0;

function chk(desc, obtenido, esperado) {
  const ok = obtenido === esperado;
  if (!ok) fallos++;
  console.log((ok ? '  OK  ' : 'FALLA ') + '· ' + desc + ' → ' + obtenido +
    (ok ? '' : ' (esperaba ' + esperado + ')'));
}
const msg = (id, ms, adjuntos) => ({ id, threadId: 'h1', de: 'AIS CORPAC', asunto: 'FP PV 2066', fechaHeader: '', recibidoMs: ms, recibidoISO: new Date(ms).toISOString(), adjuntos });

(async () => {
  /* 1) EL REPORTE: la API devuelve el VIEJO (10:22) ANTES que el nuevo
        (10:34), mismo adjunto — debe ganar el 10:34 */
  const apiViejoPrimero = [
    msg('A', T1022, [ADJ]),
    msg('B', T1034, [ADJ + ' (1)'])      /* duplicado de Gmail: comparable igual */
  ];
  const r1 = await gmail.pollOrdenado(null, 'PV 2066  LIM 21 NOV 2026 (1).pdf', 50, { poll: async () => apiViejoPrimero });
  chk('reporte pv2066: gana el MÁS RECIENTE (10:34, id B)', r1 && r1.id, 'B');
  chk('su hora es la del nuevo (10:34 UTC)', r1 && r1.recibidoMs, T1034);

  /* 2) mismo caso pero el nuevo SIN marca de duplicado (nombres idénticos) */
  const r2 = await gmail.pollOrdenado(null, ADJ, 50, { poll: async () => [msg('A', T1022, [ADJ]), msg('B', T1034, [ADJ])] });
  chk('nombres idénticos: gana el 10:34', r2 && r2.id, 'B');

  /* 3) un correo MÁS RECIENTE sin el adjunto NO despista: gana el nuevo
        que SÍ lo tiene (10:34), no el 11:00 ni el 10:22 */
  const r3 = await gmail.pollOrdenado(null, ADJ, 50, { poll: async () => [msg('A', T1022, [ADJ]), msg('C', T1100, ['OTRO 9999.pdf']), msg('B', T1034, [ADJ])] });
  chk('más reciente sin el adjunto no cuenta: gana B (10:34)', r3 && r3.id, 'B');

  /* 4) SOLO el viejo tiene el adjunto: es el ganador (único con ese adjunto) */
  const r4 = await gmail.pollOrdenado(null, ADJ, 50, { poll: async () => [msg('C', T1100, ['OTRO 9999.pdf']), msg('A', T1022, [ADJ])] });
  chk('único con el adjunto: gana aunque sea viejo', r4 && r4.id, 'A');

  /* 5) sin ningún match → null (la re-búsqueda sigue su curso) */
  const r5 = await gmail.pollOrdenado(null, ADJ, 50, { poll: async () => [msg('C', T1100, ['OTRO 9999.pdf'])] });
  chk('sin match → null', r5, null);

  /* 6) lista ya en orden DESC (lo normal entre hilos): igual gana el nuevo */
  const r6 = await gmail.pollOrdenado(null, ADJ, 50, { poll: async () => [msg('B', T1034, [ADJ]), msg('A', T1022, [ADJ])] });
  chk('lista ya ordenada DESC: gana el 10:34 (regresión)', r6 && r6.id, 'B');

  /* 7) puro: primerMatchOrdenado con vacíos/nulos */
  chk('puro: lista vacía → null', gmail.primerMatchOrdenado([], ADJ), null);
  chk('puro: lista null → null', gmail.primerMatchOrdenado(null, ADJ), null);
  chk('puro: sin adjuntos → null', gmail.primerMatchOrdenado([msg('A', T1022, [])], ADJ), null);

  console.log(fallos ? '✗ ' + fallos + ' fallo(s)' : '✓ ORDEN-API-POR-FECHA OK (9/9)');
  process.exit(fallos ? 1 : 0);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
