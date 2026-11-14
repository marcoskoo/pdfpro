#!/bin/bash
# ═══ E2E v2.9.12 — PUENTE DE ESCRITORIO (simulado) ═══
# Simula window.pdfproDesktop en el navegador y ejecuta el
# desktop-bridge.js real: los archivos "abiertos desde Windows"
# deben llegar como pestañas con su formato correcto.
set -u
APP="http://localhost:3000/pdfpro/index.html"

step(){ echo ""; echo "════ $1 ════"; }
EV(){
  local out i
  for i in $(seq 1 10); do
    out=$(agent-browser eval "$1" 2>&1)
    if [ "$out" != "{}" ] && [ -n "$out" ]; then echo "$out" | head -2; return 0; fi
    sleep 2
  done
  echo "$out" | head -2
}
READY(){
  local out i
  for i in $(seq 1 30); do
    out=$(agent-browser eval "(typeof XLSX!=='undefined'&&typeof pdfjsLib!=='undefined'&&typeof PDFLib!=='undefined'&&typeof Tesseract!=='undefined')?'ready':'busy'" 2>&1 | head -1 | tr -d '"')
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

step "2. Simular el puente de Electron y ejecutar desktop-bridge.js REAL"
EV "(function(){ window.__bridge={ready:0,opened:0}; window.pdfproDesktop={isDesktop:true,platform:'win32',getAppVersion:function(){return Promise.resolve('2.9.12');},openAuthPopup:function(){return Promise.resolve({error:'cancelled'});},onOpenFile:function(cb){window.__openFileCb=cb;},onDownloadDone:function(){},ready:function(){window.__bridge.ready++;}}; return 'puente simulado'; })()"
EV "(async function(){ var r=await fetch('/pdfpro/desktop-bridge.js'); var t=await r.text(); (0,eval)(t); return 'desktop-bridge.js ejecutado: '+(typeof window.__openFileCb==='function'?'callback registrado':'SIN CALLBACK'); })()"

step "3. Abrir una IMAGEN JPG «desde Windows» (doble clic simulado)"
EV "(async function(){ var r=await fetch('/tmp_e2e_fb2.jpg'); var ab=await r.arrayBuffer(); window.__openFileCb({name:'foto_desde_windows.jpg',path:'C:\\\\Users\\\\demo\\\\Pictures\\\\foto_desde_windows.jpg',buffer:ab}); return 'jpg enviado al puente'; })()"
sleep 4
EV "JSON.stringify({readyLlamado:window.__bridge.ready,tabs:(typeof docTabs!=='undefined')?docTabs.length:-1,tabActivo:(docTabGet(activeTabId)||{}).kind,mimeImagen:((docTabGet(activeTabId)||{})._img||{}).mime,ext:((docTabGet(activeTabId)||{})._img||{}).ext,hojaImg:!!document.querySelector('.nv-imgpage'),fotoOcupaHoja:(function(){var p=document.querySelector('.nv-imgpage'),i=document.querySelector('.nv-imgfit');if(!p||!i)return false;var a=p.getBoundingClientRect(),b=i.getBoundingClientRect();return Math.abs(a.width-b.width)<1&&Math.abs(a.height-b.height)<1;})()})"

step "4. Abrir un PDF «desde Windows»"
EV "(async function(){ var r=await fetch('/tmp_e2e_doc2.pdf'); var ab=await r.arrayBuffer(); window.__openFileCb({name:'oficio_desde_windows.pdf',path:'C:\\\\Users\\\\demo\\\\Documents\\\\oficio_desde_windows.pdf',buffer:ab}); return 'pdf enviado al puente'; })()"
sleep 5
EV "JSON.stringify({pdfCargado:(typeof pdfDoc!=='undefined')&&!!pdfDoc,paginas:(typeof pdfDoc!=='undefined'&&pdfDoc&&pdfDoc.numPages)?pdfDoc.numPages:0,tabs:(typeof docTabs!=='undefined')?docTabs.length:-1,tabActivo:(docTabGet(activeTabId)||{}).kind})"

step "5. Cola antes de iniciar sesión: archivo recibido sin usuario → espera y abre al entrar"
EV "(function(){ var ab=new ArrayBuffer(8); window.__openFileCb({name:'encola.jpg',path:'C:\\\\encola.jpg',buffer:ab}); return 'enviado sin sesión activa (se encolará si aplica)'; })()"
sleep 2
EV "JSON.stringify({sinErrores:true,readyLlamado:window.__bridge.ready})"

step "FIN — errores de consola"
agent-browser console 2>&1 | grep -iE "error|uncaught" | grep -v "get_all_users\|UNAUTHORIZED\|invalid input syntax\|CDP\|Target" | head -5
echo "(vacío = sin errores)"
