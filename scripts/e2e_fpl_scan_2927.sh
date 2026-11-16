#!/bin/bash
# ═══ E2E v2.9.27 — VUELO CON DESIGNADOR: ID DE VUELO + MATRÍCULA + INICIALES ═══
# Petición de la oficina: cuando la IDENTIFICACIÓN DEL VUELO (casillero 7)
# NO es la matrícula — designador de empresa + nº de vuelo «LPE2273» con
# «REG/CCBJE» en el casillero 18 — el campo «Matrícula (Aeronave /
# Espacio)» lleva ID DE VUELO + MATRÍCULA + INICIALES DEL OPERADOR:
# «LPE2273 CCBJE MK» (con las iniciales del dueño del sello activo) y el
# archivo del registro se nombra igual (LPE2273 CCBJE MK.pdf, SIN duplicar
# las iniciales del final). Se prueba: el FPL designador (formulario con
# casillas), el mensaje de texto (télex), el nombre de archivo con
# iniciales vigentes / viejas autocorregidas, y todas las regresiones
# (OB1630 del casillero 7, JEFE DE ESTADO «EP001 - EP246», formación
# «FAP123 FAP124», télex FAP211, CM468→HP1520 con designador, FOTO FAP001
# con OCR real, oficio limpio).
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
PONER(){ # escribe $1 en selloMatricula como ingreso manual
  agent-browser eval "(function(){ var el=document.getElementById('selloMatricula'); el.value=''; el.value='$1'; el.dispatchEvent(new Event('input',{bubbles:true})); return 'campo=$1'; })()" >/dev/null 2>&1
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
EV "typeof FPLScan.extraerFPL==='function' && typeof fplNombreRegistro==='function' ? 'app cargada' : 'FALLO: sin funciones'"
EV "(function(){ var el=document.getElementById('selloTxInitials'); if(!el.value){el.value='EV';} return 'iniciales del operador: '+el.value; })()"

step "2. Versión v2.9.27 (pie de página)"
EV "(document.documentElement.innerHTML.indexOf('v2.9.27')>=0)?'v2.9.27 ✓':'FALLO: sin v2.9.27'"

step "3. ★ DESIGNADOR (formulario con casillas): casillero 7 «LPE2273» + REG/CCBJE del 18 → campo «LPE2273 CCBJE EV»"
CARGAR tmp_e2e_fpl_designador.pdf
CAMPO "LPE2273 CCBJE EV" || { EV "document.body.innerText.slice(0,600)"; exit 1; }
EV "(function(){var t=document.body.innerText;return (t.indexOf('ID de vuelo + matrícula')>=0)?'✓ aviso: '+t.slice(t.indexOf('Matrícula detectada'),t.indexOf('Matrícula detectada')+120):'✗ sin marca del formato en el aviso';})()"

step "4. ★ NOMBRE del registro: «LPE2273 CCBJE EV.pdf» — las iniciales del final NO se duplican"
EV "fplNombreRegistro('FPL.pdf')==='LPE2273 CCBJE EV.pdf' ? '✓ '+fplNombreRegistro('FPL.pdf') : '✗ '+fplNombreRegistro('FPL.pdf')"

step "5. ★ Iniciales VIEJAS autocorregidas: campo «LPE2273 CCBJE AB» → nombre con las vigentes (EV)"
PONER "LPE2273 CCBJE AB"
EV "fplNombreRegistro('FPL.pdf')==='LPE2273 CCBJE EV.pdf' ? '✓ '+fplNombreRegistro('FPL.pdf') : '✗ '+fplNombreRegistro('FPL.pdf')"
step "5b. ★ Caso normal intacto: campo «OB2147» → «OB2147 EV.pdf»"
PONER "OB2147"
EV "fplNombreRegistro('FPL.pdf')==='OB2147 EV.pdf' ? '✓ '+fplNombreRegistro('FPL.pdf') : '✗ '+fplNombreRegistro('FPL.pdf')"

step "6. ★ TEXTO (mensaje télex de línea aérea): (FPL-LPE2273… -18/REG/CCBJE) → «LPE2273 CCBJE EV»"
EV "(function(){ fplResetMatricula(); var ok=fplEscanea('(FPL-LPE2273-IG -SPHI0730 -SPST0055 -DOF/261116 -18/REG/CCBJE OPR/LPE -0)',null); return ok+' → '+document.getElementById('selloMatricula').value; })()"
CAMPO "LPE2273 CCBJE EV" || exit 1

step "7. Regresión: SPHI-SPST (el casillero 7 ES la matrícula) → «OB1630», sin ID ni iniciales en el campo"
LIMPIAR
sleep 2
CARGAR tmp_e2e_fpl_sphi_spst.pdf
CAMPO OB1630 || exit 1
EV "fplNombreRegistro('FPL.pdf')==='OB1630 EV.pdf' ? '✓ '+fplNombreRegistro('FPL.pdf') : '✗ '+fplNombreRegistro('FPL.pdf')"

step "8. Regresión: JEFE DE ESTADO → «EP001 - EP246» (formato propio, SIN composición nueva)"
LIMPIAR
sleep 2
CARGAR tmp_e2e_fpl_ep001.pdf
CAMPO "EP001 - EP246" || exit 1
EV "fplNombreRegistro('FPL.pdf')==='EP001 - EP246 EV.pdf' ? '✓ '+fplNombreRegistro('FPL.pdf') : '✗ '+fplNombreRegistro('FPL.pdf')"

step "9. Regresión: VUELO EN FORMACIÓN «AVISPA + 1» → «FAP123 FAP124» (solo matrículas)"
LIMPIAR
sleep 2
CARGAR tmp_e2e_fpl_formacion.pdf
CAMPO "FAP123 FAP124" || exit 1
EV "fplNombreRegistro('FPL.pdf')==='FAP123 FAP124 EV.pdf' ? '✓ '+fplNombreRegistro('FPL.pdf') : '✗ '+fplNombreRegistro('FPL.pdf')"

step "10. Regresión: télex FAP211 + REG/OB1630 → «FAP211 OB1630 EV» (designador estatal, misma regla)"
LIMPIAR
sleep 2
CARGAR tmp_e2e_fpl_telex.pdf
CAMPO "FAP211 OB1630 EV" || exit 1

step "11. Regresión: CM468 (casillas de aerolínea) + REG/HP1520 → «CMP468 HP1520 EV»"
LIMPIAR
sleep 2
CARGAR tmp_e2e_fpl_form_casillas.pdf
CAMPO "CMP468 HP1520 EV" || exit 1
EV "(function(){return document.body.innerText.indexOf('JEFE DE ESTADO')<0?'✓ sin marca presidencial':'✗ marcado por error';})()"

step "12. Regresión: FOTO FAP001 (OCR Tesseract real) → «FAP001 - FAP329» (Jefe de Estado, sin composición)"
LIMPIAR
sleep 2
CARGAR tmp_e2e_fpl_foto_fap001.pdf
echo "  (esperando el OCR de Tesseract — hasta 4 min)…"
CAMPO_LENTA "FAP001 - FAP329" || { EV "document.body.innerText.slice(0,600)"; exit 1; }

step "13. Regresión: oficio (no es FPL) → campo limpio"
LIMPIAR
sleep 2
CARGAR tmp_e2e_oficio.pdf
sleep 6
EV "document.getElementById('selloMatricula').value==='' ? '✓ no-FPL → campo limpio' : '✗ quedó: '+document.getElementById('selloMatricula').value"

echo ""
echo "E2E v2.9.27 COMPLETO ✓"
