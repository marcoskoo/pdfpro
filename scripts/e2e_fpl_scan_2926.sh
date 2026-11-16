#!/bin/bash
# ═══ E2E v2.9.26 — ARCHIVO AUTOMÁTICO AL SELLAR + VUELO EN FORMACIÓN ═══
# Petición de la oficina: colocado el sello de la ficha (recepción +
# personal), el documento YA SELLADO se guarda SOLO en
# REGISTROS FPL NOTAM\FPL\<año>\<MM Mes>\<DD> (fecha UTC, escritorio local
# C:\Users\<usuario>). En la WEB no hay carpeta de registro: el enganche
# fplAutoArchivoAlSellar debe ser INOFENSIVO (no romper el sellado). Se
# prueba aquí: el sellado en el editor PDF, el campo de 100 caracteres, la
# formación «GUÍA + 1» (impreso y FOTO con OCR Tesseract real) y todas las
# regresiones (FAP001 foto, EP001, CM468, SPHI-SPST, télex, oficio).
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
EV "typeof fplAutoArchivoAlSellar==='function' && typeof FPLScan.formacionDe==='function' ? 'v2.9.26 cargado' : 'FALLO: sin v2.9.26'"

step "2. Versión v2.9.26 (pie de página)"
EV "(document.documentElement.innerHTML.indexOf('v2.9.26')>=0)?'v2.9.26 ✓':'FALLO: sin v2.9.26'"

step "3. ★ SELLADO en el editor PDF: el sello de la ficha se coloca con un clic"
CARGAR tmp_e2e_fpl_formacion.pdf
CAMPO "FAP123 FAP124" || exit 1
EV "(function(){ placeSelloRecepcion(); var cv=document.querySelector('.acv[data-slot=\"0\"]'); if(!cv) return 'SIN CANVAS'; var r=cv.getBoundingClientRect(); cv.dispatchEvent(new MouseEvent('mousedown',{clientX:r.left+200,clientY:r.top+150,bubbles:true,button:0})); var n=(annotations[0]||[]).filter(function(a){return a.type==='sello_recepcion';}).length; return 'sellos colocados: '+n; })()"
EV "(function(){ var a=(annotations[0]||[]).filter(function(x){return x.type==='sello_recepcion';})[0]; return a?JSON.stringify({timestamp:a.timestamp,txTime:a.txTime,txInitials:a.txInitials,conFirma:!!a.sigImg}):'SIN SELLO'; })()"
EV "(function(){ try{ fplAutoArchivoAlSellar(); return '✓ fplAutoArchivoAlSellar inofensivo en la web (sin carpeta de registro)'; }catch(e){ return '✗ ERROR: '+e.message; } })()"

step "4. ★ FOTO del FPL en formación (sin texto) → OCR Tesseract → «FAP123 FAP124»"
LIMPIAR
sleep 2
CARGAR tmp_e2e_fpl_foto_formacion.pdf
echo "  (esperando el OCR de Tesseract — hasta 4 min)…"
CAMPO_LENTA "FAP123 FAP124" || { EV "document.body.innerText.slice(0,600)"; exit 1; }
EV "(function(){var t=document.body.innerText;return JSON.stringify({matricula:document.getElementById('selloMatricula').value,formacion:t.indexOf('VUELO EN FORMACIÓN')>=0,aeronaves:t.indexOf('02 aeronaves')>=0});})()"

step "5. ★ INGRESO MANUAL: el campo admite 100 caracteres (límite del OCR de fotos)"
EV "(function(){var el=document.getElementById('selloMatricula');el.value='';var largo='FAP123 FAP124 FAP125 FAP126 FAP127 FAP128 FAP129 FAP130 FAP131 FAP132 FAP133 FAP134 FAP135';el.value=largo;el.dispatchEvent(new Event('input',{bubbles:true}));return JSON.stringify({maxlength:el.getAttribute('maxlength'),escritas:el.value.length,de:largo.length,normaliza:fplMatricula()});})()"

step "6. Formación SIN matrículas legibles → aviso específico (campo limpio)"
LIMPIAR
sleep 1
EV "(function(){fplResetMatricula();var avisa=fplEscanea('PLAN DE VUELO 7. IDENTIFICACION DE AERONAVE: AVISPA + 1 9. NÚMERO: 02 18. OTROS DATOS: DOF/261115',null);return avisa===false?'✓ sin matrículas → false (aviso)':'✗ devolvió '+avisa;})()"
EV "(function(){var t=document.body.innerText;return (t.indexOf('VUELO EN FORMACIÓN')>=0&&t.indexOf('sin matrículas leídas')>=0)?'✓ aviso específico de formación':'✗ sin aviso específico';})()"
EV "document.getElementById('selloMatricula').value==='' ? '✓ campo limpio (el callsign NO va en el campo)' : '✗ quedó: '+document.getElementById('selloMatricula').value"

step "7. Regresión: FOTO FAP001 (v2.9.24) → OCR → «FAP001 - FAP329»"
LIMPIAR
sleep 2
CARGAR tmp_e2e_fpl_foto_fap001.pdf
echo "  (esperando el OCR de Tesseract — hasta 4 min)…"
CAMPO_LENTA "FAP001 - FAP329" || { EV "document.body.innerText.slice(0,600)"; exit 1; }

step "8. Regresión: EP001 → «EP001 - EP246» · FAP001 nativo · CM468 → HP1520"
LIMPIAR
sleep 2
CARGAR tmp_e2e_fpl_ep001.pdf
CAMPO "EP001 - EP246" || exit 1
LIMPIAR
sleep 2
CARGAR tmp_e2e_fpl_fap001.pdf
CAMPO "FAP001 - FAP329" || exit 1
LIMPIAR
sleep 2
CARGAR tmp_e2e_fpl_form_casillas.pdf
CAMPO HP1520 || exit 1
EV "(function(){return document.body.innerText.indexOf('JEFE DE ESTADO')<0?'✓ sin marca presidencial':'✗ marcado por error';})()"

step "9. Regresión: SPHI-SPST → OB1630 · télex FAP211 → OB1630 · oficio → limpio"
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
echo ""
echo "E2E v2.9.26 COMPLETO ✓"
