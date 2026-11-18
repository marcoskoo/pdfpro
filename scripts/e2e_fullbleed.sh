#!/bin/bash
# ═══ E2E v2.9.10 — FOTO LLENA LA HOJA A4 (full-bleed) + TOGGLE ═══
# Evals de UNA línea (el CLI falla con multilínea en scripts).
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

step "1. Abrir app + sesión"
agent-browser open "$APP" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
agent-browser set viewport 1920 1080 >/dev/null 2>&1
READY || exit 1
EV "sessionStorage.setItem('pdfpro_sess', JSON.stringify({id:'e2e',login:'e2e',email:'e2e@corpac.gob.pe',name:'E2E Verificador',cargo:'AIS',sede:'SPHI',plan:'p1',status:'active',expiry:'2099-01-01',isAdmin:false})); 'sesion guardada'"
agent-browser open "$APP" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
READY || exit 1
EV "JSON.stringify({logueado:!!sessionStorage.getItem('pdfpro_sess'), loginOculto:!(document.getElementById('loginLayer')||{offsetParent:1}).offsetParent})"

step "2. Hook de blobs"
EV "window.__blobs=[]; var __o=URL.createObjectURL; URL.createObjectURL=function(b){window.__blobs.push({b:b,type:b.type}); return __o.call(URL,b);}; 'hook ok'"

step "3. Subir foto vertical (esquinas rojas, fondo azul)"
EV "(async function(){ var r=await fetch('/tmp_e2e_fb.jpg'); var ab=await r.arrayBuffer(); var f=new File([ab],'foto_fullbleed.jpg',{type:'image/jpeg'}); var dt=new DataTransfer(); dt.items.add(f); var inp=document.getElementById('fInput'); inp.files=dt.files; inp.dispatchEvent(new Event('change',{bubbles:true})); return 'foto enviada: '+f.size+' bytes'; })()"
sleep 4

step "4. Verificar modo COVER por defecto (la foto ES la hoja)"
EV "JSON.stringify({pageW:(document.querySelector('.nv-imgpage')||{style:{}}).style.width, pageH:(document.querySelector('.nv-imgpage')||{style:{}}).style.height, claseImg:(document.querySelector('.nv-imgfit')||{className:''}).className, objectFit:getComputedStyle(document.querySelector('.nv-imgfit')).objectFit, botonAjuste:(document.getElementById('nrbFitLbl')||{}).textContent})"

step "5. Sello de recepción sobre la foto"
EV "(function(){ var b=[...document.querySelectorAll('button')].find(function(x){return x.textContent.indexOf('Sello Rec')>=0;}); if(!b)return 'FALLO: sin boton'; b.click(); return 'armado'; })()"
sleep 1
COORD=$(EVRAW "(function(){ var pg=document.querySelector('.nv-imgpage'); pg.scrollIntoView({block:'center'}); var r=pg.getBoundingClientRect(); return Math.round(r.left+r.width/2)+' '+Math.round(r.top+r.height/2); })()")
echo "clic en: $COORD"
agent-browser mouse move $COORD >/dev/null 2>&1
agent-browser mouse down left >/dev/null 2>&1
agent-browser mouse up left >/dev/null 2>&1
sleep 1.5
EV "(function(){ var s=document.querySelector('.nv-sello'); if(!s)return 'FALLO: sello no colocado'; var pg=document.querySelector('.nv-imgpage'); return JSON.stringify({sello:s.innerText.replace(/\n/g,' | ').slice(0,70), dentroDeLaHoja:pg.contains(s)}); })()"

step "6. Guardar en COVER: esquinas NO blancas (full-bleed) + sello presente"
EV "(function(){ var b=[...document.querySelectorAll('button')].find(function(x){return x.textContent.indexOf('Guardar imagen')>=0;}); b.click(); return 'guardando cover'; })()"
sleep 3
EV "(async function(){ var e=window.__blobs[window.__blobs.length-1], b=e.b; var head=new Uint8Array(await b.slice(0,4).arrayBuffer()); var hex=[...head].map(function(x){return x.toString(16).padStart(2,'0');}).join(''); var bmp=await createImageBitmap(b); var cv=document.createElement('canvas'); cv.width=bmp.width; cv.height=bmp.height; var cx=cv.getContext('2d'); cx.drawImage(bmp,0,0); var px=function(x,y){var d=cx.getImageData(x,y,1,1).data; return [d[0],d[1],d[2]];}; var esq=[px(5,5),px(bmp.width-6,5),px(5,bmp.height-6),px(bmp.width-6,bmp.height-6)]; var blancas=esq.filter(function(c){return c[0]>245&&c[1]>245&&c[2]>245;}).length; var sv=document.createElement('canvas'); sv.width=320; sv.height=Math.round(320*bmp.height/bmp.width); var sx=sv.getContext('2d'); sx.drawImage(bmp,0,0,sv.width,sv.height); var dd=sx.getImageData(0,0,sv.width,sv.height).data; var rojas=0; for(var i=0;i<dd.length;i+=4){ if(dd[i]>140&&dd[i]<235&&dd[i+1]<90&&dd[i+2]<90) rojas++; } return JSON.stringify({type:e.type,magic:hex,ancho:bmp.width,alto:bmp.height,esquinasBlancas:blancas,esq1:esq[0],pixelesRojosSello:rojas}); })()"

step "7. Toggle a «Ver completa» (contain)"
EV "(function(){ var b=document.getElementById('nrbFitBtn'); if(!b)return 'FALLO: sin boton ajuste'; b.click(); return 'toggled'; })()"
sleep 1
EV "JSON.stringify({claseImg:(document.querySelector('.nv-imgfit')||{className:''}).className, objectFit:getComputedStyle(document.querySelector('.nv-imgfit')).objectFit, botonAjuste:(document.getElementById('nrbFitLbl')||{}).textContent})"

step "8. Guardar en CONTAIN: esquinas BLANCAS (foto completa con margen)"
EV "(function(){ var b=[...document.querySelectorAll('button')].find(function(x){return x.textContent.indexOf('Guardar imagen')>=0;}); b.click(); return 'guardando contain'; })()"
sleep 3
EV "(async function(){ var e=window.__blobs[window.__blobs.length-1], b=e.b; var bmp=await createImageBitmap(b); var cv=document.createElement('canvas'); cv.width=bmp.width; cv.height=bmp.height; var cx=cv.getContext('2d'); cx.drawImage(bmp,0,0); var px=function(x,y){var d=cx.getImageData(x,y,1,1).data; return [d[0],d[1],d[2]];}; var esq=[px(5,5),px(bmp.width-6,5),px(5,bmp.height-6),px(bmp.width-6,bmp.height-6)]; var blancas=esq.filter(function(c){return c[0]>245&&c[1]>245&&c[2]>245;}).length; return JSON.stringify({type:e.type,ancho:bmp.width,alto:bmp.height,esquinasBlancas:blancas}); })()"

step "9. Toggle de vuelta a «Llenar hoja» (cover)"
EV "(function(){ document.getElementById('nrbFitBtn').click(); return 'toggled back'; })()"
sleep 1
EV "JSON.stringify({objectFit:getComputedStyle(document.querySelector('.nv-imgfit')).objectFit, botonAjuste:(document.getElementById('nrbFitLbl')||{}).textContent, sellosVivos:document.querySelectorAll('.nv-sello').length})"

step "FIN — errores de consola"
agent-browser console 2>&1 | grep -iE "error|uncaught" | grep -v "get_all_users\|UNAUTHORIZED\|invalid input syntax" | head -5
echo "(vacío = sin errores)"
