/* PDFPro — fpl-scan.js (v2.9.17)
 * Escaneo del FPL cargado: recoge la MATRÍCULA de la aeronave/espacio del
 * casillero 7 (identificación de aeronave) o del casillero 18 (ítem REG/,
 * ej. REG/OB2147) y las copia a «Matrícula (Aeronave / Espacio)».
 * Módulo puro: se usa en el navegador (window.FPLScan) y en Node (pruebas). */
'use strict';

function _limpia(v) {
  return String(v || '').toUpperCase().replace(/\s+/g, '').trim();
}

/** Normaliza una matrícula capturada:
 *  OB-1630 / OB 1630 / OB1630 → OB1630 (convención de la oficina);
 *  «0B…» (OCR que confunde la O con cero) → OB…; el resto se mantiene. */
function _norm(v) {
  var m = _limpia(v);
  if (!m) return '';
  if (/^0B/.test(m)) m = 'O' + m.slice(1); // OCR: 0B1630 → OB1630
  var ob = m.match(/^OB-?([0-9A-Z]{3,5})$/);
  if (ob) return 'OB' + ob[1];
  return m;
}

/** Une caracteres sueltos separados por espacios o comas: los formularios
 *  de las líneas aéreas traen UNA CASILLA POR CARÁCTER y el texto extraído
 *  queda «C M P 4 6 8» (o «C,M,P,4,6,8» al pasar el Excel a CSV) → «CMP468».
 *  Solo une letras/números MAYÚSCULOS de un carácter (las matrículas van en
 *  mayúsculas), así que el texto normal queda intacto. */
function _compacta(t) {
  return String(t || '').replace(/([0-9A-Z])[\s,]+(?=[0-9A-Z](?:[\s,]|$))/g, '$1');
}

/** Extrae {matricula, origen} del texto del FPL; null si no encuentra.
 *  Orden de búsqueda:
 *   1. Casillero 18 — ítem «REG/» (la matrícula explícita tiene prioridad)
 *   2. Mensaje télex OACI — «(FPL-<identificación>-…» (campo 7; también
 *      CHG/DLA/DEP/ARR/CNL)
 *   3. Formulario impreso — etiqueta «IDENTIFICACIÓN DE AERONAVE» /
 *      «AIRCRAFT IDENTIFICATION» seguida del valor
 *   4. Patrón suelto — matrícula peruana OB#### / OB-ABC en el texto
 *      (y prefijos vecinos HC/CP/CC/HK/XA/LV/LQ con guion)
 *  Si nada coincide, reintentará sobre el texto «compactado» (caracteres
 *  sueltos de los formularios con casillas: «O B 2 1 4 7» → «OB2147»). */
function extraerMatricula(texto) {
  var t = String(texto || '');
  if (!t.trim()) return null;
  return _buscar(t) || _buscar(_compacta(t));
}

function _buscar(t) {
  var r;

  // 1) Casillero 18: REG/OB2147, REG/OB-ABC, REG/HC-COAS, REG/9V-OJK…
  r = t.match(/\bREG\s*\/\s*([0-9A-Z]{1,3}[-\u00AD\s]?[0-9A-Z]{2,5})/i);
  if (r) { var v1 = _norm(r[1]); if (v1) return { matricula: v1, origen: 'casillero 18 (REG/)' }; }

  // 2) Mensaje télex: (FPL-OB1630-IS … también (CHG-, (CNL-, (DEP-…
  r = t.match(/\(?\s*(FPL|CHG|DLA|DEP|ARR|CNL)\s*[-\u2013]([A-Z0-9]{2,7})\s*[-\u2013]/i);
  if (r) { var v2 = _norm(r[2]); if (v2) return { matricula: v2, origen: 'casillero 7 (mensaje ' + r[1].toUpperCase() + ')' }; }

  // 3) Formulario: etiqueta del casillero 7 seguida del valor
  //    ([\s,]* — al pasar el Excel a CSV las palabras quedan «A,B,C»)
  r = t.match(/IDENTIFICACI[ÓO]N[\s,]*DE[\s,]*AERONAVE[^A-Z0-9]{0,60}([A-Z]{1,3}[-\u00AD\s]?[0-9A-Z]{2,5})/i)
    || t.match(/AIRCRAFT\s+IDENTIFICATION[^A-Z0-9]{0,60}([A-Z]{1,3}[-\u00AD\s]?[0-9A-Z]{2,5})/i);
  if (r) { var v3 = _norm(r[1]); if (v3) return { matricula: v3, origen: 'casillero 7 (formulario)' }; }

  // 4) Patrón suelto: OB####, OB-ABC, OB 1630 (Perú)… El lookahead
  //    impide falsas alarmas con palabras como «OBSTÁCULO» o «OBSTACLE»
  r = t.match(/\bOB[-\s]?([0-9]{3,4}|[A-Z]{2,4})(?![A-ZÁÉÍÓÚÜÑ0-9])/i);
  if (r) return { matricula: _norm('OB' + r[1]), origen: 'texto del FPL' };

  // …y prefijos vecinos con guion (HC-Ecuador, CP-Bolivia, CC-Chile…)
  r = t.match(/\b(HC|CP|CC|HK|XA|LV|LQ|YV)-([A-Z0-9]{2,4})\b/i);
  if (r) return { matricula: _norm(r[0]), origen: 'texto del FPL' };

  return null;
}

/** Iniciales del operador — SOLO 2 LETRAS: inicial del PRIMER NOMBRE +
 *  inicial del APELLIDO PATERNO (convención peruana «nombres + paterno +
 *  materno»: con 3+ palabras el paterno es la penúltima).
 *  «Marcos Koo» → MK · «Ana María Torres Vega» → AT · «José Ramírez Díaz» → JR.
 *  Con una sola palabra solo hay inicial de nombre (ej. «Cher» → C). */
function inicialesDe(nombre) {
  var w = String(nombre || '').trim().split(/\s+/).filter(Boolean);
  if (!w.length) return '';
  if (w.length === 1) return w[0].charAt(0).toUpperCase();
  var paterno = (w.length === 2) ? w[1] : w[w.length - 2];
  return (w[0].charAt(0) + paterno.charAt(0)).toUpperCase();
}

/** ¿El texto parece un FPL (formulario o mensaje télex)? Se usa para avisar
 *  «FPL sin matrícula reconocida» solo cuando el archivo ES un plan de
 *  vuelo (no con un oficio o NOTAM cualquiera). */
function pareceFPL(texto) {
  var t = _compacta(String(texto || '')).toUpperCase().replace(/[\s,]+/g, ' ');
  if (!t) return false;
  var ind = Math.max(t.indexOf('PLAN DE VUELO'), t.indexOf('FLIGHT PLAN'), t.indexOf('(FPL-'));
  if (ind === -1) return false;
  // …y algo de contenido después de la portada (evita avisos por una mención suelta)
  return t.slice(ind + 14).replace(/[^A-Z0-9]/g, '').length >= 40;
}

var API = { extraerMatricula: extraerMatricula, inicialesDe: inicialesDe, pareceFPL: pareceFPL, _norm: _norm, _compacta: _compacta };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
if (typeof window !== 'undefined') window.FPLScan = API;
