/* PDFPro — fpl-scan.js (v2.9.24)
 * Escaneo del FPL cargado, según la doctrina OACI:
 *
 *   · Doc 4444 (PANS-ATM), Apéndice 2, CASILLERO 7 «IDENTIFICACIÓN DE
 *     AERONAVE» (máx. 7 caracteres alfanuméricos, sin guiones): es BIEN
 *     la MATRÍCULA — Anexo 7: marca de nacionalidad + marca de matrícula,
 *     p.ej. OB1630; Perú = OB (RAP 45.205: OB + números correlativos,
 *     provisional OB1234P, traslado OB1234T) — BIEN el designador OACI de
 *     la empresa + identificación del vuelo (Doc 8585; p.ej. CMP468 Copa,
 *     LPE1234 LATAM Perú, FAP211 FAP).
 *   · Doc 4444, CASILLERO 18, ítem REG/: «la marca de nacionalidad y la de
 *     matrícula de la aeronave, SI DIFIERE de la identificación del
 *     casillero 7». Es decir: REG/ solo hace falta cuando el casillero 7
 *     lleva designador + nº de vuelo.
 *
 *   → ORDEN DE BÚSQUEDA (v2.9.21, como pide la oficina): si el casillero 7
 *     YA trae la matrícula, se usa ESA y no se busca en el casillero 18;
 *     el REG/ del 18 queda como respaldo para los vuelos con designador.
 *     Con casillero 7 vacío también se acude al REG/.
 *
 *   Además v2.9.21 corrige un defecto real: en los formularios impresos
 *     (una casilla por carácter) la etiqueta «Aircraft Identification»
 *     seguida de la etiqueta «Flight Rules» hacía que se capturara la
 *     palabra «FLIGHT»/«FLIGT» como matrícula («FlightPlan SPHI-SPST.pdf»,
 *     matrícula OB1630 en el casillero 7). Ahora todo valor capturado se
 *     VALIDA (matrícula / identificación de vuelo / palabra prohibida) y
 *     los formularios se leen por GEOMETRÍA: con las coordenadas de cada
 *     casilla se reconstruye la fila del casillero 7 en orden visual
 *     izquierda→derecha (el orden del texto interno llega revuelto:
 *     «4 6 8 … C M P»).
 *
 *   Además v2.9.22 corrige la FALLA DE PRESENTACIÓN del piloto en los FPL
 *     de los operadores estatales del Perú (PDF «FAP 001 13-11.pdf»): el
 *     ítem del casillero 18 se escribe SIN la barra y con los dígitos
 *     separados — «REG FAP 329» en vez de «REG/FAP329». Siglas: FAP (Fuerza
 *     Aérea del Perú), INP (Instituto Naval del Perú), PNP (Policía
 *     Nacional del Perú), EP (Ejército del Perú); lo mismo ocurre en otros
 *     países cambiando las siglas. La sigla + número tras REG es la
 *     MATRÍCULA DE LA AERONAVE (FAP329/INP255/PNP042/EP828), aunque ese
 *     mismo formato en el casillero 7 es designador + NÚMERO DE VUELO
 *     (FAP001): el CONTEXTO del casillero decide qué es.
 *
 *   Además v2.9.23 — VUELO DEL JEFE DE ESTADO (petición de la oficina): la
 *     sigla del operador estatal + «001» en el casillero 7 (FAP001, EP001,
 *     PNP001, INP001) identifica el vuelo que TRANSPORTA AL JEFE DE ESTADO.
 *     En ese caso el casillero «Matrícula» de la app lleva VUELO + MATRÍCULA:
 *     «EP001 - EP246» (plan de vuelo EP001 cuya aeronave es EP246). El aviso
 *     lo marca con «· JEFE DE ESTADO». Solo el «001»: FAP002 etc. son vuelos
 *     ordinarios y el campo lleva solo la matrícula. Otros países: añadir su
 *     sigla a _JEFEE.
 *
 * Módulo puro: se usa en el navegador (window.FPLScan) y en Node (pruebas). */
'use strict';

function _limpia(v) {
  return String(v || '').toUpperCase().replace(/\s+/g, '').trim();
}
function _sinAcentos(s) {
  return String(s || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Normaliza una matrícula capturada:
 *  OB-1630 / OB 1630 / OB1630 → OB1630 (convención de la oficina);
 *  «0B…» (OCR que confunde la O con cero) → OB…; «FAP-329» (operador
 *  estatal con guion) → FAP329; «HC-COAS» (letras tras el guion) se
 *  mantiene. El resto se mantiene. */
function _norm(v) {
  var m = _limpia(v);
  if (!m) return '';
  if (/^0B/.test(m)) m = 'O' + m.slice(1); // OCR: 0B1630 → OB1630
  var ob = m.match(/^OB-?([0-9A-Z]{3,5})$/);
  if (ob) return 'OB' + ob[1];
  // operador estatal / prefijo + número con guion: «FAP-329» → FAP329
  // (solo si tras el guion viene DÍGITO: «HC-COAS»/«9V-OJK» se quedan igual)
  var est = m.match(/^([A-Z]{1,3})-([0-9][0-9A-Z]{0,5})$/);
  if (est) return est[1] + est[2];
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

/* ══ Doctrine OACI: ¿el identificador del casillero 7 ES la matrícula? ══ */

/* Designadores OACI de 3 letras (Doc 8585 / FAA JO 7340.2) que se prestan a
 * confusión con matrícula — los «OB…» (OBC, OBJ, OBK, OBS, OBT existen como
 * designadores) y los que chocan con prefijos vecinos (CCA Air China vs
 * Chile CC-ABC…). Incluye los OPERADORES ESTATALES del Perú que aparecen en
 * el casillero 7 como designador + nº de vuelo (FAP001, INP255, PNP042…):
 * FAP Fuerza Aérea · INP Instituto Naval · PNP Policía Nacional (EP
 * Ejército es de 2 letras y ya queda fuera de las matrículas por sí solo).
 * Se aplica solo cuando lo que sigue es TODO NÚMEROS:
 * «CCA486» = designador + nº de vuelo; «CCABC» (CC-ABC, letras) = matrícula. */
var _DESIGNADOR = /^(OBC|OBJ|OBK|OBS|OBT|CMP|LPE|LAN|SKU|AMP|ATC|AVA|TPU|JAP|SKX|VPE|AND|LCB|SRU|APU|CPR|KLM|NGA|NLA|JTR|TAE|BAW|AEA|IBE|AAL|UAL|DAL|CCA|ACA|AMX|GLO|AZU|ARG|FAB|FAP|FPR|INP|PNP)$/;

/* Palabras que NUNCA pueden ser matrícula ni identificación de vuelo:
 * etiquetas del formulario bilingüe («Flight Rules» → se colaba «FLIGHT»/
 * «FLIGT»), tipos de mensaje e indicadores del casillero 18. Emparejado
 * completo (las matrículas reales nunca coinciden con estas palabras). */
var _PALABRA = /^(FPL|CHG|DLA|DEP|ARR|CNL|COR|CDN|ALR|RCL|FIGHT|FLIGHT|FLIGT|FLIHT|RULES|TYPE|PLAN|PRIORITY|VUELO|REGLAS|TIPO|MENSAGE|MENSAJE|MESSAGE|AERONAVE|AIRCRAFT|IDENTIFICATION|IDENTIFICACION|EXACTA|NUMBER|NUMERO|DEPOSITO|REMITENTE|ENDURANCE|AUTONOMIA|PERSONAS|EQUIPO|SURVIVAL|JACKETS|DINGHIES|CAPACITY|COLOR|COLLOR|MARKING|OBSERVACIONES|REMARKS|PILOTO|COMAND|FILED|SPACE|RESERVED|ADDITIONAL|REQUERIMENTS|NAV|SUR|REG|SEL|DOF|EET|EEET|PBN|RMK|CODE|OPR|PER|SKED|DCT|STS|TYP|ALT|RALT|TALT|ENR|RIF|REF|DAT|EQT)$/;

/** ¿El identificador del casillero 7 es la MATRÍCULA? (Doc 4444 Ap. 2,
 *  opción b: marca de nacionalidad + marca de matrícula del Anexo 7).
 *  Formatos reconocidos (Anexo 7 · RAP 45.205 peruana · países vecinos):
 *   Perú     OB + 3-4 (OB1630, OB-2147; provisional OB1234P, traslado OB1234T)
 *   Vecinos  CC Chile · HC Ecuador · CP/HJ Bolivia · HK Colombia · XA/XB/XC
 *            México · LV/LQ Argentina · YV Venezuela · HP Panamá · PP/PR/PS/
 *            PT/PU Brasil + 3-4 caracteres (HCCGF, HC-COAS…)
 *   EE.UU.   N + 1-4 dígitos + 0-2 letras (N2567GA — ejemplo del Doc 4444;
 *            dígitos primero: así «NGA213» no se hace pasar por matrícula)
 *   Otros    4X Israel · 9V Singapur · 9H Malta · 9A Croacia · 9G Ghana
 *  Los códigos OACI de aeródromo de 4 letras (SPJC, SPST, SKBQ…) quedan
 *  fuera: solo tienen 2 caracteres tras el prefijo. Antes se descarta que
 *  sea designador + nº de vuelo (Doc 8585) o palabra de etiqueta. */
function esMatricula(id) {
  var m = _limpia(id).replace(/[^A-Z0-9]/g, '');
  if (!m || m.length < 4 || m.length > 7) return false;
  if (_PALABRA.test(m)) return false;
  if (/^[A-Z]{3}$/.test(m.slice(0, 3)) && _DESIGNADOR.test(m.slice(0, 3)) && /^[0-9]+$/.test(m.slice(3))) return false;
  if (/^OB[0-9]{3,4}[PT]?$/.test(m)) return true;   // Perú (RAP 45.205)
  if (/^OB[A-Z0-9]{3,4}$/.test(m)) return true;     // Perú, series con letras
  if (/^(CC|HC|CP|HJ|HK|XA|XB|XC|LV|LQ|YV|HP|PP|PR|PS|PT|PU|4X|9V|9H|9A|9G)[A-Z0-9]{3,4}$/.test(m)) return true;
  if (/^N[0-9]{1,4}[A-Z]{0,2}$/.test(m)) return true; // EE.UU. (N2567GA)
  return false;
}

/* ══ Fuentes de datos ══ */

/** Mensaje télex OACI — casillero 7: «(FPL-<ident>-…» (también CHG, DLA,
 *  DEP, ARR, CNL). Devuelve {ident, tipo} o null. */
function _telex(t) {
  var r = t.match(/\(?\s*(FPL|CHG|DLA|DEP|ARR|CNL)\s*[-\u2013]([A-Z0-9]{2,7})\s*[-\u2013]/i);
  return r ? { ident: _norm(_limpia(r[2]).replace(/[^A-Z0-9]/g, '')), tipo: r[1].toUpperCase() } : null;
}

/** Casillero 18 — ítem REG/: la matrícula explícita (Doc 4444: se usa
 *  cuando difiere de la del casillero 7). Devuelve {v, conBarra} o null.
 *  Formas aceptadas (v2.9.22):
 *    · «REG/OB1630», «REG/ HP 1520», «R E G / H P 1 5 2 0» — formato Doc
 *      4444 CON barra: el indicador es explícito y el valor, confiable;
 *    · «REG FAP 329» — FALLA DE PRESENTACIÓN del piloto (FPL de operadores
 *      estatales: FAP/INP/PNP/EP peruanos, siglas propias en otros países):
 *      sin «/» y con los dígitos separados. «REG» debe ir como PALABRA
 *      SUELTA y el valor debe parecer matrícula (Anexo 7 o SIGLA + NÚMERO
 *      de aeronave: FAP329, INP255, PNP042, EP828 — ese mismo formato en el
 *      casillero 7 sería designador + Nº DE VUELO; tras REG es matrícula);
 *    · «REGFAP329» todo pegado (casillas compactadas) — con DÍGITO
 *      obligatorio tras las siglas («REGISTRO»/«REGIMIENTO» no traen).
 *  Se valida: ≥4 caracteres, sin palabras de etiqueta (un «REG/» vacío
 *  seguido de otro indicador no puede colar «EET…»). */
function _regInfo(t) {
  var r, conBarra = true;
  // 1) formato Doc 4444 CON barra — indicador explícito: valor confiable
  r = t.match(/\bREG\s*\/\s*([0-9A-Z]{1,3}[-\u00AD\s]?[0-9A-Z]{2,5})/i);
  // 2) SIN barra (fallo del piloto): «REG» como palabra suelta — «REG FAP 329»,
  //    «REG OB 1630»; se tolera también «REG.»/«REG:» del OCR
  if (!r) { conBarra = false; r = t.match(/\bREG\b[\s:.,\-\/]*([0-9A-Z]{1,3}[-\u00AD\s]?[0-9A-Z]{2,5})/i); }
  // 3) todo PEGADO (casillas compactadas: «R E G F A P 3 2 9» → «REGFAP329»):
  //    primero con letras finales y frontera (N2567GA), luego solo dígitos
  if (!r) { conBarra = false; r = t.match(/\bREG([A-Z]{1,3}[0-9]{2,5}[A-Z]{0,2})(?![0-9A-Z])/i); }
  if (!r) { conBarra = false; r = t.match(/\bREG([A-Z]{1,3}[0-9]{2,5})/i); }
  if (!r) return null;
  var v = _norm(r[1]);
  if (!v || _PALABRA.test(v.replace(/[^A-Z]/g, ''))) return null;
  if (esMatricula(v)) return { v: v, conBarra: conBarra };
  // «REG/» explícito (con barra): el valor es confiable — p.ej. FAP329,
  // matrícula de aeronave de operador estatal (FAP/INP/PNP/EP…)
  if (conBarra) return /^[A-Z0-9-]{4,8}$/.test(v) ? { v: v, conBarra: true } : null;
  // sin «/»: solo si parece matrícula — SIGLA de operador + NÚMERO
  // (FAP329, INP255, PNP042, EP828…); palabras sueltas no entran
  return /^[A-Z]{1,3}[0-9][0-9A-Z]{0,4}$/.test(v) ? { v: v, conBarra: false } : null;
}
function _reg(t) { var i = _regInfo(t); return i ? i.v : ''; }

/** Formulario impreso — valor del casillero 7 tras la etiqueta, en TEXTO
 *  (si no hay geometría: OCR, Excel). El valor capturado ya NO se acepta a
 *  ciegas (v2.9.21): «Aircraft Identification … Flight Rules» hacía pasar
 *  «FLIGHT»/«FLIGT» por matrícula; ahora se valida. */
function _etiqueta(t) {
  var r = t.match(/IDENTIFICACI[ÓO]N[\s,]*DE[\s,]*(LA[\s,]*)?AERONAVE[^A-Z0-9]{0,60}([A-Z]{1,3}[-\u00AD\s]?[0-9A-Z]{2,5})/i)
       || t.match(/AIRCRAFT\s+IDENTIFICATION[^A-Z0-9]{0,60}([A-Z]{1,3}[-\u00AD\s]?[0-9A-Z]{2,5})/i);
  if (!r) return '';
  var v = _norm(r[r.length - 1]);
  if (!v || _PALABRA.test(v)) return '';
  return /^[A-Z0-9]{2,7}$/.test(v) ? v : '';
}

/** Patrón suelto en el texto: OB####, OB-ABC, OB 1630 (Perú)…
 *  · Con DÍGITOS se toleran 1-2 letras pegadas después (el OCR y los
 *    formularios compactados dejan el casillero 8 junto: «OB1630VG») y el
 *    sufijo oficial P/T (RAP 45: provisional OB1234P, traslado OB1234T);
 *    «OBSTÁCULO»/«OBSTACLE» no entran porque no traen dígitos.
 *  · Con LETRAS (OB-ABC) el lookahead es estricto. */
function _suelto(t) {
  // sufijo P/T separado (RAP 45: «OB-1234-P» provisional, «OB-1234-T» traslado)
  var r = t.match(/\bOB[-\s]?([0-9]{3,4})[-\s]([PT])(?![A-Z0-9])/i);
  if (r) return _norm('OB' + r[1] + r[2]);
  // pegado: tolera letras inmediatas (el casillero 8 queda junto: «OB1630VG»)
  // y el sufijo P/T contiguo («OB1234P»); «OBSTÁCULO»/«OBSTACLE» no traen dígitos
  r = t.match(/\bOB[-\s]?([0-9]{3,4}[PT]?)(?![0-9])/i);
  if (r) return _norm('OB' + r[1]);
  r = t.match(/\bOB[-\s]?([A-Z]{2,4})(?![A-ZÁÉÍÓÚÜÑ0-9])/i);
  if (r) return _norm('OB' + r[1]);
  // …y prefijos vecinos con guion (HC-Ecuador, CP-Bolivia, CC-Chile…): el
  // guion delata matrícula y evita confundirla con códigos de aeródromo
  r = t.match(/\b(HC|CP|CC|HK|XA|XB|LV|LQ|YV|HP|PP|PR|PT|PU|4X|9V|9H|9A|9G)-([A-Z0-9]{2,4})\b/i);
  if (r) return _norm(r[0]);
  return '';
}

/* ══ Casillero 7 por GEOMETRÍA (v2.9.21) ══
 * Los FPL impresos traen UNA CASILLA POR CARÁCTER y el orden interno del
 * texto llega revuelto («4 6 8 … C M P»). Con las coordenadas (pdf.js
 * transform) se reconstruye la fila de casillas del casillero 7 en orden
 * visual izquierda→derecha:
 *   · ancla: la etiqueta «IDENTIFICACIÓN DE AERONAVE» / «Aircraft
 *     Identification» y el «7.» de la misma fila;
 *   · límite derecho: el «8.» / «REGLAS…» de esa fila (las casillas del
 *     casillero 8 quedan fuera);
 *   · banda vertical: las casillas van justo DEBAJO de la etiqueta;
 *   · los caracteres se ordenan por X y se cortan por huecos grandes (>45 pt,
 *     p.ej. la separación hasta el casillero 8) → el primer grupo válido es
 *     la identificación del casillero 7. */
function identDeFormulario(items) {
  try {
    if (!items || !items.length) return '';
    var i, it, cap = null, num7 = null, num8 = null;
    for (i = 0; i < items.length; i++) {
      it = items[i];
      var s = _sinAcentos(String(it.str || '')).replace(/\s+/g, ' ').trim();
      if (!s) continue;
      if (!cap && /IDENTIFICACION DE (LA )?AERONAVE|AIRCRAFT IDENTIFICATION/.test(s)) cap = it;
      if (!num7 && /^7\.?$/.test(s)) num7 = it;
      if (!num8 && /^8\.?$/.test(s)) num8 = it;
    }
    if (!cap) return '';
    var usoNum7 = !!(num7 && Math.abs(num7.y - cap.y) < 12); // «7.» en la fila de la etiqueta
    var fila = usoNum7 ? num7.y : cap.y;                      // fila del ancla
    var x0 = usoNum7 ? num7.x : cap.x - 45;                   // casillas a la altura del «7.»
    var h = usoNum7 ? 24 : 16;                                // banda bajo el ancla (la fila del
    // «7.» queda 2 filas por encima de las casillas; la etiqueta inglesa, 1)
    var x1 = (num8 && Math.abs(num8.y - cap.y) < 12) ? num8.x : cap.x + 200;
    if (!(num8 && Math.abs(num8.y - cap.y) < 12)) {
      // límite derecho: «REGLAS/FLIGHT RULES/TIPO…» en la fila de la etiqueta
      var minX = x1;
      for (i = 0; i < items.length; i++) {
        var it2 = items[i];
        if (it2 === cap || it2.x <= cap.x) continue;
        var s2 = _sinAcentos(String(it2.str || '')).replace(/\s+/g, ' ').trim();
        if (Math.abs(it2.y - fila) < 6 && /^(REGLAS|FLIGHT|RULES|TIPO|TYPE)\b/.test(s2) && it2.x < minX) minX = it2.x;
      }
      x1 = minX;
    }
    var ch = [];
    for (i = 0; i < items.length; i++) {
      it = items[i];
      var c = String(it.str || '').trim();
      if (!/^[A-Z0-9]{1,3}$/i.test(c)) continue; // casillas: 1 carácter (a veces «CM», «468»)
      if (/^(FPL|CHG|DLA|DEP|ARR|CNL|DOF|EET|REG|SEL|PBN|RMK|NAV|SUR|CODE|OPR|PER)$/i.test(c)) continue;
      if (it.x >= x0 && it.x < x1 && it.y <= fila + 5 && it.y >= fila - h) ch.push(it);
    }
    ch.sort(function (a, b) { return a.x - b.x; });
    // cortar por huecos grandes (>45 pt): [C][M][P][4][6][8]   (8. REGLAS…)
    var grupos = [], cur = ch.length ? [ch[0]] : [];
    for (i = 1; i < ch.length; i++) {
      if (ch[i].x - ch[i - 1].x > 45) { grupos.push(cur); cur = []; }
      cur.push(ch[i]);
    }
    if (cur.length) grupos.push(cur);
    for (i = 0; i < grupos.length; i++) {
      var ident = grupos[i].map(function (o) { return String(o.str).trim().toUpperCase(); }).join('');
      if (/^[A-Z0-9]{2,7}$/.test(ident) && !_PALABRA.test(ident)) return ident;
    }
    return '';
  } catch (e) { return ''; }
}

/* ══ Extracción unificada (v2.9.24 — orden OACI + JEFE DE ESTADO + OCR) ══ */

/* Vuelos del JEFE DE ESTADO (v2.9.23, petición de la oficina): la sigla del
 * operador estatal + «001» en el casillero 7 (FAP001, EP001, PNP001, INP001)
 * transporta al Jefe de Estado → el campo «Matrícula» lleva VUELO - MATRÍCULA.
 * Solo el «001» exacto (FAP002 es un vuelo ordinario; LPE001/CMP001 son
 * vuelos comerciales y NO entran). Otros países: añadir la sigla aquí. */
var _JEFEE = /^(FAP|INP|PNP|EP)001$/;

/* v2.9.24 — FPL FOTOGRAFIADO/ESCANEADO (OCR): los FPL de operadores estatales
 * llegan como FOTO (WhatsApp) o escaneo; el OCR lee el formulario casilla por
 * casilla («F A P 0 0 1 I S») y la ETIQUETA del casillero 7 deja de servir de
 * ancla: entre «IDENTIFICACION DE AERONAVE» y las casillas están las demás
 * etiquetas de la fila («REGLAS DE VUELO»/«FLIGHT RULES»). El vuelo del Jefe
 * de Estado es SIEMPRE sigla estatal + «001»: si el texto (directo o
 * compactado) trae un (FAP|INP|PNP|EP)001 con bordes limpios — no pegado a
 * otra palabra ni al ítem REG («REGFAP329» no lo dispara) — ese es el vuelo.
 * Tras «001» se toleran hasta 2 letras (las casillas 8/9 de la misma fila:
 * «FAP001IS») pero nunca dígitos («FAP0012» no es el vuelo). */
var _PRESI = /(?:^|[^A-Z0-9])(FAP|INP|PNP|EP)001([A-Z]{0,2})(?![A-Z0-9])/;

/** Une las corridas de caracteres sueltos (una casilla por carácter, como
 *  lee el OCR los formularios fotografiados): «F A P 0 0 1 I S» →
 *  «FAP001IS», SIN pegarlas a las palabras vecinas — a diferencia de
 *  _compacta, que produce «RULESFAP001IS» y rompe los bordes del patrón.
 *  v2: los RECUADROS del formulario los lee el OCR como «|», «[», «-»…
 *  entre carácter y carácter («F|A|P|0|0|1»), así que la corrida se corta
 *  por cualquier separador NO alfanumérico, no solo espacios. LÍNEA A
 *  LÍNEA: las casillas son de una fila visual y un suelto de la línea
 *  siguiente («9. NUMERO») no debe pegarse al ident. */
function _casillas(t) {
  return String(t || '').toUpperCase().split(/\n+/).map(function (ln) {
    var out = [], cur = '';
    ln.split(/[^0-9A-Z]+/).forEach(function (w) {
      if (!w) return;
      if (w.length === 1) { cur += w; return; }
      if (cur) { out.push(cur); cur = ''; }
      out.push(w);
    });
    if (cur) out.push(cur);
    return out.join(' ');
  }).join('\n');
}

/** Vuelo presidencial presente en el texto (OCR/foto) aunque la etiqueta del
 *  casillero 7 no sirviera de ancla. Devuelve «FAP001» o ''. */
function _vueloPresidencial(t) {
  var s = String(t || '').toUpperCase();
  var m = s.match(_PRESI) || _casillas(s).match(_PRESI);
  return m ? m[1] + '001' : '';
}

/** ¿El ident capturado ES el vuelo presidencial con las casillas 8/9 pegadas
 *  («EP001IG» = vuelo EP001 + reglas I + tipo G)? Devuelve el vuelo limpio
 *  («EP001») o ''. Solo para la sigla estatal + «001»: un vuelo ordinario
 *  con casillas pegadas (CMP468IS) se deja tal cual. */
function _presi(ident) {
  var m = String(ident || '').toUpperCase().match(/^(FAP|INP|PNP|EP)001([A-Z]{0,2})$/);
  return m ? m[1] + '001' : '';
}

/** Post-proceso el resultado de extraerFPL: si la identificación del
 *  casillero 7 es un vuelo del Jefe de Estado (sigla estatal + 001) y hay
 *  matrícula, el campo muestra «EP001 - EP246» (vuelo - matrícula) y el
 *  aviso se marca con «· JEFE DE ESTADO». Sin matrícula queda solo el
 *  vuelo (EP001) pero el aviso igual la marca. */
function _final(r) {
  if (!r || !r.ident) return r;
  var id = String(r.ident).toUpperCase();
  if (!_JEFEE.test(id)) return r;
  if (r.matricula && r.matricula !== id) r.matricula = id + ' - ' + r.matricula;
  r.origen = r.origen + ' · JEFE DE ESTADO';
  return r;
}

/** Extrae {matricula, origen, ident} del FPL; null si no encuentra nada.
 *  texto — capa de texto (o texto OCR / celdas del Excel);
 *  items — OPCIONAL: ítems con geometría {str,x,y} del pdf.js (formulario
 *  impreso con casillas); en Node/aduana vale null.
 *
 *  Orden de búsqueda (Doc 4444, petición de la oficina):
 *   1. CASILLERO 7 — identificación de aeronave: geometría del formulario,
 *      mensaje télex «(FPL-…-», o etiqueta impresa. Si ES la matrícula
 *      (Anexo 7 / RAP 45) → esa ES la matrícula; NO se mira el casillero 18.
 *   2. CASILLERO 18 — ítem REG/ (respaldo cuando el 7 trae designador de
 *      empresa + nº de vuelo: CMP468, LPE1234, FAP001…). v2.9.22: también
 *      se acepta «REG FAP 329» — sin barra y con dígitos separados (fallo
 *      de presentación del piloto, FPL de operadores estatales: la sigla +
 *      número tras REG es la MATRÍCULA de la aeronave, p.ej. FAP329).
 *   3. PATRÓN SUELTO — matrícula OB#### / vecinos con guion en el texto.
 *  Si el casillero 7 trae un designador sin REG/, se devuelve esa
 *  identificación del vuelo (mejor eso que nada; el operador corrige).
 *  v2.9.23: vuelo del JEFE DE ESTADO (sigla estatal + 001) → el campo
 *  lleva «EP001 - EP246» (vuelo - matrícula).
 *  v2.9.24: FPL FOTOGRAFIADO/ESCANEADO — el OCR lee casilla por casilla y
 *  la etiqueta del 7 no ancla; el vuelo presidencial (sigla + «001») se
 *  rescata del texto directo/compactado. */
function extraerFPL(texto, items) {
  var t = String(texto || '');
  if (!t.trim() && !(items && items.length)) return null;

  // 1) casillero 7 — identificación de la aeronave
  var ident = '', origenIdent = 'casillero 7 (formulario)';
  var g = identDeFormulario(items);
  if (g) ident = g;
  var tx = _telex(t);
  if (!ident && tx) { ident = tx.ident; origenIdent = 'casillero 7 (mensaje ' + tx.tipo + ')'; }
  if (!ident) { var e1 = _etiqueta(t) || _etiqueta(_compacta(t)); if (e1) ident = e1; }
  // v2.9.24 — OCR/casillas: si al ident se le pegaron las casillas 8/9 de la
  // misma fila («EP001IG»), se recorta al vuelo cuando el núcleo es el
  // presidencial (sigla estatal + «001»)
  var pp = _presi(ident);
  if (pp) ident = pp;
  // v2.9.24 — FPL FOTOGRAFIADO/ESCANEADO (OCR): la etiqueta del casillero 7
  // no sirve de ancla en el texto leído casilla por casilla; el vuelo del
  // Jefe de Estado (sigla estatal + «001») se rescata del texto directo o
  // de las casillas compactadas («F A P 0 0 1 I S» → FAP001)
  if (!ident) {
    var vp = _vueloPresidencial(t);
    if (vp) { ident = vp; origenIdent = 'casillero 7 (casillas del formulario)'; }
  }
  if (ident && esMatricula(ident))
    return _final({ matricula: _norm(ident), origen: origenIdent, ident: _norm(ident) }); // el 7 YA trae la matrícula

  // 2) casillero 18 — REG/ (matrícula «si difiere de la del casillero 7»);
  //    v2.9.22: también «REG FAP 329» sin barra (fallo de presentación del
  //    piloto en los FPL de operadores estatales) y «REGFAP329» pegado
  var ri = _regInfo(t) || _regInfo(_compacta(t));
  if (ri)
    return _final({ matricula: ri.v,
             origen: 'casillero 18 (REG' + (ri.conBarra ? '/' : ' sin «/»') + ')' + (ident ? ' · vuelo ' + ident : ''),
             ident: ident });

  // 3) patrón suelto en el texto
  var su = _suelto(t) || _suelto(_compacta(t));
  if (su) return _final({ matricula: su, origen: 'texto del FPL', ident: ident });

  // casillero 7 con designador y sin REG/ → identificación del vuelo
  if (ident && /^[A-Z0-9]{2,7}$/.test(ident) && !_PALABRA.test(ident))
    return _final({ matricula: ident, origen: origenIdent + ' · identificación de vuelo', ident: ident });

  return null;
}

/** Compatibilidad (v2.9.15-20): solo texto. */
function extraerMatricula(texto) {
  var r = extraerFPL(texto, null);
  return r ? { matricula: r.matricula, origen: r.origen } : null;
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

var API = {
  extraerMatricula: extraerMatricula, extraerFPL: extraerFPL,
  identDeFormulario: identDeFormulario, esMatricula: esMatricula,
  inicialesDe: inicialesDe, pareceFPL: pareceFPL, _norm: _norm, _compacta: _compacta,
  _casillas: _casillas, _vueloPresidencial: _vueloPresidencial, _presi: _presi
};
if (typeof module !== 'undefined' && module.exports) module.exports = API;
if (typeof window !== 'undefined') window.FPLScan = API;
