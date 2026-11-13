#!/bin/bash
# ═══ E2E v2.9.11 — HOJA = FOTO COMPLETA (sin recortes ni fondo blanco) ═══
# Reproduce el caso del usuario: foto alta donde «llenar A4» recortaba ~40%.
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
EV "window.__blobs=[]; var __o=URL.createObjectURL; URL.createObjectURL=function(b){window.__blobs.push({b:b,type:b.type}); return __o.call(URL,b);}; 'hook ok'"

step "2. Subir FOTO ALTA 972x2160 (caso del usuario: cover recortaba al ~63%)"
EV "(async function(){ var r=await fetch('/tmp_e2e_alta.jpg'); var ab=await r.arrayBuffer(); var f=new File([ab],'foto_alta.jpg',{type:'image/jpeg'}); var dt=new DataTransfer(); dt.items.add(f); var inp=document.getElementById('fInput'); inp.files=dt.files; inp.dispatchEvent(new Event('change',{bubbles:true})); return 'foto alta enviada: '+f.size+' bytes'; })()"
sleep 4

step "3. Modo por defecto «hoja = foto»: página adaptada y FOTO COMPLETA visible"
EV "(function(){ var pg=document.querySelector('.nv-imgpage'), im=document.querySelector('.nv-imgfit'); var a=pg.getBoundingClientRect(), b=im.getBoundingClientRect(); return JSON.stringify({hojaW:Math.round(a.width),hojaH:Math.round(a.height),fotoW:Math.round(b.width),fotoH:Math.round(b.height),fotoOcupaTodaLaHoja:(Math.abs(a.width-b.width)<1&&Math.abs(a.height-b.height)<1&&Math.abs(a.left-b.left)<1&&Math.abs(a.top-b.top)<1),clase:im.className,objectFit:getComputedStyle(im).objectFit,boton:(document.getElementById('nrbFitLbl')||{}).textContent}); })()"

step "4. Sello de recepción sobre la foto"
EV "(function(){ var b=[...document.querySelectorAll('button')].find(function(x){return x.textContent.indexOf('Sello Rec')>=0;}); if(!b)return 'FALLO: sin boton'; b.click(); return 'armado'; })()"
sleep 1
COORD=$(EVRAW "(function(){ var pg=document.querySelector('.nv-imgpage'); pg.scrollIntoView({block:'center'}); var r=pg.getBoundingClientRect(); return Math.round(r.left+r.width/2)+' '+Math.round(r.top+r.height/2); })()")
echo "clic en: $COORD"
agent-browser mouse move $COORD >/dev/null 2>&1
agent-browser mouse down left >/dev/null 2>&1
agent-browser mouse up left >/dev/null 2>&1
sleep 1.5
EV "(function(){ var s=document.querySelector('.nv-sello'); if(!s)return 'FALLO: sello no colocado'; var pg=document.querySelector('.nv-imgpage'); return JSON.stringify({sellos:document.querySelectorAll('.nv-sello').length, dentroDeLaHoja:pg.contains(s)}); })()"

step "5. Guardar: archivo = foto COMPLETA (esquinas rojas, cero blanco) + sello grabado"
EV "(function(){ var b=[...document.querySelectorAll('button')].find(function(x){return x.textContent.indexOf('Guardar imagen')>=0;}); b.click(); return 'guardando'; })()"
sleep 3
EV "(async function(){ var e=window.__blobs[window.__blobs.length-1], b=e.b; var head=new Uint8Array(await b.slice(0,4).arrayBuffer()); var hex=[...head].map(function(x){return x.toString(16).padStart(2,'0');}).join(''); var bmp=await createImageBitmap(b); var cv=document.createElement('canvas'); cv.width=bmp.width; cv.height=bmp.height; var cx=cv.getContext('2d'); cx.drawImage(bmp,0,0); var px=function(x,y){var d=cx.getImageData(x,y,1,1).data; return [d[0],d[1],d[2]];}; var esq=[px(5,5),px(bmp.width-6,5),px(5,bmp.height-6),px(bmp.width-6,bmp.height-6)]; var blancas=esq.filter(function(c){return c[0]>245&&c[1]>245&&c[2]>245;}).length; var rojasEsq=esq.filter(function(c){return c[0]>200&&c[1]<100&&c[2]<100;}).length; var dd=cx.getImageData(400,1400,1000,900).data; var rojasSello=0; for(var i=0;i<dd.length;i+=4){ if(dd[i]>150&&dd[i]<245&&dd[i+1]<90&&dd[i+2]<90) rojasSello++; } return JSON.stringify({type:e.type,magic:hex,ancho:bmp.width,alto:bmp.height,esquinasRojasFoto:rojasEsq,esquinasBlancas:blancas,pixelesRojosSello:rojasSello}); })()"

step "6. Toggle 1 → «A4 exacto» (cover): hoja A4 literal, foto llena recortando"
EV "(function(){ document.getElementById('nrbFitBtn').click(); return 'toggled'; })()"
sleep 1
EV "(function(){ var pg=document.querySelector('.nv-imgpage'), im=document.querySelector('.nv-imgfit'); var a=pg.getBoundingClientRect(), b=im.getBoundingClientRect(); return JSON.stringify({hojaW:Math.round(a.width),hojaH:Math.round(a.height),fotoOcupaTodaLaHoja:(Math.abs(a.width-b.width)<1&&Math.abs(a.height-b.height)<1),objectFit:getComputedStyle(im).objectFit,boton:(document.getElementById('nrbFitLbl')||{}).textContent}); })()"

step "7. Sello 2 pegado abajo-derecha en A4 exacto (luego probará el reajuste)"
EV "(function(){ var b=[...document.querySelectorAll('button')].find(function(x){return x.textContent.indexOf('Sello Rec')>=0;}); b.click(); return 'armado'; })()"
sleep 1
COORD2=$(EVRAW "(function(){ var pg=document.querySelector('.nv-imgpage'); pg.scrollIntoView({block:'center'}); var r=pg.getBoundingClientRect(); return Math.round(r.left+r.width*0.93)+' '+Math.round(r.top+r.height*0.93); })()")
echo "clic en: $COORD2"
agent-browser mouse move $COORD2 >/dev/null 2>&1
agent-browser mouse down left >/dev/null 2>&1
agent-browser mouse up left >/dev/null 2>&1
sleep 1.5
EV "(function(){ return JSON.stringify({sellos:document.querySelectorAll('.nv-sello').length}); })()"

step "8. Toggle 2 → «Con margen»: A4 blanco, foto completa centrada"
EV "(function(){ document.getElementById('nrbFitBtn').click(); return 'toggled'; })()"
sleep 1
EV "(function(){ var pg=document.querySelector('.nv-imgpage'), im=document.querySelector('.nv-imgfit'); var a=pg.getBoundingClientRect(), b=im.getBoundingClientRect(); return JSON.stringify({hojaW:Math.round(a.width),hojaH:Math.round(a.height),fotoW:Math.round(b.width),conMargen:(b.width<a.width-40&&b.height<a.height-40),objectFit:getComputedStyle(im).objectFit,boton:(document.getElementById('nrbFitLbl')||{}).textContent}); })()"

step "9. Toggle 3 → vuelta a «Hoja = foto»: foto completa y sellos reajustados dentro"
EV "(function(){ document.getElementById('nrbFitBtn').click(); return 'toggled'; })()"
sleep 1
EV "(function(){ var pg=document.querySelector('.nv-imgpage'), im=document.querySelector('.nv-imgfit'); var a=pg.getBoundingClientRect(), b=im.getBoundingClientRect(); var els=pg.querySelectorAll('.nv-sello,.nv-stamp-el'); var dentro=true, pos=[]; els.forEach(function(el){ var l=parseFloat(el.style.left)||0, t=parseFloat(el.style.top)||0, w=el.offsetWidth, h=el.offsetHeight; pos.push(l+'+'+w+'<='+Math.round(a.width)); if(l+w>a.width+1||t+h>a.height+1||l<-1||t<-1) dentro=false; }); return JSON.stringify({hojaW:Math.round(a.width),hojaH:Math.round(a.height),fotoOcupaTodaLaHoja:(Math.abs(a.width-b.width)<1&&Math.abs(a.height-b.height)<1),sellosDentro:dentro,posiciones:pos,boton:(document.getElementById('nrbFitLbl')||{}).textContent}); })()"

step "10. Segunda foto 1200x1600 en nueva pestaña: hoja 794x1059, foto completa"
EV "(async function(){ var r=await fetch('/tmp_e2e_vert.jpg'); var ab=await r.arrayBuffer(); var f=new File([ab],'foto_vert.jpg',{type:'image/jpeg'}); var dt=new DataTransfer(); dt.items.add(f); var inp=document.getElementById('fInput'); inp.files=dt.files; inp.dispatchEvent(new Event('change',{bubbles:true})); return 'foto 2 enviada'; })()"
sleep 4
EV "(function(){ var pg=document.querySelector('.nv-imgpage'), im=document.querySelector('.nv-imgfit'); var a=pg.getBoundingClientRect(), b=im.getBoundingClientRect(); return JSON.stringify({hojaW:Math.round(a.width),hojaH:Math.round(a.height),fotoOcupaTodaLaHoja:(Math.abs(a.width-b.width)<1&&Math.abs(a.height-b.height)<1&&Math.abs(a.left-b.left)<1&&Math.abs(a.top-b.top)<1),objectFit:getComputedStyle(im).objectFit}); })()"

step "FIN — errores de consola"
agent-browser console 2>&1 | grep -iE "error|uncaught" | grep -v "get_all_users\|UNAUTHORIZED\|invalid input syntax" | head -5
echo "(vacío = sin errores)"
