#!/bin/bash
# ═══ E2E v2.9.24 — FPL FOTOGRAFIADO/ESCANEADO: OCR real (Tesseract) ═══
# El caso REAL reportado: «cargué el FPL FAP001, matrícula FAP329, en el
# casillero solo se observa FAP329». El PDF es una FOTO (sin capa de texto)
# → la app renderiza la página, corre el OCR de Tesseract y alimenta el
# escáner con el TEXTO (sin geometría). v2.9.24 rescata el vuelo
# presidencial de las casillas («F A P 0 0 1 I S») → «FAP001 - FAP329».
set -u
APP="http://localhost:3000/pdfpro/index.html"

step(){ echo ""; echo "════ $1 ════"; }
EV(){
  local out i
  for i in $(seq 1 12); do
    out=$(agent-browser eval "$1" 2>&1)
    if [ "$out" != "{}" ] && [ -n "$out" ]; then echo "$out" | head -3; return 0; fi
    sleep 2
  done
  echo "$out" | head -3
}
READY(){
  local out i
  for i in $(seq 1 30); do
    out=$(agent-browser eval "(typeof XLSX!=='undefined'&&typeof pdfjsLib!=='undefined'&&typeof FPLScan!=='undefined'&&typeof Tesseract!=='undefined')?'ready':'busy'" 2>&1 | head -1 | tr -d '"')
    [ "$out" = "ready" ] && { sleep 2; echo "[listo tras $i sondeos]"; return 0; }
    sleep 2
  done
  echo "[TIMEOUT: $out]"; return 1
}
CAMPO(){ # espera a que selloMatricula valga $1 (máx 25 s)
  local out i
  for i in $(seq 1 25); do
    out=$(agent-browser eval "document.getElementById('selloMatricula').value" 2>&1 | head -1 | tr -d '"')
    [ "$out" = "$1" ] && { echo "  ✓ campo=$out (tras ${i} sondeos)"; return 0; }
    sleep 1
  done
  echo "  ✗ TIMEOUT: campo='$out' (esperaba '$1')"; return 1
}
CAMPO_LENTA(){ # OCR de Tesseract: hasta 4 minutos
  local out i
  for i in $(seq 1 120); do
    out=$(agent-browser eval "document.getElementById('selloMatricula').value" 2>&1 | head -1 | tr -d '"')
    [ "$out" = "$1" ] && { echo "  ✓ campo=$out (tras $((i*2)) s de OCR)"; return 0; }
    sleep 2
  done
  echo "  ✗ TIMEOUT: campo='$out' (esperaba '$1')"; return 1
}
CARGAR(){
  agent-browser eval "(async function(){ var r=await fetch('/$1'); var ab=await r.arrayBuffer(); var f=new File([ab],'$1',{type:'application/pdf'}); var dt=new DataTransfer(); dt.items.add(f); var inp=document.getElementById('fInput'); inp.files=dt.files; inp.dispatchEvent(new Event('change',{bubbles:true})); return 'cargando $1'; })()" >/dev/null 2>&1
}
LIMPIAR(){
  agent-browser eval "(function(){ try{ var tabs=docTabs.slice(); tabs.forEach(function(t){ if(t.id!==activeTabId) docTabClose(t.id); }); }catch(e){} return 'limpio'; })()" >/dev/null 2>&1
}

step "1. Abrir app + sesión de prueba (E2E Verificador → iniciales EV)"
agent-browser open "$APP" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
agent-browser set viewport 1920 1080 >/dev/null 2>&1
READY || exit 1
EV "sessionStorage.setItem('pdfpro_sess', JSON.stringify({id:'e2e',login:'e2e',email:'e2e@corpac.gob.pe',name:'E2E Verificador',cargo:'AIS',sede:'SPHI',plan:'p1',status:'active',expiry:'2099-01-01',isAdmin:false})); 'sesion guardada'"
agent-browser open "$APP" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
READY || exit 1
EV "typeof FPLScan._vueloPresidencial==='function' ? 'v2.9.24 cargado' : 'FALLO: sin _vueloPresidencial'"

step "2. Versión v2.9.24 (pie de página)"
EV "(document.documentElement.innerHTML.indexOf('v2.9.24')>=0)?'v2.9.24 ✓':'FALLO: sin v2.9.24'"

step "3. ★ EL CASO REAL: FOTO del FPL FAP001 (PDF sin texto) → OCR Tesseract → «FAP001 - FAP329»"
CARGAR tmp_e2e_fpl_foto_fap001.pdf
echo "  (esperando el OCR de Tesseract — hasta 4 min)…"
CAMPO_LENTA "FAP001 - FAP329" || { EV "document.body.innerText.slice(0,600)"; exit 1; }
EV "(function(){var t=document.body.innerText;return JSON.stringify({matricula:document.getElementById('selloMatricula').value,iniciales:document.getElementById('selloTxInitials').value,toastJefe:t.indexOf('JEFE DE ESTADO')>=0,toastVuelo:t.indexOf('vuelo FAP001')>=0});})()"

step "4. Nombre de registro de la foto presidencial → «FAP001 - FAP329 EV.pdf»"
EV "(function(){return fplNombreRegistro('FAP 001 13-11.pdf');})()"

step "5. Regresión: FAP001 NATIVO (geometría, con texto) → «FAP001 - FAP329»"
LIMPIAR
sleep 2
CARGAR tmp_e2e_fpl_fap001.pdf
CAMPO "FAP001 - FAP329" || exit 1

step "6. Regresión: EP001 nativo → «EP001 - EP246»"
LIMPIAR
sleep 2
CARGAR tmp_e2e_fpl_ep001.pdf
CAMPO "EP001 - EP246" || exit 1

step "7. Regresión: aerolínea CM468 → HP1520 (sin marca presidencial)"
LIMPIAR
sleep 2
CARGAR tmp_e2e_fpl_form_casillas.pdf
CAMPO HP1520 || exit 1
EV "(function(){return document.body.innerText.indexOf('JEFE DE ESTADO')<0?'✓ sin marca presidencial':'✗ marcado por error';})()"

step "8. Regresión: SPHI-SPST → OB1630 · télex FAP211 → OB1630 · oficio → limpio"
LIMPIAR
sleep 2
CARGAR tmp_e2e_fpl_sphi_spst.pdf
CAMPO OB1630 || exit 1
LIMPIAR
sleep 2
CARGAR tmp_e2e_fpl_telex.pdf
CAMPO OB1630 || exit 1
LIMPIAR
sleep 2
CARGAR tmp_e2e_oficio.pdf
sleep 6
EV "document.getElementById('selloMatricula').value==='' ? '✓ no-FPL → campo limpio' : '✗ quedó: '+document.getElementById('selloMatricula').value"
