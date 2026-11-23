'use strict';
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

function gmailAplicarHora(ms,origen,gmailLocal,tab){
  /* v3.2.29 — la hora capturada cancela SOLO la cadena de re-búsqueda de LA
     pestaña que la recibió: antes se cancelaba el temporizador GLOBAL y, con
     varios archivos abiertos, la hora de uno cortaba la re-búsqueda pendiente
     de los demás (sus horas quedaban sin capturar para siempre). */
  var _rtTab=null;try{_rtTab=(tab&&tab.id)?tab:docTabGet(activeTabId);}catch(e){}
  if(_rtTab&&_rtTab.id&&_gmailReintentoTabs[_rtTab.id]){
    var _rte=_gmailReintentoTabs[_rtTab.id];
    if(_rte&&_rte.t)clearTimeout(_rte.t);
    delete _gmailReintentoTabs[_rtTab.id];
  }
  var d=new Date(ms);
  var fecha=d.toISOString().slice(0,10);            // UTC YYYY-MM-DD
  var hora=String(d.getUTCHours()).padStart(2,'0')+String(d.getUTCMinutes()).padStart(2,'0');
  /* v3.2.8 — la hora pertenece a SU pestaña (la del archivo buscado): se
     guarda siempre en ella; la FICHA solo se toca si esa pestaña sigue
     activa (si el usuario ya cambió de documento, su hora no se pisa) */
  var t2=tab||null,act=null;
  try{act=docTabGet(activeTabId);}catch(e){}
  if(!t2)t2=act;
  if(t2){t2.selloFecha=fecha;t2.selloHora=hora;t2.selloHoraArchivo=(t2.fileName||'');} /* v3.2.24: la hora queda firmada con el archivo al que pertenece */
  if(!tab||t2===act){
    var f=document.getElementById('selloRxDate');if(f)f.value=fecha;
    var h=document.getElementById('selloRxTime');if(h)h.value=hora;
    _gmailHoraManual=false;   /* v3.2.26 — la aplicó el programa, no la escribió el usuario */
    updateSelloPreview();
    toast('📥 Recepción aplicada (UTC): '+fecha.split('-').reverse().join('/')+' '+hora+' — '+origen+(gmailLocal?' · Gmail: «'+gmailLocal+'» (hora Lima) +5 h → UTC':''),'ok',9000);
  }
}

async function gmailHoraArchivo(manual,reintento,tabForzado){
  var nombre='';var _tab=null;
  if(tabForzado)_tab=tabForzado;                // v3.2.26: búsqueda de ESA pestaña (aunque ya no sea la activa)
  else{try{_tab=docTabGet(activeTabId);}catch(e){}}
  if(_tab&&_tab.fileName)nombre=_tab.fileName;
  if(!nombre)nombre=fileName||'';
  if(!nombre)return;
  /* v3.2.29 — el presupuesto de re-búsqueda se renueva POR PESTAÑA: cada
     búsqueda nueva de ESTA pestaña reinicia el suyo (y retira su ronda
     pendiente); el de las demás pestañas no se toca — antes el contador
     era global y las cargas en ráfaga de varios archivos se lo comían
     entre sí hasta agotarlo para todas */
  if(!reintento&&_tab&&_tab.id){
    var _re0=_gmailReintentoTabs[_tab.id];
    if(_re0){if(_re0.t)clearTimeout(_re0.t);_gmailReintentoTabs[_tab.id]={t:null,n:0};}
  }
  var t=document.getElementById('selloRxTime');
  /* v3.2.26 — el campo del formulario refleja a la pestaña ACTIVA: su
     guard solo vale cuando la búsqueda es de la pestaña visible; una
     pestaña en segundo plano solo se salta si ya tiene su hora */
  var _esActiva=true;try{var _at=docTabGet(activeTabId);_esActiva=(!_at||_at===_tab);}catch(e){}
  /* v3.2.24 — el guard «ya hay hora» distingue de qué ARCHIVO es el valor
     del campo: si la pestaña cambió de archivo, la fecha/hora que quedaron
     son del ANTERIOR (se sellaría con la hora del correo de otro vuelo) —
     se limpian y se busca la de ESTE archivo. La hora escrita a MANO por
     el usuario (sin archivo firmado) se respeta como siempre.
     v3.2.25 — también es de OTRO archivo el valor del que la pestaña no
     guarda ningún rastro: una pestaña recién creada (al abrir un archivo
     con otro documento ya cargado) nace sin fecha/hora propia — cualquier
     valor visible en el campo es del documento que se dejó, y se busca la
     de ESTE archivo. Solo se respeta la hora firmada con este archivo o
     la guardada en la pestaña sin firma de archivo (escrita a mano). */
  if(t&&t.value&&!manual&&_esActiva){
    var _horaDeEste=!!(_tab&&((_tab.selloHoraArchivo&&_tab.selloHoraArchivo===nombre)||(_tab.selloHora&&!_tab.selloHoraArchivo)));
    if(_horaDeEste||_gmailHoraManual){gmailLoginBtnOcultar();return;}   // ya hay hora (de este archivo o escrita a mano): no se toca
    t.value='';
    var _fdG=document.getElementById('selloRxDate');if(_fdG)_fdG.value='';
    if(_tab){_tab.selloHora='';_tab.selloFecha='';_tab.selloHoraArchivo='';}
    try{updateSelloPreview();}catch(e){}
    try{mobSelloSync(false);}catch(e){}
  }else if(!manual&&!_esActiva&&_tab&&_tab.selloHora){
    return;   // v3.2.26: la pestaña en segundo plano ya tiene su hora (propia o manual): no se rebusca
  }
  try{
    if(await gmailHoraApiPorArchivo(nombre,_tab)){gmailLoginBtnOcultar();return;}
  }catch(e){/* la API falló (sin conexión/sin sesión): se prueba la vía asistida */}
  if(!gmailHoraPuede()){
    /* v3.2.10 — sin vía asistida disponible (web, o escritorio sin el
       servicio de Playwright): este punto retornaba EN SILENCIO y, con el
       panel de monitoreo retirado en v3.2.9, la captura de la hora quedaba
       sin ninguna forma de completarse. Ahora: siempre se agenda una
       re-búsqueda silenciosa (el correo puede llegar después del PDF) y,
       si además no hay sesión de Google, se muestra el botón «🔗 Iniciar
       sesión en Gmail» con un aviso (una vez por sesión) para que la
       captura siempre tenga cómo cumplirse */
    gmailHoraReintentoAgendar(_tab);
    var _tok=null;try{_tok=gmailWebTokens()&&gmailWebTokens().access_token;}catch(e){}
    if(!_tok){
      gmailLoginBtnMostrar();
      if(manual||!_gmailSesionToast){
        _gmailSesionToast=true;
        toast(gmailIsDesktop()
          ?'🔐 Gmail: falta iniciar sesión para capturar la hora — pulsa «🔗 Iniciar sesión en Gmail» (junto a Hora Recepción)'
          :'🔐 Conecta Google para capturar la hora — pulsa «🔗 Iniciar sesión en Gmail» (junto a Hora Recepción)','warn',12000);
      }
    }
    return;
  }
  /* v3.2.15 — si Google ya está conectado (OAuth), la búsqueda por API es
     la vía autorizada y NO se abre la ventana de login del buscador: el
     correo simplemente aún no llegó (la re-búsqueda por API lo encontrará).
     La ventana del buscador solo aporta cuando NO hay conexión por Google;
     abrirla aquí era lo que producía el aviso «No se completó el inicio
     de sesión» sin necesidad. El botón «🔗» (manual) sí puede abrirla. */
  if(!manual&&gmailIsDesktop()){
    var _oauthOk=false;
    try{var _st=await window.pdfproDesktop.gmailEstado();_oauthOk=!!(_st&&_st.conectado);}catch(e){_oauthOk=false;}
    if(_oauthOk){
      gmailHoraReintentoAgendar(_tab);
      if(!reintento)toast('📭 Todavía no llega el correo con este archivo — se volverá a buscar solo','warn',9000);
      return;
    }
  }
  try{
    var r=await window.pdfproDesktop.gmailHoraBuscar(nombre,!!manual);
    if(!r||!r.ok){
      /* silencio SOLO cuando no hay nada que hacer; los fallos reales se
         muestran para poder diagnosticarlos (v3.2.1) */
      /* v3.2.11 — estos dos casos significan que la SESIÓN funcionó (Gmail
         respondió): se marca para que la re-búsqueda también use la vía
         asistida, no solo la API */
      if(r&&r.tipo==='ArchivoNoEncontradoError'){gmailLoginBtnOcultar();_gmailAsistidaSesionOk=true;gmailHoraReintentoAgendar(_tab);if(!reintento)toast('📭 Todavía no llega el correo con este archivo — se volverá a buscar solo','warn',9000);return;}
      if(r&&r.tipo==='HoraNoExtraidaError'){gmailLoginBtnOcultar();_gmailAsistidaSesionOk=true;gmailHoraReintentoAgendar(_tab);if(!reintento)toast('📧 El correo está, pero la hora no se pudo leer todavía — se reintentará solo','warn',9000);return;}
      if(!r||r.tipo==='SinArchivo'||r.tipo==='Ocupado')return;
      if(r.tipo==='LoginCancelado'){
        _gmailAsistidaSesionOk=false;
        gmailLoginBtnMostrar();
        /* v3.2.15 — el PORQUÉ (ventana cerrada, tiempo agotado, no se pudo
           cargar…) viene en r.error, y el aviso sale UNA vez por sesión:
           antes salía con cada PDF cargado. En el proceso principal hay un
           candado: la ventana no se reabre sola tras un cancel; el botón
           «🔗 Iniciar sesión en Gmail» la abre cuando el usuario quiera. */
        if(!_gmailLoginCancelToast){
          _gmailLoginCancelToast=true;
          toast('🔐 '+((r&&r.error)||'No se completó el inicio de sesión en Gmail')+' — pulsa «🔗 Iniciar sesión en Gmail» (junto a Hora Recepción) para completarlo cuando quieras','warn',12000);
        }
      }
      else if(r.tipo==='SesionNoTransferida'){
        _gmailAsistidaSesionOk=false;
        gmailLoginBtnMostrar();
        toast('⚠️ Gmail: la sesión no se pudo transferir al buscador. Envía el archivo gmail-hora.log (carpeta %APPDATA%\\PDFPRO) para revisarlo','err',14000);
      }
      else if(r.tipo==='PlaywrightFalta')toast('📧 Falta Playwright en la instalación de escritorio','err',9000);
      else if(r.tipo==='NavegadorFalta'){
        /* v3.2.13 — ningún navegador disponible (Chrome/Edge/Chromium):
           se dice la causa REAL. v3.2.21 — ya NO se deriva al botón
           «Conectar Gmail»: el monitor OAuth necesita credenciales que
           este instalador no incluye (client_id vacío) y el consejo era
           un callejón sin salida; la vía real es instalar un navegador. */
        toast('🌐 '+((r&&r.error)||'ningún navegador disponible')+' — instala Google Chrome o Microsoft Edge y vuelve a cargar el PDF: la hora se buscará sola con cualquiera de los dos','err',16000);
      }
      else toast('📧 '+((r&&r.error)||'no se pudo buscar el correo'),'err',9000);
      return;
    }
    gmailLoginBtnOcultar();                     // la sesión quedó funcionando
    _gmailAsistidaSesionOk=true;
    if(!r.recibidoMs){
      /* la hora se leyó pero el formato no se reconoce: se muestra el
         texto crudo para poder ajustar el parser (no se inventa nada) */
      toast('📧 Hora leída de Gmail pero no interpretada: «'+r.horaRecepcion+'» — repórtala para ajustar el parser','warn',10000);
      return;
    }
    gmailAplicarHora(r.recibidoMs,'correo de '+(r.remitente||r.remitenteCorreo||'Gmail'),r.horaRecepcion,_tab);
  }catch(e){toast('📧 Error buscando el correo: '+e.message,'err',9000);}
}

function gmailHoraReintentoAgendar(tab){
  var _tid=(tab&&tab.id)||null;
  if(!_tid){try{_tid=activeTabId||null;}catch(e){}}
  if(!_tid)return;
  var e=_gmailReintentoTabs[_tid]||(_gmailReintentoTabs[_tid]={t:null,n:0});
  if(e.t){clearTimeout(e.t);e.t=null;}
  if(e.n>=4)return;                              // presupuesto de ESTA pestaña (renueva con su próxima carga/cambio)
  e.n++;
  e.t=setTimeout(async function(){
    e.t=null;
    var t=document.getElementById('selloRxTime');
    var _tab=null;try{_tab=docTabGet(_tid);}catch(e2){}
    if(!_tab){delete _gmailReintentoTabs[_tid];return;}   // pestaña cerrada: su cadena termina aquí
    var nombre=_tab.fileName||'';
    if(!nombre||nombre==='Sin título')return;
    /* v3.2.26 — mismos guards que la búsqueda directa: el del campo solo
       si la pestaña es la ACTIVA (el formulario refleja a la activa); una
       pestaña en segundo plano se salta solo si ya tiene su hora */
    var _esAct=true;try{var _at2=docTabGet(activeTabId);_esAct=(!_at2||_at2===_tab);}catch(e3){}
    if(_esAct&&t&&t.value&&!(_tab.selloHoraArchivo&&_tab.selloHoraArchivo!==nombre))return;
    if(!_esAct&&_tab.selloHora)return;
    try{
      if(await gmailHoraApiPorArchivo(nombre,_tab))return;
      if(_gmailAsistidaSesionOk&&gmailHoraPuede()){await gmailHoraArchivo(false,true,_tab);return;}
    }catch(e4){}
    gmailHoraReintentoAgendar(_tab);
  },60000);
}

function _gmailWebEnCola(fn){
  var p=_gmailWebCadena.then(fn);
  _gmailWebCadena=p.then(function(){},function(){});
  return p;
}

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
  console.log(fallos.length? '\n*** '+fallos.length+' PRUEBA(S) FALLARON ***':'\n*** TODAS LAS PRUEBAS PASARON ***');
  process.exit(fallos.length?1:0);
})().catch(function(e){console.error('ERROR DEL ARNÉS:',e);process.exit(2);});
