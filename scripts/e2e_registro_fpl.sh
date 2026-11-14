#!/bin/bash
# ═══ E2E v2.9.13 — REGISTRO FPL: nombre MATRÍCULA INICIALES + archivado ═══
# Simula el puente de escritorio y verifica:
#   A) helpers de nombre (matrícula+iniciales, fallback usuario, saneo)
#   B) dlBlob escritorio → guardarRegistroFPL con nombre nuevo, SIN descarga
#   C) dlBlob con archivado desactivado → descarga con el nombre nuevo (web)
#   D) cadena completa: imagen abierta → imgSaveOriginal → OB2147 MK.jpg
#   E) sincronía móvil del campo matrícula
set -u
APP="http://localhost:3000/pdfpro/index.html"

step(){ echo ""; echo "════ $1 ════"; }
EV(){
  local out i
  for i in $(seq 1 10); do
    out=$(agent-browser eval "$1" 2>&1)
    if [ "$out" != "{}" ] && [ -n "$out" ]; then echo "$out" | head -3; return 0; fi
    sleep 2
  done
  echo "$out" | head -3
}
READY(){
  local out i
  for i in $(seq 1 30); do
    out=$(agent-browser eval "(typeof XLSX!=='undefined'&&typeof pdfjsLib!=='undefined'&&typeof PDFLib!=='undefined')?'ready':'busy'" 2>&1 | head -1 | tr -d '"')
    [ "$out" = "ready" ] && { sleep 3; echo "[listo tras $i sondeos]"; return 0; }
    sleep 2
  done
  echo "[TIMEOUT: $out]"; return 1
}

step "1. Abrir app + sesión"
agent-browser open "$APP" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
agent-browser set viewport 1920 1080 >/dev/null 2>&1
READY || exit 1
EV "sessionStorage.setItem('pdfpro_sess', JSON.stringify({id:'e2e',login:'e2e',email:'e2e@corpac.gob.pe',name:'E2E Verificador',cargo:'AIS',sede:'SPHI',plan:'p1',status:'active',expiry:'2099-01-01',isAdmin:false})); 'sesion guardada'"
agent-browser open "$APP" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
READY || exit 1

step "2. Puente simulado + espías"
EV "(function(){ window.__fplSaves=[]; window.__descargas=[]; window.__fplModo='ok'; window.pdfproDesktop={isDesktop:true,platform:'win32',getAppVersion:function(){return Promise.resolve('2.9.13');},openAuthPopup:function(){return Promise.resolve({error:'cancelled'});},onOpenFile:function(cb){window.__openFileCb=cb;},onDownloadDone:function(){},ready:function(){},guardarRegistroFPL:function(nombre,buffer){window.__fplSaves.push({nombre:nombre,bytes:buffer?buffer.byteLength:0}); if(window.__fplModo==='omitido')return Promise.resolve({ok:false,omitido:true}); if(window.__fplModo==='error')return Promise.resolve({ok:false,error:'sin permisos'}); return Promise.resolve({ok:true,ruta:'C:\\\\Users\\\\aissphi\\\\Desktop\\\\REGISTROS FPL NOTAM\\\\FPL\\\\2026\\\\11 Noviembre\\\\13\\\\'+nombre});}}; var _click=HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click=function(){ if(this&&this.download)window.__descargas.push(this.download); return _click.apply(this,arguments); }; return 'puente + espias listos'; })()"
EV "(async function(){ var r=await fetch('/pdfpro/desktop-bridge.js'); (0,eval)(await r.text()); return 'desktop-bridge.js ejecutado: '+(typeof window.__openFileCb==='function'?'onOpenFile ok':'SIN onOpenFile'); })()"

step "A. Helpers de nombre"
EV "(async function(){ var m=document.getElementById('selloMatricula'),i=document.getElementById('selloTxInitials'); m.value='ob2147'; m.dispatchEvent(new Event('input')); i.value='mk'; var r={}; r.conAmbos=fplNombreRegistro('oficio_editado.pdf'); i.value=''; r.fallbackUsuario=fplNombreRegistro('oficio_editado.pdf'); m.value='OB 2147/x'; m.dispatchEvent(new Event('input')); r.saneo=fplNombreRegistro('x.pdf'); m.value=''; m.dispatchEvent(new Event('input')); r.sinMatricula=fplNombreRegistro('oficio_editado.pdf'); r.persistido=sessionStorage.getItem('fpl_matricula'); return JSON.stringify(r); })()"

step "B. dlBlob escritorio → archiva SIN descargar"
EV "(async function(){ var m=document.getElementById('selloMatricula'),i=document.getElementById('selloTxInitials'); m.value='OB2147'; m.dispatchEvent(new Event('input')); i.value='MK'; var blob=new Blob([new Uint8Array([37,80,68,70,45,49,46,52])],{type:'application/pdf'}); await dlBlob(blob,'oficio_editado.pdf'); await new Promise(function(r){setTimeout(r,700);}); return JSON.stringify({guardados:window.__fplSaves,descargas:window.__descargas,toastArchivado:document.body.innerText.indexOf('Archivado en Registro FPL')>=0}); })()"

step "C. Archivado desactivado (menú) → descarga con nombre nuevo"
EV "(async function(){ window.__fplModo='omitido'; var blob=new Blob([new Uint8Array([1,2,3])],{type:'application/pdf'}); await dlBlob(blob,'oficio_editado.pdf'); await new Promise(function(r){setTimeout(r,500);}); var r={guardados:window.__fplSaves.length,descargas:window.__descargas}; window.__fplModo='ok'; return JSON.stringify(r); })()"

step "D. Cadena completa: imagen → guardar original → OB2147 MK.jpg"
EV "(async function(){ var r=await fetch('/tmp_e2e_fpl.jpg'); var ab=await r.arrayBuffer(); window.__openFileCb({name:'fpl_escaneado.jpg',path:'C:\\\\Users\\\\aissphi\\\\Desktop\\\\fpl_escaneado.jpg',buffer:ab}); return 'imagen enviada'; })()"
sleep 4
EV "(async function(){ var t=docTabGet(activeTabId); if(!t||t.kind!=='image')return JSON.stringify({tabActivo:(t||{}).kind,error:'no hay pestaña de imagen'}); await imgSaveOriginal(t); await new Promise(function(r){setTimeout(r,900);}); var ult=window.__fplSaves[window.__fplSaves.length-1]||{}; return JSON.stringify({tabActivo:t.kind,ultimoGuardado:ult.nombre,bytes:ult.bytes,guardadosTotales:window.__fplSaves.length,descargas:window.__descargas.length}); })()"

step "E. Sincronía móvil del campo matrícula"
EV "(function(){ var mob=document.getElementById('mobSelloMatricula'); mob.value='SPHI'; mobSelloSync(true); return JSON.stringify({sincronizado:document.getElementById('selloMatricula').value}); })()"

step "FIN — errores de consola"
agent-browser console 2>&1 | grep -iE "error|uncaught" | grep -v "get_all_users\|UNAUTHORIZED\|invalid input syntax\|CDP\|Target" | head -5
echo "(vacío = sin errores)"
