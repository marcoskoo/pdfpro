/* Pruebas unitarias de fpl-scan.js (Node puro, sin Electron)
 * Ejecutar: node /home/z/my-project/scripts/test_fpl_scan.js */
'use strict';
const FPLScan = require('/home/z/my-project/public/pdfpro/fpl-scan.js');

let fallos = 0;
function t(nombre, obtenido, esperado) {
  const ok = obtenido === esperado;
  if (!ok) fallos++;
  console.log((ok ? '  ✓ ' : '  ✗ ') + nombre + ' → ' + JSON.stringify(obtenido) + (ok ? '' : ' (esperado ' + JSON.stringify(esperado) + ')'));
}

console.log('══ 1. Casillero 18 — ítem REG/ (máxima prioridad) ══');
t('REG/OB2147', FPLScan.extraerMatricula('-18/REG/OB2147 SEL/ABCD DOF/261114').matricula, 'OB2147');
t('REG/OB-1630 con guion', FPLScan.extraerMatricula('18/ REG/OB-1630 EET/').matricula, 'OB1630');
t('REG/OB 1630 con espacio', FPLScan.extraerMatricula('REG/OB 1630').matricula, 'OB1630');
t('REG/ prevalece sobre callsign del casillero 7', FPLScan.extraerMatricula('(FPL-FAP211-IS -18/REG/OB1630').matricula, 'OB1630');
t('origen indica casillero 18', FPLScan.extraerMatricula('x REG/OB2147 y').origen, 'casillero 18 (REG/)');
t('matrícula extranjera HC-COAS', FPLScan.extraerMatricula('-18/REG/HC-COAS').matricula, 'HC-COAS');
t('matrícula extranjera N123AB', FPLScan.extraerMatricula('-18/REG/N123AB').matricula, 'N123AB');
t('matrícula extranjera 9V-OJK', FPLScan.extraerMatricula('-18/REG/9V-OJK').matricula, '9V-OJK');

console.log('══ 2. Mensaje télex OACI — casillero 7 ══');
t('(FPL-OB1630-IS', FPLScan.extraerMatricula('(FPL-OB1630-IS -B738/M-SDFGLRTU -SPHI0730 -N0450F180 DCT -SPJC0230 -0)').matricula, 'OB1630');
t('origen indica mensaje FPL', FPLScan.extraerMatricula('(FPL-OB1630-IS').origen, 'casillero 7 (mensaje FPL)');
t('(CHG-OB2147-…', FPLScan.extraerMatricula('(CHG-OB2147-14 -18/DOF/261114').matricula, 'OB2147');
t('(CNL-OB2147-…', FPLScan.extraerMatricula('(CNL-OB2147-0').matricula, 'OB2147');
t('(DEP-OB2147-…', FPLScan.extraerMatricula('(DEP-OB2147-SPJC1245').matricula, 'OB2147');
t('identificador civil OAB123', FPLScan.extraerMatricula('(FPL-OAB123-IS -C172/M-SDG').matricula, 'OAB123');
t('callsign militar FAP211 (sin REG/)', FPLScan.extraerMatricula('(FPL-FAP211-IS -B737/M-SD').matricula, 'FAP211');

console.log('══ 3. Formulario impreso — etiqueta del casillero 7 ══');
t('etiqueta en español', FPLScan.extraerMatricula('7. IDENTIFICACIÓN DE AERONAVE: OB-1630 8. REGLAS').matricula, 'OB1630');
t('etiqueta en inglés', FPLScan.extraerMatricula('7. AIRCRAFT IDENTIFICATION: OB-ABC 8. ICAO').matricula, 'OBABC');
t('etiqueta OCR sin acentos y con espacio', FPLScan.extraerMatricula('IDENTIFICACION DE AERONAVE OB 1630').matricula, 'OB1630');

console.log('══ 4. Patrón suelto en el texto ══');
t('OB-1630 suelto', FPLScan.extraerMatricula('La aeronave OB-1630 despega').matricula, 'OB1630');
t('OB1630 suelto', FPLScan.extraerMatricula('Aeronave OB1637 autorizada').matricula, 'OB1637');
t('HC-COAS suelto', FPLScan.extraerMatricula('viene HC-COAS hacia SPHI').matricula, 'HC-COAS');

console.log('══ 5. OCR sucio ══');
t('OCR confunde O con cero: 0B1630', FPLScan.extraerMatricula('(FPL-0B1630-IS').matricula, 'OB1630');
t('REG/0B-1630', FPLScan.extraerMatricula('REG/0B-1630').matricula, 'OB1630');

console.log('══ 6. Sin coincidencias (texto que NO es FPL) ══');
t('NOTAM con PROB40', FPLScan.extraerMatricula('TAF SPHI 130500Z 1306/1406 12010KT 8000 SCT020 PROB40 TEMPO RA'), null);
t('palabra OBSTÁCULO no es matrícula', FPLScan.extraerMatricula('TORRE NUEVA, OBSTÁCULO ILUMINADO A 500 M DE LA PISTA'), null);
t('texto administrativo', FPLScan.extraerMatricula('Oficio múltiple N.º 214-2026: se adjunta el cuadro de personal'), null);
t('vacío', FPLScan.extraerMatricula(''), null);

console.log('══ 7. Iniciales del operador (1.ª letra = primer nombre · 2.ª = apellido paterno) ══');
t('«Marcos Koo» → MK', FPLScan.inicialesDe('Marcos Koo'), 'MK');
t('«Ana María Torres Vega» → AT', FPLScan.inicialesDe('Ana María Torres Vega'), 'AT');
t('«José Ramírez Díaz» → JR (nombre simple + paterno + materno)', FPLScan.inicialesDe('José Ramírez Díaz'), 'JR');
t('«Ana Torres» → AT (2 palabras)', FPLScan.inicialesDe('Ana Torres'), 'AT');
t('«E2E Verificador» → EV', FPLScan.inicialesDe('E2E Verificador'), 'EV');
t('una sola palabra → 1 letra', FPLScan.inicialesDe('Cher'), 'C');
t('nombre vacío', FPLScan.inicialesDe(''), '');
t('minúsculas → mayúsculas', FPLScan.inicialesDe('marcos koo'), 'MK');

console.log('══ 7b. v2.9.18 — nombres compuestos: el paterno sigue a los nombres ══');
t('«Ana María Torres» → AT (NO «AM»)', FPLScan.inicialesDe('Ana María Torres'), 'AT');
t('«Luis Alberto Ccahuana» → LC (NO «LA»)', FPLScan.inicialesDe('Luis Alberto Ccahuana'), 'LC');
t('«Rosa María Flores» → RF (NO «RM»)', FPLScan.inicialesDe('Rosa María Flores'), 'RF');
t('«Juan Carlos Morales» → JM (NO «JC»)', FPLScan.inicialesDe('Juan Carlos Morales'), 'JM');
t('«José Luis Ramírez Rojas» → JR', FPLScan.inicialesDe('José Luis Ramírez Rojas'), 'JR');
t('«María del Carmen Rojas» → MR (partícula «del»)', FPLScan.inicialesDe('María del Carmen Rojas'), 'MR');
t('«José Ramírez Vega Silva» → JR (paterno 2.ª palabra, no la materna)', FPLScan.inicialesDe('José Ramírez Vega Silva'), 'JR');
t('«Juan San Martín Palacios» → JS (partícula «San»)', FPLScan.inicialesDe('Juan San Martín Palacios'), 'JS');
t('«Sr. Marcos Koo» → MK (título ignorado)', FPLScan.inicialesDe('Sr. Marcos Koo'), 'MK');
t('«ana maría torres» minúsculas → AT', FPLScan.inicialesDe('ana maría torres'), 'AT');

console.log('══ 8. v2.9.17 — formularios con una casilla por carácter ══');
t('«O B 2 1 4 7» suelto → OB2147', FPLScan.extraerMatricula('La aeronave O B 2 1 4 7 despega').matricula, 'OB2147');
t('etiqueta + «C M P 4 6 8» → CMP468', FPLScan.extraerMatricula('IDENTIFICACION DE AERONAVE: C M P 4 6 8').matricula, 'CMP468');
t('celdas Excel «O,B,2,1,4,7» → OB2147', FPLScan.extraerMatricula('7. IDENTIFICACION,DE,AERONAVE,,O,B,2,1,4,7,8. REGLAS DE VUELO').matricula, 'OB2147');
t('«REG/ HP 1520» con espacios → HP1520', FPLScan.extraerMatricula('18. OTROS DATOS: REG/ HP 1520 SEL/MPJR').matricula, 'HP1520');
t('«R E G / H P 1 5 2 0» extremo → HP1520', FPLScan.extraerMatricula('18: R E G / H P 1 5 2 0 SEL/MPJR').matricula, 'HP1520');
t('texto normal NO se compacta (TAF sigue null)', FPLScan.extraerMatricula('TAF SPHI 130500Z 1306/1406 12010KT 8000 SCT020 PROB40 TEMPO RA'), null);

console.log('══ 9. v2.9.17 — pareceFPL (aviso «FPL sin matrícula») ══');
t('télex (FPL- sí es FPL', FPLScan.pareceFPL('(FPL-CM468-IS -N0450F180 DCT SPHI -DOF/261111 EET/0220 SKED0110'), true);
t('formulario PLAN DE VUELO sí es FPL', FPLScan.pareceFPL('PLAN DE VUELO\n7. IDENTIFICACION DE AERONAVE: CMP 468\n8. REGLAS DE VUELO I S\n13. AERODROMO DE SALIDA SPJC 0737'), true);
t('oficio NO es FPL', FPLScan.pareceFPL('Oficio múltiple N.º 214-2026: se adjunta el cuadro de personal de la oficina AIS para su conocimiento'), false);
t('TAF NO es FPL', FPLScan.pareceFPL('TAF SPHI 130500Z 1306/1406 12010KT 8000 SCT020 PROB40 TEMPO RA'), false);

console.log(fallos === 0 ? '\nTODAS LAS PRUEBAS PASARON ✓' : '\nFALLOS: ' + fallos);
process.exit(fallos === 0 ? 0 : 1);
