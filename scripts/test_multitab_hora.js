/* Arnés de regresión del flujo multi-pestaña de la «Hora Recepción (UTC)»
 * (v3.2.29). Extrae las funciones REALES de web/index.html (gmailAplicarHora,
 * gmailHoraArchivo, gmailHoraReintentoAgendar, _gmailWebEnCola) y las ejecuta
 * contra stubs del DOM/tabuladores, reproduciendo el reporte del usuario:
 * varias pestañas con archivos distintos cuyos correos aún no llegan.
 *
 * Uso: node /home/z/my-project/scripts/test_multitab_hora.js
 */
const fs = require('fs');
const SRC = '/home/z/my-project/web/index.html';
const src = fs.readFileSync(SRC, 'utf8');

/* Extrae el código fuente de una función (con su firma) por balance de
 * llaves, saltando literales y comentarios para no confundirse. */
function extraer(nombre) {
  const cands = [];
  const ia = src.indexOf('async function ' + nombre + '(');
  if (ia >= 0) cands.push(ia);
  const ib = src.indexOf('function ' + nombre + '(');
  if (ib >= 0) cands.push(ib);
  if (!cands.length) throw new Error('No se encontró la función ' + nombre);
  const i = Math.min(...cands);
  const j = src.indexOf('{', src.indexOf(')', i));
  let prof = 1, k = j + 1;
  while (prof > 0 && k < src.length) {
    const c = src[k];
    if (c === "'" || c === '"' || c === '`') {          /* literal: saltar */
      const comilla = c; k++;
      while (k < src.length && src[k] !== comilla) {
        if (src[k] === '\\') k++;
        k++;
      }
    } else if (c === '/' && src[k + 1] === '/') {        /* comentario línea */
      while (k < src.length && src[k] !== '\n') k++;
    } else if (c === '/' && src[k + 1] === '*') {        /* comentario bloque */
      k = src.indexOf('*/', k); k = k < 0 ? src.length : k + 2;
      continue;
    } else if (c === '{') prof++;
    else if (c === '}') prof--;
    k++;
  }
  return src.slice(i, k);
}

const codigo = ['gmailAplicarHora', 'gmailHoraArchivo', 'gmailHoraReintentoAgendar', '_gmailWebEnCola']
  .map(extraer).join('\n\n');

const arnes = `'use strict';
/* ── stubs del entorno de la app ── */
var docTabs=[
 {id:'A',fileName:'FPL_A.pdf',selloHora:'',selloFecha:'',selloHoraArchivo:'',selloMatricula:''},
 {id:'B',fileName:'FPL_B.pdf',selloHora:'',selloFecha:'',selloHoraArchivo:'',selloMatricula:''},
 {id:'C',fileName:'FPL_C.pdf',selloHora:'',selloFecha:'',selloHoraArchivo:'',selloMatricula:''}];
var activeTabId='C';                     /* la última pestaña abierta queda activa */
var fileName='';
function docTabGet(id){for(var i=0;i<docTabs.length;i++)if(docTabs[i].id===id)return docTabs[i];return null;}
var _campos={selloRxDate:{value:''},selloRxTime:{value:''}};
var document={getElementById:function(id){return _campos[id]||null;}};
var _gmailReintentoTabs={};
var _gmailHoraManual=false,_gmailAsistidaSesionOk=false,_gmailSesionToast=false;
var _gmailWebCadena=Promise.resolve();
var _toasts=[];
function toast(m,t,d){_toasts.push(m);}
function updateSelloPreview(){}
function mobSelloSync(){}
function gmailLoginBtnMostrar(){}
function gmailLoginBtnOcultar(){}
function gmailIsDesktop(){return false;}
function gmailHoraPuede(){return false;}
function gmailWebTokens(){return null;}
function gmailHoraApiPorArchivo(){return Promise.resolve(false);}   /* el correo aún no llegó */

${codigo}

/* ── pruebas ── */
(async function(){
  var fallos=[];
  function check(nombre,cond){console.log((cond?'  OK  ':' FALLA')+' · '+nombre);if(!cond)fallos.push(nombre);}

  /* 1) los TRES archivos fallan (correo no llegado): cada pestaña debe
        agendar SU propia re-búsqueda (antes: una sola global, la última) */
  await gmailHoraArchivo(false,false,docTabGet('A'));
  await gmailHoraArchivo(false,false,docTabGet('B'));
  await gmailHoraArchivo(false,false,docTabGet('C'));
  check('A agendó su reintento (n=1)', !!_gmailReintentoTabs.A && _gmailReintentoTabs.A.n===1);
  check('B agendó su reintento (n=1)', !!_gmailReintentoTabs.B && _gmailReintentoTabs.B.n===1);
  check('C agendó su reintento (n=1)', !!_gmailReintentoTabs.C && _gmailReintentoTabs.C.n===1);

  /* 2) B recibe su hora: SOLO la cadena de B se cancela (antes: la de todas) */
  gmailAplicarHora(Date.UTC(2026,10,21,12,34),'correo de prueba','12:34',docTabGet('B'));
  check('B aplicó su hora (1234)', docTabGet('B').selloHora==='1234');
  check('cadena de B cancelada', !_gmailReintentoTabs.B);
  check('cadena de A SIGUE VIVA', !!_gmailReintentoTabs.A);
  check('cadena de C SIGUE VIVA', !!_gmailReintentoTabs.C);

  /* 3) la hora de B (pestaña en 2.º plano) NO pisa el campo visible de C */
  check('campo visible (pestaña activa C) intacto', _campos.selloRxTime.value==='');
  check('fecha de B firmada con su archivo', docTabGet('B').selloHoraArchivo==='FPL_B.pdf');

  /* 4) reintento de A: SU presupuesto sube sin tocar el de C */
  gmailHoraReintentoAgendar(docTabGet('A'));
  check('A pasa a n=2', _gmailReintentoTabs.A.n===2);
  check('C sigue en n=1', _gmailReintentoTabs.C.n===1);

  /* 5) búsqueda nueva de A (re-carga de SU archivo): SU presupuesto se
        renueva; el de C no se toca */
  await gmailHoraArchivo(false,false,docTabGet('A'));
  check('A renovó su presupuesto (n=1)', _gmailReintentoTabs.A.n===1);
  check('C sigue en n=1 (intacto)', _gmailReintentoTabs.C.n===1);

  /* 6) la hora aplicada a la pestaña ACTIVA sí llega al campo visible */
  gmailAplicarHora(Date.UTC(2026,10,21,9,5),'correo de C','09:05',docTabGet('C'));
  check('C aplicó su hora (0905)', docTabGet('C').selloHora==='0905');
  check('campo visible muestra la de C', _campos.selloRxTime.value==='0905');
  check('cadena de C cancelada', !_gmailReintentoTabs.C);

  /* 7) cola web: los barridos van de A UNO aunque lleguen juntos */
  var orden=[];
  function tarea(id){return function(){orden.push('inicio'+id);return new Promise(function(res){setTimeout(function(){orden.push('fin'+id);res();},20);});};}
  await Promise.all([_gmailWebEnCola(tarea(1)),_gmailWebEnCola(tarea(2)),_gmailWebEnCola(tarea(3))]);
  check('cola serializa ('+orden.join(',')+')', orden.join(',')==='inicio1,fin1,inicio2,fin2,inicio3,fin3');

  /* 8) una tarea que falla no bloquea la cola */
  var correTrasFallo=false;
  var pf=_gmailWebEnCola(function(){return Promise.reject(new Error('fallo'));});
  var po=_gmailWebEnCola(function(){correTrasFallo=true;return Promise.resolve();});
  await pf.catch(function(){}); await po;
  check('la cola sigue tras un fallo', correTrasFallo===true);

  /* limpieza de temporizadores reales (60 s) para que el proceso termine */
  for(var k in _gmailReintentoTabs){if(_gmailReintentoTabs[k]&&_gmailReintentoTabs[k].t)clearTimeout(_gmailReintentoTabs[k].t);}
  console.log(fallos.length? '\\n*** '+fallos.length+' PRUEBA(S) FALLARON ***':'\\n*** TODAS LAS PRUEBAS PASARON ***');
  process.exit(fallos.length?1:0);
})().catch(function(e){console.error('ERROR DEL ARNÉS:',e);process.exit(2);});
`;

fs.writeFileSync('/home/z/my-project/scripts/_arnes_generado.js', arnes, 'utf8');
console.log('Funciones extraídas de web/index.html:');
['gmailAplicarHora', 'gmailHoraArchivo', 'gmailHoraReintentoAgendar', '_gmailWebEnCola'].forEach(function (n) {
  var m = extraer(n);
  console.log('  · ' + n + ' (' + m.split('\n').length + ' líneas)');
});
require('/home/z/my-project/scripts/_arnes_generado.js');
