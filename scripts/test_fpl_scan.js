/* Pruebas unitarias de fpl-scan.js (Node puro, sin Electron)
 * Ejecutar: node /home/z/my-project/scripts/test_fpl_scan.js
 * v2.9.21 — orden OACI: casillero 7 prioritario, REG/ (casillero 18) de
 * respaldo; bug «FLIGHT/FLIGT» corregido; casillero 7 por geometría. */
'use strict';
const FPLScan = require('/home/z/my-project/pdfpro-desktop/src/app/fpl-scan.js');
const fs = require('fs');

let fallos = 0;
function t(nombre, obtenido, esperado) {
  const ok = obtenido === esperado;
  if (!ok) fallos++;
  console.log((ok ? '  ✓ ' : '  ✗ ') + nombre + ' → ' + JSON.stringify(obtenido) + (ok ? '' : ' (esperado ' + JSON.stringify(esperado) + ')'));
}

console.log('══ 1. v2.9.21 — DOCTRINA OACI: la matrícula del CASILLERO 7 va primero ══');
// Doc 4444 Ap.2: si el casillero 7 trae la matrícula, REG/ no hace falta
t('télex OB1630 con REG/ redundante → gana el casillero 7', FPLScan.extraerFPL('(FPL-OB1630-IS -B738/M-S -SPHI0730 -SPST0055 -18/REG/OB1630 DOF/261114').matricula, 'OB1630');
t('…y el origen dice casillero 7', FPLScan.extraerFPL('(FPL-OB1630-IS -18/REG/OB1630').origen, 'casillero 7 (mensaje FPL)');
t('casillero 7 OB1630 SIN REG/ → OB1630 (caso SPHI-SPST)', FPLScan.extraerFPL('(FPL-OB1630-IS -C172/M-SDG -SPHI0730 -SPST0055 -18/DOF/261114 EET/0055').matricula, 'OB1630');
t('aunque el REG/ traiga OTRA cosa, manda el 7 (Doc 4444: REG/ «si difiere»)', FPLScan.extraerFPL('(FPL-OB1630-IS -18/REG/HP9999').matricula, 'OB1630');
t('esMatricula: OB1630 es matrícula (RAP 45)', FPLScan.esMatricula('OB1630'), true);
t('esMatricula: OB1234P provisional (RAP 45)', FPLScan.esMatricula('OB1234P'), true);
t('esMatricula: OB1234T traslado (RAP 45)', FPLScan.esMatricula('OB1234T'), true);
t('esMatricula: OB2147', FPLScan.esMatricula('OB2147'), true);
t('esMatricula: HCCGF (Ecuador, ejemplo AIP)', FPLScan.esMatricula('HCCGF'), true);
t('esMatricula: CCABC (Chile, letras tras CC)', FPLScan.esMatricula('CCABC'), true);
t('esMatricula: N2567GA (EE.UU., ejemplo Doc 4444)', FPLScan.esMatricula('N2567GA'), true);
t('esMatricula: 4XBCD (Israel, ejemplo Doc 4444)', FPLScan.esMatricula('4XBCD'), true);

console.log('══ 2. Casillero 7 con DESIGNADOR (Doc 8585) → matrícula en REG/ del 18 ══');
t('CMP468 + REG/HP1520 → HP1520 (Copa real)', FPLScan.extraerFPL('PLAN DE VUELO Aircraft Identification Flight Rules Type of Flight 4 6 8 I S C M P FPL 18. OTROS DATOS PBN/A1B1C1D1L1O1S2T1 NAV/RNP2 DOF/261111 REG/HP1520 SEL/MPJR OPR/CMP').matricula, 'HP1520');
t('…origen con el vuelo', FPLScan.extraerFPL('(FPL-CMP468-IS -18/REG/HP1520').origen, 'casillero 18 (REG/) · vuelo CMP468');
t('FAP211 + REG/OB1630 → OB1630 (militar peruano)', FPLScan.extraerMatricula('(FPL-FAP211-IS -18/REG/OB1630 SEL/ABCD DOF/261114 0/JETA1').matricula, 'OB1630');
t('LPE1234 + REG/OB2201 → OB2201 (LATAM Perú)', FPLScan.extraerMatricula('(FPL-LPE1234-IS -18/REG/OB2201 DOF/261114').matricula, 'OB2201');
t('designador OBC1234 (Doc 8585) NO es matrícula → mira REG/', FPLScan.extraerFPL('(FPL-OBC1234-IS -18/REG/OB9999').matricula, 'OB9999');
t('CCA486 (Air China) no pasa por matrícula chilena', FPLScan.esMatricula('CCA486'), false);
t('NGA213 (ejemplo Doc 4444) no pasa por matrícula N', FPLScan.esMatricula('NGA213'), false);
t('CMP468 no es matrícula', FPLScan.esMatricula('CMP468'), false);
t('LPE1234 no es matrícula', FPLScan.esMatricula('LPE1234'), false);
t('FAP211 no es matrícula', FPLScan.esMatricula('FAP211'), false);
t('OBC1234 no es matrícula', FPLScan.esMatricula('OBC1234'), false);
t('designador SIN REG/ → devuelve la identificación del vuelo', FPLScan.extraerMatricula('(FPL-FAP211-IS -B737/M-SD').matricula, 'FAP211');
t('…con origen claro', FPLScan.extraerMatricula('(FPL-FAP211-IS -B737/M-SD').origen, 'casillero 7 (mensaje FPL) · identificación de vuelo');
t('identificador civil OAB123 (sin REG/)', FPLScan.extraerMatricula('(FPL-OAB123-IS -C172/M-SDG').matricula, 'OAB123');

console.log('══ 3. Casillero 7 vacío / sin identificación → REG/ del 18 ══');
t('REG/OB2147', FPLScan.extraerMatricula('-18/REG/OB2147 SEL/ABCD DOF/261114').matricula, 'OB2147');
t('REG/OB-1630 con guion', FPLScan.extraerMatricula('18/ REG/OB-1630 EET/').matricula, 'OB1630');
t('REG/OB 1630 con espacio', FPLScan.extraerMatricula('REG/OB 1630').matricula, 'OB1630');
t('origen indica casillero 18', FPLScan.extraerMatricula('x REG/OB2147 y').origen, 'casillero 18 (REG/)');
t('matrícula extranjera HC-COAS', FPLScan.extraerMatricula('-18/REG/HC-COAS').matricula, 'HC-COAS');
t('matrícula extranjera N123AB', FPLScan.extraerMatricula('-18/REG/N123AB').matricula, 'N123AB');
t('matrícula extranjera 9V-OJK', FPLScan.extraerMatricula('-18/REG/9V-OJK').matricula, '9V-OJK');
t('REG/ vacío seguido de otro indicador no cuela «EET»', FPLScan.extraerMatricula('18. OTRA INFORMACIÓN REG/ EET/SEFG0022 DOF/261111'), null);

console.log('══ 4. Mensaje télex OACI — casillero 7 ══');
t('(FPL-OB1630-IS', FPLScan.extraerMatricula('(FPL-OB1630-IS -B738/M-SDFGLRTU -SPHI0730 -N0450F180 DCT -SPJC0230 -0)').matricula, 'OB1630');
t('origen indica mensaje FPL', FPLScan.extraerMatricula('(FPL-OB1630-IS').origen, 'casillero 7 (mensaje FPL)');
t('(CHG-OB2147-…', FPLScan.extraerMatricula('(CHG-OB2147-14 -18/DOF/261114').matricula, 'OB2147');
t('(CNL-OB2147-…', FPLScan.extraerMatricula('(CNL-OB2147-0').matricula, 'OB2147');
t('(DEP-OB2147-…', FPLScan.extraerMatricula('(DEP-OB2147-SPJC1245').matricula, 'OB2147');

console.log('══ 5. Formulario impreso — etiqueta del casillero 7 (texto) ══');
t('etiqueta en español', FPLScan.extraerMatricula('7. IDENTIFICACIÓN DE AERONAVE: OB-1630 8. REGLAS').matricula, 'OB1630');
t('etiqueta en inglés', FPLScan.extraerMatricula('7. AIRCRAFT IDENTIFICATION: OB-ABC 8. ICAO').matricula, 'OBABC');
t('etiqueta OCR sin acentos y con espacio', FPLScan.extraerMatricula('IDENTIFICACION DE AERONAVE OB 1630').matricula, 'OB1630');

console.log('══ 6. v2.9.21 — BUG «FLIGHT/FLIGT» (FlightPlan SPHI-SPST.pdf) ══');
// Texto real del formulario bilingüe (una casilla por carácter, matrícula
// OB1630 en el casillero 7, SIN REG/): la etiqueta «Flight Rules» ya NO se
// cuela como matrícula (antes salía «FLIGHT»/«FLIGT» en el campo).
var SPHI_SPST = 'PLAN DE VUELO Flight Plan PRIORIDAD Priority Adresses (s) FF <<= HORA DE DEPOSITO REMITENTE ' +
  '3. TIPO DE MENSAGE 7. IDENTIFICACION DE AERONAVE 8. REGLAS DE VUELO TIPO DE VUELO Message Type ' +
  'Aircraft Identification Flight Rules Type of Flight O B 1 6 3 0 V G <<= FPL 9. NÚMERO TIPO DE AERONAVE ' +
  'CAT. DE ESTELA TURBULENTA 10. EQUIPO 1 B C 1 7 2 / A HORA 13. AERODROMO DE SALIDA S P H I 0 7 3 0 <<= ' +
  '15. VELOCIDAD DE CRUCERO RUTA 0 9 0 0 5 F DCT 16. AERÓDROMO DE DESTINO S P S T 0 0 5 5 <<= ' +
  '18. OTROS DATOS Other Informations DOF/261114 EET/0055 RMK/VUELO ESCOLAR <<= ' +
  '19. AUTONOMIA 0 3 0 0 P 0 T B E / R / PILOTO AL MANDO KOO PAZ MARCOS ROBERTO';
t('formulario GA sin REG/ → OB1630 (matrícula del casillero 7)', FPLScan.extraerMatricula(SPHI_SPST).matricula, 'OB1630');
t('«FLIGHT» jamás es matrícula', FPLScan.esMatricula('FLIGHT'), false);
t('«FLIGT» (errata de la planilla) jamás es matrícula', FPLScan.esMatricula('FLIGT'), false);
t('captura de etiqueta «Flight Rules» rechazada', FPLScan.extraerMatricula('Aircraft Identification Flight Rules Type of Flight C M P 4 6 8 18. REG/HP1520').matricula, 'HP1520');
t('GA compactado con casillero 8 pegado «OB1630VG» → OB1630', FPLScan.extraerMatricula('Aircraft Identification Flight Rules O B 1 6 3 0 V G FPL').matricula, 'OB1630');
t('GA con casillas pero sin etiqueta inglesa', FPLScan.extraerMatricula('7. IDENTIFICACION DE AERONAVE 8. REGLAS DE VUELO Message Type Aircraft Identification O B 1 6 3 0 V G').matricula, 'OB1630');

console.log('══ 7. esMatricula — negativos (etiquetas, aeródromos, designadores) ══');
t('SPST (aeródromo destino) NO es matrícula', FPLScan.esMatricula('SPST'), false);
t('SPJC (aeródromo) NO es matrícula', FPLScan.esMatricula('SPJC'), false);
t('SKBQ (aeródromo Colombia) NO es matrícula', FPLScan.esMatricula('SKBQ'), false);
t('OB12 (muy corta) NO', FPLScan.esMatricula('OB12'), false);
t('OB12345678 (larga) NO', FPLScan.esMatricula('OB12345678'), false);
t('FLIGHT NO', FPLScan.esMatricula('FLIGHT'), false);
t('REG (indicador) NO', FPLScan.esMatricula('REG'), false);
t('SEL (indicador) NO', FPLScan.esMatricula('SEL'), false);
t('DOF (indicador) NO', FPLScan.esMatricula('DOF'), false);
t('NAV (indicador) NO', FPLScan.esMatricula('NAV'), false);

console.log('══ 8. Patrón suelto en el texto ══');
t('OB-1630 suelto', FPLScan.extraerMatricula('La aeronave OB-1630 despega').matricula, 'OB1630');
t('OB1630 suelto', FPLScan.extraerMatricula('Aeronave OB1637 autorizada').matricula, 'OB1637');
t('OB1234P provisional suelto', FPLScan.extraerMatricula('Aeronave OB-1234-P en traslado').matricula, 'OB1234P');
t('HC-COAS suelto', FPLScan.extraerMatricula('viene HC-COAS hacia SPHI').matricula, 'HC-COAS');

console.log('══ 9. OCR sucio ══');
t('OCR confunde O con cero: (FPL-0B1630', FPLScan.extraerMatricula('(FPL-0B1630-IS').matricula, 'OB1630');
t('REG/0B-1630', FPLScan.extraerMatricula('REG/0B-1630').matricula, 'OB1630');

console.log('══ 10. v2.9.21 — CASILLERO 7 POR GEOMETRÍA (ítems pdf.js {str,x,y}) ══');
// Réplica del formulario real (coordenadas del CM468 real): las casillas del
// casillero 7 llegan REVUELTAS en el texto interno («4 6 8 … C M P»); la
// geometría las ordena por X.
var IT_CM468 = [
  { str: 'PLAN DE VUELO', x: 262.1, y: 810.3 },
  { str: '7.', x: 148.7, y: 698.1 },
  { str: 'IDENTIFICACION DE AERONAVE', x: 164.2, y: 698.0 },
  { str: '8.', x: 292.0, y: 698.4 },
  { str: 'REGLAS DE VUELO', x: 297.8, y: 698.1 },
  { str: 'Aircraft Identification', x: 191.8, y: 688.5 },
  { str: 'Flight Rules', x: 310.9, y: 688.5 },
  { str: 'Type of Flight', x: 368.3, y: 688.5 },
  { str: 'FPL', x: 62.5, y: 678.2 },
  { str: 'C', x: 153.1, y: 678.2 },
  { str: '4', x: 218.8, y: 676.9 },
  { str: '6', x: 232.7, y: 676.9 },
  { str: '8', x: 249.5, y: 676.9 },
  { str: 'M', x: 169.8, y: 678.2 },
  { str: 'P', x: 187.3, y: 678.2 },
  { str: 'I', x: 316.4, y: 678.2 },
  { str: 'S', x: 393.9, y: 678.2 },
  { str: '9.', x: 33.4, y: 668.6 },
  { str: 'NÚMERO', x: 61.0, y: 668.7 },
  { str: '1', x: 224.1, y: 666.7 },
  { str: '0', x: 236.6, y: 666.7 },
  { str: '6', x: 247.0, y: 666.7 },
  { str: 'REG/HP1520 SEL/MPJR CODE/0C200F OPR/CMP PER/C RMK/TCAS', x: 100.0, y: 500.0 }
];
t('geometría: orden visual del casillero 7 → CMP468', FPLScan.identDeFormulario(IT_CM468), 'CMP468');
t('geometría + texto: CM468 → matrícula HP1520 (REG/), vuelo CMP468', FPLScan.extraerFPL('PLAN DE VUELO Aircraft Identification Flight Rules Type of Flight 4 6 8 I S C M P FPL 18. OTROS DATOS REG/HP1520 SEL/MPJR OPR/CMP', IT_CM468).matricula, 'HP1520');
t('…origen con el vuelo', FPLScan.extraerFPL('18. REG/HP1520', IT_CM468).origen, 'casillero 18 (REG/) · vuelo CMP468');
// SPHI-SPST: OB1630 en las casillas del 7, sin REG/
var IT_SPHI = IT_CM468.map(function (o) {
  var s = o.str;
  if (s === 'C') s = 'O';
  else if (s === 'M') s = 'B';
  else if (s === 'P') s = '1';
  else if (s === '4') s = '6';
  else if (s === '6') s = '3';
  else if (s === '8') s = '0';
  else if (s === 'I') s = 'V';
  else if (s === 'S') s = 'G';
  return { str: s, x: o.x, y: o.y };
});
IT_SPHI = IT_SPHI.filter(function (o) { return !/REG\//.test(o.str); }); // sin REG/
t('geometría SPHI-SPST → OB1630 del casillero 7', FPLScan.identDeFormulario(IT_SPHI), 'OB1630');
t('geometría SPHI-SPST → matrícula OB1630 (NO mira el casillero 18)', FPLScan.extraerFPL(SPHI_SPST, IT_SPHI).matricula, 'OB1630');
t('…origen: casillero 7 (formulario)', FPLScan.extraerFPL(SPHI_SPST, IT_SPHI).origen, 'casillero 7 (formulario)');
t('geometría: «1 0 6» del casillero 9 NO contamina', FPLScan.identDeFormulario(IT_CM468), 'CMP468');
t('geometría sin etiqueta → vacío', FPLScan.identDeFormulario([{ str: 'X', x: 100, y: 100 }]), '');
t('geometría null → usa el texto', FPLScan.extraerFPL('(FPL-OB1630-IS', null).matricula, 'OB1630');

console.log('══ 11. Sin coincidencias (texto que NO es FPL) ══');
t('NOTAM con PROB40', FPLScan.extraerMatricula('TAF SPHI 130500Z 1306/1406 12010KT 8000 SCT020 PROB40 TEMPO RA'), null);
t('palabra OBSTÁCULO no es matrícula', FPLScan.extraerMatricula('TORRE NUEVA, OBSTÁCULO ILUMINADO A 500 M DE LA PISTA'), null);
t('palabra OBSTACLE no es matrícula', FPLScan.extraerMatricula('NEW OBSTACLE LIGHTED 500 M FROM RUNWAY'), null);
t('texto administrativo', FPLScan.extraerMatricula('Oficio múltiple N.º 214-2026: se adjunta el cuadro de personal'), null);
t('vacío', FPLScan.extraerMatricula(''), null);

console.log('══ 12. v2.9.17 — formularios con una casilla por carácter ══');
t('«O B 2 1 4 7» suelto → OB2147', FPLScan.extraerMatricula('La aeronave O B 2 1 4 7 despega').matricula, 'OB2147');
t('etiqueta + «C M P 4 6 8» → CMP468', FPLScan.extraerMatricula('IDENTIFICACION DE AERONAVE: C M P 4 6 8').matricula, 'CMP468');
t('celdas Excel «O,B,2,1,4,7» → OB2147', FPLScan.extraerMatricula('7. IDENTIFICACION,DE,AERONAVE,,O,B,2,1,4,7,8. REGLAS DE VUELO').matricula, 'OB2147');
t('«REG/ HP 1520» con espacios → HP1520', FPLScan.extraerMatricula('18. OTROS DATOS: REG/ HP 1520 SEL/MPJR').matricula, 'HP1520');
t('«R E G / H P 1 5 2 0» extremo → HP1520', FPLScan.extraerMatricula('18: R E G / H P 1 5 2 0 SEL/MPJR').matricula, 'HP1520');
t('texto normal NO se compacta (TAF sigue null)', FPLScan.extraerMatricula('TAF SPHI 130500Z 1306/1406 12010KT 8000 SCT020 PROB40 TEMPO RA'), null);

console.log('══ 13. v2.9.17 — pareceFPL (aviso «FPL sin matrícula») ══');
t('télex (FPL- sí es FPL', FPLScan.pareceFPL('(FPL-CM468-IS -N0450F180 DCT SPHI -DOF/261111 EET/0220 SKED0110'), true);
t('formulario PLAN DE VUELO sí es FPL', FPLScan.pareceFPL('PLAN DE VUELO\n7. IDENTIFICACION DE AERONAVE: CMP 468\n8. REGLAS DE VUELO I S\n13. AERODROMO DE SALIDA SPJC 0737'), true);
t('oficio NO es FPL', FPLScan.pareceFPL('Oficio múltiple N.º 214-2026: se adjunta el cuadro de personal de la oficina AIS para su conocimiento'), false);
t('TAF NO es FPL', FPLScan.pareceFPL('TAF SPHI 130500Z 1306/1406 12010KT 8000 SCT020 PROB40 TEMPO RA'), false);

console.log('══ 14. Iniciales del operador (1.ª letra = primer nombre · 2.ª = apellido paterno) ══');
t('«Marcos Koo» → MK', FPLScan.inicialesDe('Marcos Koo'), 'MK');
t('«Ana María Torres Vega» → AT (4 palabras, paterno «Torres»)', FPLScan.inicialesDe('Ana María Torres Vega'), 'AT');
t('«José Ramírez Díaz» → JR (nombre simple + paterno + materno)', FPLScan.inicialesDe('José Ramírez Díaz'), 'JR');
t('«Ana Torres» → AT (2 palabras)', FPLScan.inicialesDe('Ana Torres'), 'AT');
t('«E2E Verificador» → EV', FPLScan.inicialesDe('E2E Verificador'), 'EV');
t('una sola palabra → 1 letra', FPLScan.inicialesDe('Cher'), 'C');
t('nombre vacío', FPLScan.inicialesDe(''), '');
t('minúsculas → mayúsculas', FPLScan.inicialesDe('marcos koo'), 'MK');
t('«Ana María Torres» → AT (NO «AM»)', FPLScan.inicialesDe('Ana María Torres'), 'AT');
t('«Luis Alberto Ccahuana» → LC (NO «LA»)', FPLScan.inicialesDe('Luis Alberto Ccahuana'), 'LC');
t('«Rosa María Flores» → RF (NO «RM»)', FPLScan.inicialesDe('Rosa María Flores'), 'RF');
t('«Juan Carlos Morales» → JM (NO «JC»)', FPLScan.inicialesDe('Juan Carlos Morales'), 'JM');
t('«María del Carmen Rojas» → MR (partícula «del»)', FPLScan.inicialesDe('María del Carmen Rojas'), 'MR');
t('«Sr. Marcos Koo» → MK (título ignorado)', FPLScan.inicialesDe('Sr. Marcos Koo'), 'MK');
t('«ana maría torres» minúsculas → AT', FPLScan.inicialesDe('ana maría torres'), 'AT');
t('«Marcos Roberto Koo Paz» → MK', FPLScan.inicialesDe('Marcos Roberto Koo Paz'), 'MK');
t('«Frank Dave Asian Castro» → FA', FPLScan.inicialesDe('Frank Dave Asian Castro'), 'FA');
t('«Ruswel Melciades Cacho Paredes» → RC', FPLScan.inicialesDe('Ruswel Melciades Cacho Paredes'), 'RC');
t('«Jacqueline Cristina Vílchez Aguirre» → JV', FPLScan.inicialesDe('Jacqueline Cristina Vílchez Aguirre'), 'JV');
t('«Francessca Michelle Chumpitaz Court» → FC', FPLScan.inicialesDe('Francessca Michelle Chumpitaz Court'), 'FC');
t('mismos nombres SIN materno (3 palabras) → igual',
  FPLScan.inicialesDe('Ruswel Melciades Cacho') === 'RC' &&
  FPLScan.inicialesDe('Frank Dave Asian') === 'FA' &&
  FPLScan.inicialesDe('Marcos Roberto Koo') === 'MK' &&
  FPLScan.inicialesDe('Francessca Michelle Chumpitaz') === 'FC', true);
t('«José Luis Ramírez Rojas» → JR (paterno = 3.ª)', FPLScan.inicialesDe('José Luis Ramírez Rojas'), 'JR');
t('«José Ramírez Vega Silva» → JV (convención: nombres «José Ramírez» + paterno «Vega»)', FPLScan.inicialesDe('José Ramírez Vega Silva'), 'JV');
t('«Juan San Martín Palacios» → JS («San» inicia el apellido)', FPLScan.inicialesDe('Juan San Martín Palacios'), 'JS');
t('«Koo Paz, Marcos Roberto» (con coma) → MK', FPLScan.inicialesDe('Koo Paz, Marcos Roberto'), 'MK');
t('«Koo Paz Marcos Roberto» (sin coma) → MK — el caso reportado', FPLScan.inicialesDe('Koo Paz Marcos Roberto'), 'MK');
t('«Koo Marcos» (2 palabras) → MK', FPLScan.inicialesDe('Koo Marcos'), 'MK');
t('«Koo Paz Marcos» (3 palabras) → MK', FPLScan.inicialesDe('Koo Paz Marcos'), 'MK');
t('«Koo Marcos Roberto» (3 palabras) → MK', FPLScan.inicialesDe('Koo Marcos Roberto'), 'MK');
t('«Koo, Marcos» (con coma) → MK', FPLScan.inicialesDe('Koo, Marcos'), 'MK');
t('«Asian Castro, Frank Dave» (con coma) → FA', FPLScan.inicialesDe('Asian Castro, Frank Dave'), 'FA');
t('«Chumpitaz Court Francessca Michelle» (sin coma) → FC', FPLScan.inicialesDe('Chumpitaz Court Francessca Michelle'), 'FC');
t('«Torres Ana» (apellidos y nombres, 2 palabras) → AT', FPLScan.inicialesDe('Torres Ana'), 'AT');
t('falso volteo NO: «Marcos Roberto Koo Paz» sigue MK', FPLScan.inicialesDe('Marcos Roberto Koo Paz'), 'MK');
t('falso volteo NO: «Ana María Torres» sigue AT', FPLScan.inicialesDe('Ana María Torres'), 'AT');
t('falso volteo NO: «José Ramírez Díaz» sigue JR', FPLScan.inicialesDe('José Ramírez Díaz'), 'JR');

console.log('══ 15. INTEGRACIÓN — FPL real del usuario (ATC CM468 11NOV.pdf) ══');
(async function () {
  const pdfReal = '/home/z/my-project/upload/ATC CM468  11NOV.pdf';
  if (!fs.existsSync(pdfReal)) {
    console.log('  (sin el PDF real — se omite)');
    fin();
    return;
  }
  try {
    const pdfjs = require('/home/z/my-project/public/pdfpro/vendor/pdfjs/pdf.min.js');
    pdfjs.GlobalWorkerOptions.workerSrc = '/home/z/my-project/public/pdfpro/vendor/pdfjs/pdf.worker.min.js';
    const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(pdfReal)) }).promise;
    const pg = await doc.getPage(1);
    const tc = await pg.getTextContent();
    const texto = tc.items.map(function (s) { return s.str; }).join(' ');
    const items = tc.items.filter(function (i) { return i.str && i.str.trim(); }).map(function (i) {
      return { str: i.str, x: i.transform[4], y: i.transform[5] };
    });
    const r = FPLScan.extraerFPL(texto, items);
    t('CM468 real (geometría+texto) → matrícula HP1520', r && r.matricula, 'HP1520');
    t('CM468 real → vuelo CMP468', r && r.ident, 'CMP468');
    t('CM468 real → origen REG/ con vuelo', r && r.origen, 'casillero 18 (REG/) · vuelo CMP468');
    // y SOLO texto (como el OCR): el «Flight» de la etiqueta ya no se cuela
    const r2 = FPLScan.extraerFPL(texto, null);
    t('CM468 solo texto → HP1520 (sin «FLIGHT»)', r2 && r2.matricula, 'HP1520');
  } catch (e) {
    console.log('  ✗ error en la integración: ' + e.message);
    fallos++;
  }
  fin();
})();

function fin() {
  console.log(fallos === 0 ? '\nTODAS LAS PRUEBAS PASARON ✓' : '\nFALLOS: ' + fallos);
  process.exit(fallos === 0 ? 0 : 1);
}
