#!/bin/bash
# ═══ E2E v2.9.9 — MODO IMAGEN (v4: evals de UNA sola línea) ═══
# El CLI agent-browser devuelva {} para evals multilínea dentro de scripts:
# todos los evals van en UNA línea (patrón que pasa consistentemente).
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
EVRAW(){
  local out i
  for i in $(seq 1 10); do
    out=$(agent-browser eval "$1" 2>&1)
    if [ "$out" != "{}" ] && [ -n "$out" ]; then echo "$out" | head -1 | tr -d '"'; return 0; fi
    sleep 2
  done
  echo "$out" | head -1 | tr -d '"'
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

step "1. Abrir app standalone + sesión"
agent-browser open "$APP" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
agent-browser set viewport 1920 1080 >/dev/null 2>&1
READY || exit 1
EV "sessionStorage.setItem('pdfpro_sess', JSON.stringify({id:'e2e',login:'e2e',email:'e2e@corpac.gob.pe',name:'E2E Verificador',cargo:'AIS',sede:'SPHI',plan:'p1',status:'active',expiry:'2099-01-01',isAdmin:false})); 'sesion guardada'"
agent-browser open "$APP" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
READY || exit 1
EV "JSON.stringify({logueado:!!sessionStorage.getItem('pdfpro_sess'), loginOculto:!(document.getElementById('loginLayer')||{offsetParent:1}).offsetParent})"

step "2. Hook de blobs (guardado)"
EV "window.__blobs=[]; var __o=URL.createObjectURL; URL.createObjectURL=function(b){window.__blobs.push({b:b,type:b.type}); return __o.call(URL,b);}; 'hook ok'"

step "3. Subir 2 imágenes a la vez (JPG vertical + PNG horizontal)"
EV "(async function(){ async function fx(u,n,m){var r=await fetch(u);var ab=await r.arrayBuffer();return new File([ab],n,{type:m});} var f1=await fx('/tmp_e2e_jpg.jpg','foto_oficio.jpg','image/jpeg'); var f2=await fx('/tmp_e2e_png.png','foto_paisaje.png','image/png'); var dt=new DataTransfer(); dt.items.add(f1); dt.items.add(f2); var inp=document.getElementById('fInput'); inp.files=dt.files; inp.dispatchEvent(new Event('change',{bubbles:true})); return 'enviadas: '+f1.size+' + '+f2.size+' bytes'; })()"
sleep 4

step "4. Verificar pestañas y páginas A4"
EV "JSON.stringify({tabs:[...document.querySelectorAll('.doc-tab')].map(function(t){return t.textContent.trim();}), pageW:(document.querySelector('.nv-imgpage')||{style:{}}).style.width, pageH:(document.querySelector('.nv-imgpage')||{style:{}}).style.height, imgCargada:!!(document.querySelector('.nv-imgfit')&&document.querySelector('.nv-imgfit').complete)})"

step "5. Sello de recepción sobre la imagen activa (PNG horizontal)"
EV "(function(){ var b=[...document.querySelectorAll('button')].find(function(x){return x.textContent.indexOf('Sello Rec')>=0;}); if(!b)return 'FALLO: sin boton'; b.click(); return 'armado'; })()"
sleep 1
COORD=$(EVRAW "(function(){ var pg=document.querySelector('.nv-imgpage'); pg.scrollIntoView({block:'center'}); var r=pg.getBoundingClientRect(); return Math.round(r.left+r.width/2)+' '+Math.round(r.top+r.height/2); })()")
echo "clic en: $COORD"
agent-browser mouse move $COORD >/dev/null 2>&1
agent-browser mouse down left >/dev/null 2>&1
agent-browser mouse up left >/dev/null 2>&1
sleep 1.5
EV "(function(){ var s=document.querySelector('.nv-sello'); if(!s)return 'FALLO: sello no colocado'; var pg=document.querySelector('.nv-imgpage'); return JSON.stringify({sello:s.innerText.replace(/\n/g,' | ').slice(0,80), dentroDeLaHoja:pg.contains(s), tabSucia:!!document.querySelector('.dt-dirty')}); })()"

step "6. Guardar imagen (PNG → debe salir PNG A4 horizontal 300dpi)"
EV "(function(){ var b=[...document.querySelectorAll('button')].find(function(x){return x.textContent.indexOf('Guardar imagen')>=0;}); if(!b)return 'FALLO: sin boton guardar'; b.click(); return 'guardando'; })()"
sleep 3
EV "(async function(){ if(!window.__blobs.length)return 'FALLO: sin blob'; var e=window.__blobs[window.__blobs.length-1], b=e.b; var head=new Uint8Array(await b.slice(0,4).arrayBuffer()); var hex=[...head].map(function(x){return x.toString(16).padStart(2,'0');}).join(''); var bmp=await createImageBitmap(b); return JSON.stringify({type:e.type,magic:hex,ancho:bmp.width,alto:bmp.height,KB:Math.round(b.size/1024)}); })()"

step "7. Cambiar a la pestaña JPG vertical"
EV "(function(){ var t=[...document.querySelectorAll('.doc-tab')].find(function(x){return x.textContent.indexOf('foto_oficio')>=0;}); if(!t)return 'FALLO: tab no encontrada'; t.click(); return 'tab jpg activa'; })()"
sleep 1.5
EV "JSON.stringify({pageW:(document.querySelector('.nv-imgpage')||{style:{}}).style.width, pageH:(document.querySelector('.nv-imgpage')||{style:{}}).style.height, sellos:document.querySelectorAll('.nv-sello').length})"

step "8. Sello + Guardar JPG (debe salir JPEG A4 vertical 300dpi)"
EV "(function(){ var b=[...document.querySelectorAll('button')].find(function(x){return x.textContent.indexOf('Sello Rec')>=0;}); b.click(); return 'armado'; })()"
sleep 1
COORD=$(EVRAW "(function(){ var pg=document.querySelector('.nv-imgpage'); var r=pg.getBoundingClientRect(); return Math.round(r.left+140)+' '+Math.round(r.top+180); })()")
agent-browser mouse move $COORD >/dev/null 2>&1
agent-browser mouse down left >/dev/null 2>&1
agent-browser mouse up left >/dev/null 2>&1
sleep 1.5
EV "(function(){ var b=[...document.querySelectorAll('button')].find(function(x){return x.textContent.indexOf('Guardar imagen')>=0;}); b.click(); return 'guardando jpg'; })()"
sleep 3
EV "(async function(){ var e=window.__blobs[window.__blobs.length-1], b=e.b; var head=new Uint8Array(await b.slice(0,4).arrayBuffer()); var hex=[...head].map(function(x){return x.toString(16).padStart(2,'0');}).join(''); var bmp=await createImageBitmap(b); return JSON.stringify({type:e.type,magic:hex,ancho:bmp.width,alto:bmp.height,KB:Math.round(b.size/1024)}); })()"

step "9. Exportar PDF de la imagen"
EV "(function(){ var b=[...document.querySelectorAll('button')].find(function(x){return x.textContent.indexOf('Exportar PDF')>=0;}); b.click(); return 'exportando'; })()"
sleep 4
EV "(async function(){ var e=window.__blobs[window.__blobs.length-1], b=e.b; var head=new Uint8Array(await b.slice(0,8).arrayBuffer()); var s=String.fromCharCode.apply(null,head); return JSON.stringify({type:e.type,cabecera:s.slice(0,8),KB:Math.round(b.size/1024)}); })()"

step "10. GIF → debe avisar y guardar como PNG"
EV "(async function(){ var r=await fetch('/tmp_e2e_gif.gif'); var ab=await r.arrayBuffer(); var f=new File([ab],'mini.gif',{type:'image/gif'}); var dt=new DataTransfer(); dt.items.add(f); var inp=document.getElementById('fInput'); inp.files=dt.files; inp.dispatchEvent(new Event('change',{bubbles:true})); return 'gif enviado'; })()"
sleep 3
EV "(function(){ var b=[...document.querySelectorAll('button')].find(function(x){return x.textContent.indexOf('Guardar imagen')>=0;}); b.click(); return 'guardando gif'; })()"
sleep 3
EV "(async function(){ var e=window.__blobs[window.__blobs.length-1], b=e.b; var bmp=await createImageBitmap(b); return JSON.stringify({type:e.type,ancho:bmp.width,alto:bmp.height,KB:Math.round(b.size/1024)}); })()"

step "FIN — errores de consola"
agent-browser console 2>&1 | grep -iE "error|uncaught" | grep -v "get_all_users\|UNAUTHORIZED\|invalid input syntax" | head -5
echo "(vacío = sin errores)"
