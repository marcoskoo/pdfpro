/* PDFPro — gmail-hora/hora.js (v3.1.9)
 * Lógica pura del módulo «hora de recepción por archivo»:
 *  - parseHoraGmail: convierte la hora TAL COMO LA MUESTRA GMAIL
 *    («17 nov 2026, 8:00 p. m.», «17 de noviembre de 2026, 20:00»,
 *    «sáb, 17 nov, 20:00», «20:00» solo hora = hoy) a epoch ms,
 *    interpretándola en la zona de visualización de la cuenta
 *    (por defecto Lima, UTC−5, sin horario de verano).
 *  - baseDe: quita la extensión del archivo para ampliar coincidencias.
 *  - filaCoincide: comparación normalizada de la fila de resultado con el
 *    nombre buscado (mayúsculas/espacios/signos no importan).
 * La zona es configurable: offsetMin = desplazamiento de la zona de la
 * cuenta de Gmail en minutos (Lima = -300). */
'use strict';

/* Meses de Gmail en español (abreviados y completos; «set» es la abreviatura
   de septiembre en es-419, «sept» en es-ES). */
const MESES = {
  ene: 1, enero: 1,
  feb: 2, febrero: 2,
  mar: 3, marzo: 3,
  abr: 4, abril: 4,
  may: 5, mayo: 5,
  jun: 6, junio: 6,
  jul: 7, julio: 7,
  ago: 8, agosto: 8,
  sep: 9, sept: 9, set: 9, septiembre: 9, setiembre: 9,
  oct: 10, octubre: 10,
  nov: 11, noviembre: 11,
  dic: 12, diciembre: 12
};

const DEFAULT_OPTS = { offsetMin: -300 }; // Lima, UTC-5

/** Fecha/hora «de pared» actual de la zona de la cuenta (día, mes, año). */
function ahoraZona(offsetMin) {
  /* v3.2.32 — SIGNO CORREGIDO: la hora de pared de la zona es UTC + offset
     (Lima, −300 min → UTC − 5 h). El cálculo anterior RESTABA el offset y
     entre las 19:00 y las 24:00 UTC (14:00–19:00 en Lima, justo la franja
     de trabajo) devolvía la fecha del día SIGUIENTE: una hora sin fecha
     («2:45 p. m.») se atribuía a mañana (+24 h). */
  const d = new Date(Date.now() + offsetMin * 60000);
  return { dia: d.getUTCDate(), mes: d.getUTCMonth() + 1, anio: d.getUTCFullYear() };
}

/**
 * Convierte la hora mostrada por Gmail a epoch (ms).
 * Acepta, con o sin día de semana delante y con o sin año:
 *   «17 nov 2026, 8:00 p. m.»  «17 de noviembre de 2026, 20:00»
 *   «sáb, 17 nov, 8:00 a. m.»  «20:00» (solo hora → hoy en la zona)
 * Devuelve null si no puede interpretarla.
 */
function parseHoraGmail(texto, opts) {
  const off = (opts && typeof opts.offsetMin === 'number') ? opts.offsetMin : DEFAULT_OPTS.offsetMin;
  let s = String(texto || '').replace(/\s+/g, ' ').trim();
  if (!s) return null;
  /* quita el día de semana inicial («mar,», «sáb,», «mié») */
  s = s.replace(/^[a-záéíóúñ]{2,4}\s*,\s*/i, '').trim();

  /* fecha opcional (día [de] mes [[de] año]) + hora (12/24 h, a. m./p. m.) */
  const m = s.match(
    /^(?:(\d{1,2})\s+(?:de\s+)?([a-záéíóúñ]+)(?:\s+(?:de\s+)?(\d{4}))?\s*,?\s*)?(\d{1,2}):(\d{2})(?:\s*(a|p)\s*\.?\s*m\.?)?\s*$/i
  );
  if (!m) return null;

  let dia = m[1] ? parseInt(m[1], 10) : null;
  const mesTxt = m[2] ? m[2].toLowerCase() : null;
  let anio = m[3] ? parseInt(m[3], 10) : null;
  let hh = parseInt(m[4], 10);
  const mi = parseInt(m[5], 10);
  const ampm = (m[6] || '').toLowerCase();

  if (mi > 59 || hh > 23) return null;
  if (ampm === 'p' && hh < 12) hh += 12;   // 8:00 p. m. → 20:00
  if (ampm === 'a' && hh === 12) hh = 0;   // 12:05 a. m. → 00:05
  if (ampm === 'p' && hh === 12) hh = 12;  // 12:30 p. m. → 12:30 (explícito)

  if (mesTxt && !MESES[mesTxt]) return null; // palabra que no es mes
  const mes = mesTxt ? MESES[mesTxt] : null;

  if (dia == null) {
    /* «20:00» sin fecha: hoy en la zona de la cuenta */
    const h = ahoraZona(off);
    dia = h.dia; anio = h.anio;
    if (mes == null) { return Date.UTC(h.anio, h.mes - 1, h.dia, hh, mi) - off * 60000; }
  }
  /* v3.2.16 — el año por defecto es el de la ZONA DE LA CUENTA (Lima), no
     el de UTC: el 31 dic por la noche en Lima ya es 1 de enero en UTC y el
     año tomado de UTC sería uno más del correcto */
  if (anio == null) anio = ahoraZona(off).anio;
  if (!mes || !anio || !dia || dia < 1 || dia > 31) return null;

  /* la hora se mostró en la zona de la cuenta → epoch en UTC */
  return Date.UTC(anio, mes - 1, dia, hh, mi) - off * 60000;
}

/** Quita la extensión del archivo para ampliar coincidencias. */
function baseDe(archivo) {
  if (typeof archivo !== 'string' || !archivo.trim()) {
    throw new TypeError('El nombre del archivo debe ser una cadena no vacía.');
  }
  return archivo.replace(/\.[^.\\/]+$/, '').trim();
}

/** Normaliza un texto para comparar (minúsculas, sin espacios ni signos). */
function normalizar(s) {
  return String(s || '').toLowerCase().replace(/[\s_\-.,;:()"'¿?¡!]+/g, '');
}

/** ¿La fila de resultado menciona el archivo buscado? */
function filaCoincide(textoFila, base) {
  const n = normalizar(base);
  return !!n && normalizar(textoFila).indexOf(n) >= 0;
}

/** v3.2.14 — Nombre de archivo COMPARABLE: minúsculas, sin extensión, sin
    el «(n)» con que Gmail renombra adjuntos duplicados y sin espacios ni
    signos. Es la comparación del ORDEN exigido por el usuario: el nombre
    del adjunto del correo debe hacer MATCH con el del archivo cargado
    («PV CIX LIM        2226.pdf» == «pv cix lim 2226» == «PV CIX (1).pdf»).
    v3.2.16 — se quitan TODOS los «(n)» finales, no solo uno: al descargar
    dos veces un adjunto que Gmail ya renombró, el archivo queda
    «ATC CM468 11NOV (1) (1).pdf» y con un solo recorte la comparación
    daba «atccm46811nov1» ≠ «atccm46811nov» → ningún correo hacía match y
    la hora jamás se capturaba. */
function nombreComparable(s) {
  return normalizar(String(s || '').replace(/\.[^.\\/]+$/, '').replace(/(?:\s*\(\d+\))+\s*$/, ''));
}

/** v3.2.14 — ¿Algún adjunto de la lista coincide con el archivo cargado? */
function adjuntoCoincide(archivo, adjuntos) {
  const n = nombreComparable(archivo);
  if (!n) return false;
  return (adjuntos || []).some((a) => nombreComparable(a) === n);
}

module.exports = { parseHoraGmail, baseDe, filaCoincide, normalizar, ahoraZona, MESES, nombreComparable, adjuntoCoincide };
