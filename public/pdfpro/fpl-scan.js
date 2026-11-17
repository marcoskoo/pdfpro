/* PDFPro — fpl-scan.js (v2.9.25)
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
 *   Además v2.9.25 — VUELO EN FORMACIÓN (petición de la oficina): la
 *     presentación es «GUÍA + 1» — el casillero 7 trae el CALLSIGN de la
 *     formación con el número de aeronaves que la siguen («AVISPA + 1»,
 *     «BAZUCA+2», «NORTON + 3»; el callsign varía en nombre y número), el
 *     CASILLERO 9 «NÚMERO» trae el total de aeronaves (02) y el CASILLERO
 *     18 trae las MATRÍCULAS DE TODAS las aeronaves de la formación —
 *     «REG/FAP123 FAP124» (Doc 4444: REG/ lista las matrículas cuando
 *     difieren de la identificación del casillero 7). El campo «Matrícula
 *     (Aeronave / Espacio)» de la app recibe TODAS las matrículas
 *     separadas por espacio («FAP123 FAP124»), también cuando el ítem REG
 *     viene sin barra («REG FAP123 FAP124») o con las casillas del OCR
 *     pegadas («FAP123FAP124»). Se aceptan igual las matrículas del 18
 *     SIN ítem REG en los vuelos en formación («18: FAP123 FAP124»), y
 *     si el nº de aeronaves (casillero 9 o «+N» del 7) es mayor que las
 *     matrículas leídas, el aviso lo dice para completarlas a mano (el
 *     OCR de las FOTOS tiene ese límite y el campo admite 100 caracteres
 *     justamente para el ingreso manual).
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
 *  DEP, ARR, CNL). Devuelve {ident, tipo} o null. v2.9.25: admite el
 *  CALLSIGN DE FORMACIÓN con su «+N» — «(FPL-AVISPA+1-IS…». */
function _telex(t) {
  var r = t.match(/\(?\s*(FPL|CHG|DLA|DEP|ARR|CNL)\s*[-\u2013]([A-Z0-9]{2,7}(?:\+[0-9]{1,2})?)\s*[-\u2013]/i);
  return r ? { ident: _norm(_limpia(r[2]).replace(/[^A-Z0-9+]/g, '')), tipo: r[1].toUpperCase() } : null;
}

/** ¿Sigla de OPERADOR ESTATAL + número (matrícula de aeronave FAP329,
 *  INP255, PNP042, EP828…)? Se usa para validar las matrículas EXTRA del
 *  casillero 18 en los vuelos en formación (v2.9.25). Las siglas de las
 *  aerolíneas (Doc 8585: CMP, LPE…) quedan fuera: tras un REG/ un
 *  «CMP1234» no es matrícula; las siglas estatales peruanas (FAP, INP,
 *  PNP, EP) y las siglas extranjeras que NO son designador sí entran. */
function _siglaEstatal(v) {
  var m = String(v || '').toUpperCase().match(/^([A-Z]{1,3})[0-9][0-9A-Z]{0,4}$/);
  if (!m) return false;
  if (/^(FAP|INP|PNP|EP)$/.test(m[1])) return true;        // Perú (la oficina)
  return m[1].length < 3 || !_DESIGNADOR.test(m[1]);       // otra sigla que no sea aerolínea
}

/** Parte una corrida PEGADA de matrículas — el OCR de los formularios
 *  FOTOGRAFIADOS lee las casillas del casillero 18 una por una y al
 *  compactar quedan todas pegadas: «F A P 1 2 3 F A P 1 2 4» →
 *  «FAP123FAP124» → [«FAP123», «FAP124»]. Solo corridas de DOS o más
 *  unidades SIGLA(2-3)+NÚMERO(3-4); una corrida de una unidad va tal
 *  cual (así «OB1234P» provisional o «N2567GA» no se tocan). */
function _splitUnidades(s) {
  var u = String(s || '').toUpperCase();
  if (!/^((?:[A-Z]{2,3}[0-9]{3,4}){2,})$/.test(u)) return [u];
  return u.match(/[A-Z]{2,3}[0-9]{3,4}/g) || [u];
}

/** Casillero 18 — ítem REG/: la(s) matrícula(s) explícita(s) (Doc 4444:
 *  se usa(n) cuando difiere(n) de la(s) del casillero 7; en un VUELO EN
 *  FORMACIÓN lista las matrículas de TODAS las aeronaves). Devuelve
 *  {v, conBarra, todas} o null — v es la PRIMERA (compatibilidad) y
 *  todas el arreglo completo (formación: [«FAP123», «FAP124»]).
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
 *  v2.9.25 — FORMACIÓN: tras la primera matrícula se siguen recogiendo
 *  las demás mientras parezcan matrículas (separadas por espacio, coma o
 *  guion; también PEGADAS del OCR: «REG/FAP123FAP124»): «REG/FAP123
 *  FAP124», «REG FAP 329 FAP 330», «REG/OB1630-OB2147»…
 *  Se valida: ≥4 caracteres, sin palabras de etiqueta (un «REG/» vacío
 *  seguido de otro indicador no puede colar «EET…»). */
function _regInfo(t) {
  var r, conBarra = true;
  // 0) v2.9.25 — FORMACIÓN PEGADA del OCR: «REG FAP123FAP124» /
  //    «REGFAP329FAP330»: dos o más unidades SIGLA+NÚMERO seguidas. Va
  //    PRIMERO porque el patrón suelto (2) cortaría «FAP123FAP124» a la
  //    mitad («FAP123FA») al comerse caracteres de la segunda matrícula.
  //    Se tolera también la barra leída como «I»/«l»/«1»/«|» por el OCR
  //    de la FOTO («REG/FAP123FAP124» → «REGIFAP123FAP124»)
  r = t.match(/\bREG[Il1|]?\s*\/?\s*((?:[A-Z]{2,3}[0-9]{3,4}){2,})(?![0-9A-Z])/i);
  if (r) {
    var unidades = _splitUnidades(r[1]).map(_norm).filter(Boolean);
    if (unidades.length >= 2 && unidades.every(_regValida))
      return { v: unidades[0], conBarra: /\//.test(r[0].slice(0, r[0].length - r[1].length)), todas: unidades };
  }
  // 1) formato Doc 4444 CON barra — indicador explícito: valor confiable
  r = t.match(/\bREG\s*\/\s*([0-9A-Z]{1,3}[-\u00AD\s]?[0-9A-Z]{2,5})/i);
  // 2) SIN barra (fallo del piloto): «REG» como palabra suelta — «REG FAP 329»,
  //    «REG OB 1630»; se tolera también «REG.»/«REG:» del OCR
  if (!r) { conBarra = false; r = t.match(/\bREG\b[\s:.,\-\/]*([0-9A-Z]{1,3}[-\u00AD\s]?[0-9A-Z]{2,5})/i); }
  // 2b) v2.9.25 — OCR de la FOTO: la barra del «REG/» la lee Tesseract como
  //     «I»/«l»/«1»/«|» («REG/FAP123 FAP124» → «REGIFAP123 FAP124»); se
  //     acepta ESE carácter suelto pegado a REG. La captura exige estructura
  //     SIGLA+DÍGITO para que «REGLAS»/«REGISTRO» (la «L» mayúscula también
  //     cae en [Il1|] con /i) no hagan sombra al REGI de más abajo, y el
  //     valor se valida como matrícula conocida (civil o SIGLA estatal)
  if (!r) {
    var r2b = t.match(/\bREG[Il1|][\s:.,\-\/]*([A-Z]{1,3}[-\u00AD\s]?[0-9][0-9A-Z]{0,5})(?![0-9A-Z])/i);
    if (r2b) {
      var v2b = _norm(r2b[1]);
      if (v2b && !_PALABRA.test(v2b.replace(/[^A-Z]/g, '')) && _regValida(v2b))
        return { v: v2b, conBarra: false, todas: _regTodas(t, r2b, v2b) };
    }
  }
  // 3) todo PEGADO (casillas compactadas: «R E G F A P 3 2 9» → «REGFAP329»):
  //    primero con letras finales y frontera (N2567GA), luego solo dígitos
  if (!r) { conBarra = false; r = t.match(/\bREG([A-Z]{1,3}[0-9]{2,5}[A-Z]{0,2})(?![0-9A-Z])/i); }
  if (!r) { conBarra = false; r = t.match(/\bREG([A-Z]{1,3}[0-9]{2,5})/i); }
  if (!r) return null;
  var v = _norm(r[1]);
  if (!v || _PALABRA.test(v.replace(/[^A-Z]/g, ''))) return null;
  if (esMatricula(v)) return { v: v, conBarra: conBarra, todas: _regTodas(t, r, v) };
  // «REG/» explícito (con barra): el valor es confiable — p.ej. FAP329,
  // matrícula de aeronave de operador estatal (FAP/INP/PNP/EP…)
  if (conBarra) return /^[A-Z0-9-]{4,8}$/.test(v) ? { v: v, conBarra: true, todas: _regTodas(t, r, v) } : null;
  // sin «/»: solo si parece matrícula — SIGLA de operador + NÚMERO
  // (FAP329, INP255, PNP042, EP828…); palabras sueltas no entran
  return /^[A-Z]{1,3}[0-9][0-9A-Z]{0,4}$/.test(v) ? { v: v, conBarra: false, todas: _regTodas(t, r, v) } : null;
}

/** ¿El valor capturado tras REG/ puede ser matrícula? (para las unidades
 *  EXTRA de la formación: civil del Anexo 7 / RAP 45 o SIGLA estatal +
 *  nº). Más estricto que la primera captura — que hereda la confianza
 *  del «REG/» explícito — para que una palabra suelta tras la matrícula
 *  («REG/HP1520 LIMA…») no se cuele como segunda aeronave. */
function _regValida(v) {
  if (!v || _PALABRA.test(String(v).replace(/[^A-Z]/g, ''))) return false;
  if (!/[A-Z]/.test(v)) return false;                       // puro número no es matrícula
  return esMatricula(v) || _siglaEstatal(v);               // civil (Anexo 7) o estatal (FAP329…)
}

/** Matrículas EXTRA tras la primera (v2.9.25 — vuelo en formación):
 *  «REG/FAP123 FAP124», «REG FAP 329 FAP 330», «REG/OB1630-OB2147».
 *  Se avanza mientras el siguiente token parezca matrícula; los
 *  indicadores del 18 (SEL/, DOF/, EET/…, ya filtrados por _PALABRA) y
 *  cualquier palabra cortan la corrida. Devuelve [v, …] (mín. 1). */
function _regTodas(t, r, v) {
  var todas = [v];
  var resto = String(t).slice(r.index + r[0].length);
  for (var i = 0; i < 12; i++) {                            // tope: 12 aeronaves
    var r2 = resto.match(/^\s*[-,\u00AD]?\s*([A-Z0-9]{1,3}[-\u00AD\s]?[0-9A-Z]{2,5})(?![0-9A-Z])/i);
    if (!r2) break;
    var v2 = _norm(r2[1]);
    if (!_regValida(v2)) break;
    if (todas.indexOf(v2) === -1) todas.push(v2);           // sin duplicados
    resto = resto.slice(r2[0].length);
  }
  return todas;
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
      // límite derecho: «REGLAS/FLIGHT RULES/TIPO…» en la fila de la etiqueta.
      // v2.9.25: pdf.js FUSIONA a veces «8.»+«REGLAS…»+«TIPO…» en un solo
      // ítem («8.REGLAS DE VUELOTIPO DE VUELO») — el «8.» con que inicia
      // no puede esconder la etiqueta (sin esto, las casillas del 8 se
      // pegan al ident del 7: «AVISPA1I»)
      var minX = x1;
      for (i = 0; i < items.length; i++) {
        var it2 = items[i];
        if (it2 === cap || it2.x <= cap.x) continue;
        var s2 = _sinAcentos(String(it2.str || '')).replace(/\s+/g, ' ').trim();
        if (Math.abs(it2.y - fila) < 6 && /^(?:[0-9]{1,2}\.?\s*)?(REGLAS|FLIGHT|RULES|TIPO|TYPE)\b/.test(s2) && it2.x < minX) minX = it2.x;
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

/* ══ v2.9.25 — VUELO EN FORMACIÓN: «GUÍA + 1» ══
 * Doc 4444 Ap. 2: en los vuelos en formación el CASILLERO 7 lleva el
 * CALLSIGN de la formación con el número de aeronaves que la siguen
 * («AVISPA + 1», «BAZUCA+2», «NORTON + 3» — el callsign varía en nombre
 * y número), el CASILLERO 9 «NÚMERO» el total de aeronaves (02) y el
 * CASILLERO 18 las MATRÍCULAS DE TODAS (REG/FAP123 FAP124). */

/** ¿El texto trae un vuelo en formación? Busca en el texto tal cual, en
 *  el compactado y en las casillas del OCR (la formación se anuncia como
 *  «CALLSIGN + N» — «AVISPA + 1», «BAZUCA+2»… — y el casillero 9 trae el
 *  «NÚMERO» de aeronaves). Devuelve {llamada, n} o null. */
function formacionDe(t) {
  var s = String(t || '').toUpperCase();
  var variantes = [s, _compacta(s), _casillas(s)];
  var llamada = '', n = 0, i, m;
  for (i = 0; i < variantes.length; i++) {
    m = variantes[i].match(/(?:^|[^A-Z0-9])([A-Z][A-Z0-9]{1,9})\s*\+\s*([0-9]{1,2})(?![0-9])/);
    if (m && !llamada && parseInt(m[2], 10) >= 1 && !_PALABRA.test(m[1]) && !/^(HORA|TIME|FECHA|DATE|AERONAVE|AIRCRAFT)$/.test(m[1])) {
      llamada = m[1];
      n = Math.max(n, parseInt(m[2], 10) + 1);
    }
    // v2.9.25 — el OCR de la foto lee el 0 del casillero 9 como «O»
    // («02» → «o 2»); se acepta [0O] y se normaliza. Los números de
    // ETIQUETA («NÚMERO 18.» del casillero 18) quedan fuera por el punto.
    m = variantes[i].match(/(?:^|[^A-Z0-9])(?:N[UÚ]MERO|NUMBER)\s*[:.\-]?\s*([0O][0-9O]|[0-9])(?![0-9A-Z])(?!\s*\.)/);
    if (m) { var nn = parseInt(m[1].replace(/O/g, '0'), 10); if (nn >= 2 && nn <= 20) n = Math.max(n, nn); }
  }
  if (!llamada && !(n >= 2)) return null;
  return { llamada: llamada, n: n };
}

/** Formulario impreso — el «+N» del casillero 7 por GEOMETRÍA: en los PDF
 *  con capa de texto el content stream llega revuelto y el «AVISPA + 1»
 *  no aparece junto en el texto; con las coordenadas se lee la fila del
 *  «+»: letras a la izquierda (callsign) y dígitos a la derecha (los que
 *  siguen a la guía). Devuelve {llamada, n} o null. */
function formacionDeFormulario(items) {
  try {
    if (!items || !items.length) return null;
    var i, it, plus = null;
    for (i = 0; i < items.length; i++) {
      var s = String(items[i].str || '').trim();
      if (!plus && /^\+[\s.]?[0-9]{0,2}$/.test(s)) plus = items[i];   // «+», «+1», «+ 1»
    }
    if (!plus) return null;
    var mPlus = String(plus.str).match(/^\+[\s.]?([0-9]{1,2})$/);
    var extra = mPlus ? parseInt(mPlus[1], 10) : 0;
    var letras = [];
    for (i = 0; i < items.length; i++) {
      it = items[i];
      var c = String(it.str || '').trim();
      if (it === plus || !/^[A-Z0-9]{1,3}$/i.test(c)) continue;
      if (Math.abs(it.y - plus.y) > 8) continue;            // misma fila visual
      if (it.x < plus.x) { if (/^[A-Z]$/i.test(c)) letras.push(it); }
      else if (/^[0-9]{1,2}$/.test(c)) extra = Math.max(extra, parseInt(c, 10));
    }
    letras.sort(function (a, b) { return a.x - b.x; });
    var llamada = letras.map(function (o) { return String(o.str).trim(); }).join('').toUpperCase();
    if (!/^[A-Z]{2,10}$/.test(llamada)) return null;        // sin callsign no hay formación
    return { llamada: llamada, n: extra + 1 };
  } catch (e) { return null; }
}

/** Matrículas DIRECTAS del casillero 18 SIN ítem REG/ (vuelo en
 *  formación): «18. OTROS DATOS: FAP123 FAP124 DOF/…». Se llama SOLO con
 *  la formación ya confirmada (casillero 7 «+N» o casillero 9 con nº de
 *  aeronaves) para no cazar matrículas sueltas de cualquier texto.
 *  Acepta las matrículas separadas por espacio/coma/guion y también
 *  PEGADAS (el OCR de la foto las lee casilla por casilla). */
function _matriculasDirectas(t) {
  var m = String(t || '').toUpperCase().match(/(?:^|[^A-Z0-9])((?:(?:FAP|INP|PNP|EP|OB)[0-9]{2,4}[\s,\-]*){2,})(?![0-9A-Z])/);
  if (!m) return [];
  var out = [];
  (m[1].match(/(?:FAP|INP|PNP|EP|OB)[0-9]{2,4}/g) || []).forEach(function (x) {
    var n = _norm(x);
    if (_regValida(n) && out.indexOf(n) === -1) out.push(n);
  });
  return out;
}

/** Nota del aviso para los vuelos en formación: « · VUELO EN FORMACIÓN
 *  «AVISPA + 1» · 02 aeronaves» y, si el nº de aeronaves supera las
 *  matrículas leídas (el OCR de las fotos tiene ese límite), el aviso
 *  pide completarlas a mano en el campo (100 caracteres para ello). */
function _notaFormacion(form, nLeidas) {
  var s = ' · VUELO EN FORMACIÓN';
  if (form && form.llamada) s += ' «' + form.llamada + (form.n >= 2 ? ' + ' + (form.n - 1) : '') + '»';
  var n = form && form.n >= 2 ? form.n : 0;
  if (n) s += ' · ' + (n < 10 ? '0' + n : n) + ' aeronaves';
  if (n && nLeidas < n) s += ' · ⚠ leídas ' + nLeidas + ' de ' + n + ' matrículas — complétalas a mano';
  return s;
}

/* ══ Extracción unificada (v2.9.25 — orden OACI + JEFE DE ESTADO + OCR + FORMACIÓN) ══ */

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
 *  rescata del texto directo/compactado.
 *  v2.9.25: VUELO EN FORMACIÓN — casillero 7 «AVISPA + 1» (texto o
 *  geometría del «+»), casillero 9 con el nº de aeronaves y casillero 18
 *  con TODAS las matrículas (REG/ multi, pegadas del OCR o directas sin
 *  REG/): el campo lleva «FAP123 FAP124» y el aviso marca la formación;
 *  si faltan matrículas (nº de aeronaves > leídas) el aviso pide
 *  completarlas a mano. */
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
  /* v2.9.30 — SIEMPRE QUE EL CASILLERO 7 NO TRAIGA LA MATRÍCULA (petición
     de la oficina, ejemplo JAP7261 + REG/CCDII): el marcador Doc 4444 de
     que la identificación del vuelo (casillero 7) NO es la matrícula es el
     ítem REG/ del casillero 18 con un valor DISTINTO — entonces el campo
     lleva ID DE VUELO + MATRÍCULA («JAP7261 CCDII», igual que el designador
     «LPE2273 CCBJE»). El REG/ se consulta ANTES de dar por buena una
     identificación del 7 que solo SE PARECE a una matrícula (prefijo de 2
     letras: HC…, PT…, XA…, LV…): antes ese parecido pasaba esMatricula y
     el REG/ quedaba ignorado. Sin REG/ — o si el REG/ repite el valor del
     7 o trae la formación (varias) — el 7 sigue siendo la matrícula. */
  var ri = _regInfo(t) || _regInfo(_compacta(t));
  if (ident && esMatricula(ident) &&
      !(ri && ri.todas && ri.todas.length < 2 && _norm(ri.v) !== _norm(ident)))
    return _final({ matricula: _norm(ident), origen: origenIdent, ident: _norm(ident) }); // el 7 YA trae la matrícula

  // v2.9.25 — VUELO EN FORMACIÓN: «GUÍA + 1» en el casillero 7 (texto tal
  // cual o geometría del «+») y/o nº de aeronaves en el casillero 9; las
  // matrículas de TODAS las aeronaves están en el casillero 18. El texto
  // aporta el nº del casillero 9 y la geometría el callsign completo (el
  // content stream llega revuelto y el «AVISPA + 1» no sale junto).
  var formT = formacionDe(t), formG = formacionDeFormulario(items);
  var form = formT || formG;
  if (formT && formG) form = { llamada: formT.llamada || formG.llamada, n: Math.max(formT.n, formG.n) };

  // 2) casillero 18 — REG/ (matrícula «si difiere de la del casillero 7»);
  //    v2.9.22: también «REG FAP 329» sin barra (fallo de presentación del
  //    piloto en los FPL de operadores estatales) y «REGFAP329» pegado;
  //    v2.9.25: formación — recoge TODAS las matrículas del ítem
  //    (v2.9.30: ri ya se calculó ARRIBA, antes del parecido-matrícula del 7)
  if (ri) {
    var todas = (ri.todas && ri.todas.length ? ri.todas : [ri.v]).slice(0, 12);
    if (todas.length >= 2 || form)
      return _final({ matricula: todas.join(' '),
               origen: 'casillero 18 (REG' + (ri.conBarra ? '/' : ' sin «/»') + ')' + _notaFormacion(form, todas.length),
               ident: ident, formacion: form || { llamada: '', n: todas.length }, todas: todas });
    return _final({ matricula: ri.v,
             origen: 'casillero 18 (REG' + (ri.conBarra ? '/' : ' sin «/»') + ')' + (ident ? ' · vuelo ' + ident : ''),
             ident: ident });
  }

  // v2.9.25 — formación SIN ítem REG/: el casillero 18 trae las matrículas
  // directas («18. OTROS DATOS: FAP123 FAP124»); solo con la formación ya
  // confirmada, para no cazar matrículas sueltas de cualquier texto
  if (form) {
    var dir = _matriculasDirectas(t);
    if (dir.length < 2) {
      var dirCas = _matriculasDirectas(_casillas(t));       // pegadas del OCR de la foto
      if (dirCas.length >= 2) dir = dirCas;
    }
    if (dir.length >= 2)
      return _final({ matricula: dir.join(' '),
               origen: 'casillero 18 (matrículas de la formación)' + _notaFormacion(form, dir.length),
               ident: ident, formacion: form, todas: dir });
  }

  // 3) patrón suelto en el texto
  var su = _suelto(t) || _suelto(_compacta(t));
  if (su) {
    if (form)
      return _final({ matricula: su, origen: 'texto del FPL' + _notaFormacion(form, 1),
               ident: ident, formacion: form, todas: [su] });
    return _final({ matricula: su, origen: 'texto del FPL', ident: ident });
  }

  // casillero 7 con designador y sin REG/ → identificación del vuelo;
  // v2.9.25: en un VUELO EN FORMACIÓN el callsign («AVISPA+1») NO va en el
  // campo — el casillero pide las MATRÍCULAS (se escriben a mano si el OCR
  // de la foto no las leyó) → null para que la app avise específicamente
  if (ident && /^[A-Z0-9]{2,7}$/.test(ident) && !_PALABRA.test(ident)) {
    if (form) return null;
    return _final({ matricula: ident, origen: origenIdent + ' · identificación de vuelo', ident: ident });
  }

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
  _casillas: _casillas, _vueloPresidencial: _vueloPresidencial, _presi: _presi,
  // v2.9.25 — vuelo en formación
  formacionDe: formacionDe, formacionDeFormulario: formacionDeFormulario,
  _splitUnidades: _splitUnidades, _matriculasDirectas: _matriculasDirectas
};
if (typeof module !== 'undefined' && module.exports) module.exports = API;
if (typeof window !== 'undefined') window.FPLScan = API;
