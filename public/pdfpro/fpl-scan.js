/* PDFPro — fpl-scan.js (v2.9.20)
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

/** Partículas de nombres («María del Carmen»): nunca son por sí solas el
 *  apellido paterno. «San»/«Santa»/«Santo» NO van aquí: casi siempre
 *  INICIAN un apellido compuesto («San Martín», «Santa Cruz»). */
var _PARTICULA = /^(de|del|la|las|los|van|von|mac|mc|di|da|dos)$/i;
var _SAN = /^(san|santa|santo)$/i;
/** Palabras que casi siempre son SEGUNDO nombre y casi nunca apellido
 *  paterno. SOLO se usan para nombres de 3 palabras, para decidir si la
 *  2.ª palabra es nombre («Ana María Torres» → nombres «Ana María» +
 *  paterno «Torres») o apellido («José Ramírez Díaz» → paterno «Ramírez»). */
var _SEG_NOMBRE = {
  maria:1, jose:1, juan:1, luis:1, ana:1, rosa:1, carmen:1, elena:1, isabel:1,
  cristina:1, sofia:1, fernanda:1, valeria:1, gabriela:1, alejandra:1,
  guadalupe:1, esperanza:1, gloria:1, luz:1, ines:1, mercedes:1, teresa:1,
  lucia:1, clara:1, alicia:1, sara:1, marta:1, irene:1, camila:1, daniela:1,
  monica:1, olga:1, ruth:1, susana:1, veronica:1, ximena:1, silvia:1,
  virginia:1, patricia:1, norma:1, carlos:1, jorge:1, miguel:1, rafael:1,
  alberto:1, fernando:1, andres:1, eduardo:1, enrique:1, ernesto:1,
  francisco:1, gabriel:1, gonzalo:1, gustavo:1, jaime:1, javier:1, jesus:1,
  joaquin:1, julio:1, mateo:1, nicolas:1, oscar:1, pablo:1, pedro:1, ramon:1,
  raul:1, ricardo:1, rodrigo:1, samuel:1, santiago:1, sebastian:1, sergio:1,
  vicente:1, victor:1, pilar:1, rocio:1, angeles:1, angel:1,
  // nombres de la oficina / modernos peruanos (v2.9.19-20)
  marcos:1, roberto:1, dave:1, david:1, daniel:1, michelle:1, melissa:1, mellisa:1,
  melciades:1, melquiades:1, jacqueline:1, francessca:1, francesca:1,
  ruswel:1, frank:1, william:1, kevin:1, brayan:1, alexander:1, alexis:1,
  jhon:1, jhonatan:1, marcelo:1, walter:1, wilfredo:1, omar:1, nelson:1,
  roger:1, rolando:1, ronald:1, cesar:1, hugo:1, ivan:1, marco:1, mauro:1,
  milagros:1, nayeli:1, patricio:1, paul:1, renzo:1, roxana:1, sandro:1,
  vanessa:1, yesenia:1, yolanda:1, erick:1, jimena:1, antonella:1,
  valentina:1, julieta:1, renata:1, beatriz:1, blanca:1, carla:1, cecilia:1,
  consuelo:1, emilia:1, estela:1, fabiola:1, gisela:1, hilda:1, irma:1,
  judith:1, leonor:1, lourdes:1, magaly:1, magali:1, maribel:1, marisol:1,
  miriam:1, natalia:1, noemi:1, raquel:1, sandra:1, shirley:1, viviana:1,
  angela:1, claudia:1, wendy:1, debora:1, estefania:1, gerald:1, karina:1,
  katherine:1, liliana:1, lorena:1, lucero:1, mariana:1, maritza:1,
  micaela:1, nadia:1, nathalie:1, pamela:1, priscila:1, soledad:1, tamara:1,
  tatiana:1, thalia:1, victoria:1, yasmin:1
};
function _sinTildes(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Iniciales del operador — SOLO 2 LETRAS: la PRIMERA es la inicial del
 *  PRIMER NOMBRE y la SEGUNDA la inicial del APELLIDO PATERNO.
 *  Convención de la oficina (ejemplos verificados): con 4 palabras el
 *  nombre es nombre1 + nombre2 + PATERNO + materno, y el paterno es la
 *  3.ª palabra:
 *  · «Marcos Roberto Koo Paz»           → MK
 *  · «Frank Dave Asian Castro»          → FA
 *  · «Ruswel Melciades Cacho Paredes»   → RC
 *  · «Jacqueline Cristina Vílchez Aguirre»   → JV
 *  · «Francessca Michelle Chumpitaz Court»   → FC
 *  v2.9.20 — TAMBIÉN acepta el orden «Apellidos y Nombres» (como pedía
 *  el formulario de registro): si hay una coma, lo de antes son los
 *  apellidos («Koo Paz, Marcos Roberto»); si no la hay, un nombre de
 *  pila donde iría el apellido delata el orden («Koo Paz Marcos
 *  Roberto», «Koo Marcos») y se dan la vuelta:
 *  · «Koo Paz, Marcos Roberto» → MK · «Koo Paz Marcos Roberto» → MK ·
 *    «Koo Paz Marcos» → MK · «Koo Marcos Roberto» → MK · «Koo Marcos» → MK
 *  Con 3 palabras en orden normal: si la 2.ª es un segundo nombre
 *  típico o partícula, el paterno es la 3.ª («Ana María Torres» → AT);
 *  si no, es la 2.ª («José Ramírez Díaz» → JR). Partículas: «María del
 *  Carmen Rojas» → MR. «San/Santa» inicia el apellido («Juan San
 *  Martín Palacios» → JS). Títulos ignorados («Sr.»). 1 palabra → 1 letra. */
function inicialesDe(nombre) {
  var s = String(nombre || '').trim();
  // «Apellidos, Nombres» (formato antiguo del formulario): la coma separa
  // apellidos de nombres → nombres primero («Koo Paz, Marcos Roberto» →
  // «Marcos Roberto Koo Paz»)
  var coma = s.indexOf(',');
  if (coma !== -1) s = s.slice(coma + 1).trim() + ' ' + s.slice(0, coma).replace(/,/g, '').trim();
  var w = s.replace(/,/g, ' ').split(/\s+/).filter(Boolean);
  while (w.length && /\.$/.test(w[0])) w.shift(); // títulos: «Sr.», «Ing.»…
  if (!w.length) return '';
  if (w.length === 1) return w[0].charAt(0).toUpperCase();
  var dado = function (x) { return !!_SEG_NOMBRE[_sinTildes(x)]; };
  if (w.length === 2) {
    // «Koo Marcos» (apellidos y nombres) → MK · «Marcos Koo» → MK
    if (!dado(w[0]) && dado(w[1])) return (w[1].charAt(0) + w[0].charAt(0)).toUpperCase();
    return (w[0].charAt(0) + w[1].charAt(0)).toUpperCase();
  }
  if (w.length === 3) {
    // «Apellidos y Nombres» sin coma: un nombre de pila donde iría el
    // apellido delata el orden → «Koo Paz Marcos» · «Koo Marcos Roberto»
    if (!dado(w[0]) && !dado(w[1]) && dado(w[2])) return (w[2].charAt(0) + w[0].charAt(0)).toUpperCase();
    if (!dado(w[0]) && dado(w[1]) && dado(w[2])) return (w[1].charAt(0) + w[0].charAt(0)).toUpperCase();
    // orden normal: «Ana María Torres» (nombres «Ana María» + paterno) o
    // «José Ramírez Díaz» (nombre + paterno + materno)
    if (_PARTICULA.test(w[1]) || dado(w[1]))
      return (w[0].charAt(0) + w[2].charAt(0)).toUpperCase();
    return (w[0].charAt(0) + w[1].charAt(0)).toUpperCase();
  }
  // 4+ palabras — convención de la oficina: nombre1 + nombre2 + paterno +
  // materno → el paterno es la 3.ª palabra («Marcos Roberto Koo Paz» → MK).
  if (_SAN.test(w[1])) return (w[0].charAt(0) + w[1].charAt(0)).toUpperCase(); // «San Martín» inicia el apellido
  if (_PARTICULA.test(w[1])) { // «María del Carmen Rojas»: el nombre sigue
    var i = 1;
    while (i < w.length - 1 && (_PARTICULA.test(w[i]) || dado(w[i]))) i++;
    return (w[0].charAt(0) + w[i].charAt(0)).toUpperCase();
  }
  // «Apellidos y Nombres» sin coma: «Koo Paz Marcos Roberto» — las dos
  // primeras no son nombres de pila y la 3.ª sí → dar la vuelta
  if (!dado(w[0]) && !dado(w[1]) && dado(w[2])) return (w[2].charAt(0) + w[0].charAt(0)).toUpperCase();
  return (w[0].charAt(0) + w[2].charAt(0)).toUpperCase();
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
