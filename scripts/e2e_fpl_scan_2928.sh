#!/bin/bash
# ═══ E2E v2.9.28 — AYUDA DEL CAMPO MATRÍCULA OCULTA (BOTONES A LA VISTA) ═══
# Petición de la oficina: ocultar el texto largo de ayuda bajo el campo
# «Matrícula (Aeronave / Espacio)» para tener los botones del sello a la
# vista. La ayuda queda contraída tras un enlace «ⓘ Cómo se rellena este
# campo…»: un clic la despliega y otro la oculta. El campo vive en la
# PESTAÑA DE SELLOS del editor (etab-sigs): se carga un FPL, se abre la
# pestaña con showEditorTab('sigs') y ahí se mide todo con layout real.
# Regresión del escaneo: designador LPE2273 y OB1630 del casillero 7.
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
    out=$(agent-browser eval "(typeof XLSX!=='undefined'&&typeof pdfjsLib!=='undefined'&&typeof FPLScan!=='undefined')?'ready':'busy'" 2>&1 | head -1 | tr -d '"')
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
EV "typeof showEditorTab==='function' ? 'app cargada' : 'FALLO: sin funciones'"
EV "(function(){ var el=document.getElementById('selloTxInitials'); if(!el.value){el.value='EV';} return 'iniciales del operador: '+el.value; })()"

step "2. Versión v2.9.28 (pie de página)"
EV "(document.documentElement.innerHTML.indexOf('v2.9.28')>=0)?'v2.9.28 ✓':'FALLO: sin v2.9.28'"

step "3. Cargar FPL designador y ABRIR la pestaña de sellos (layout real)"
CARGAR tmp_e2e_fpl_designador.pdf
CAMPO "LPE2273 CCBJE EV" || exit 1
EV "showEditorTab('sigs'); 'pestaña sellos abierta'"
sleep 1
EV "(function(){ var el=document.getElementById('selloMatricula'); return el.offsetHeight>0 ? '✓ panel visible (input '+el.offsetHeight+'px de alto)' : '✗ panel sin layout'; })()"

step "4. ★ AYUDA OCULTA por defecto (no ocupa espacio bajo el campo)"
EV "(function(){ var d=document.getElementById('selloMatriculaAyuda'); if(!d) return '✗ no existe el bloque de ayuda'; return (getComputedStyle(d).display==='none'&&d.offsetHeight===0) ? '✓ ayuda oculta por defecto (display:none · alto 0px)' : '✗ ayuda VISIBLE: '+getComputedStyle(d).display+' · '+d.offsetHeight+'px'; })()"

step "5. ★ BOTONES A LA VISTA: «Colocar Sello de Recepción» renderizado justo tras la vista previa"
EV "(function(){ var inp=document.getElementById('selloMatricula'); var d=document.getElementById('selloMatriculaAyuda'); var bs=document.querySelectorAll('button'); var btn=null; for(var i=0;i<bs.length;i++){ if(bs[i].textContent.indexOf('Colocar Sello de Recepción')>=0){btn=bs[i];break;} } if(!btn) return '✗ no se encontró el botón'; var gap=btn.getBoundingClientRect().top-inp.getBoundingClientRect().bottom; var dh=d.offsetHeight; return '✓ botón renderizado ('+btn.offsetHeight+'px de alto) a '+Math.round(gap)+'px bajo el campo · ayuda '+dh+'px (antes empujaba ~200px más) '+(btn.offsetHeight>0?'✓':'✗'); })()"

step "6. ★ TOGGLE: un clic despliega la ayuda, otro la oculta"
EV "(function(){ var a=document.querySelector('a[onclick*=\"nextElementSibling\"]'); if(!a) return '✗ sin enlace ⓘ'; var d=document.getElementById('selloMatriculaAyuda'); a.click(); var visible=getComputedStyle(d).display!=='none'&&d.offsetHeight>100; var alto=d.offsetHeight; a.click(); var oculta=getComputedStyle(d).display==='none'&&d.offsetHeight===0; return (visible&&oculta)?'✓ despliega ('+alto+'px de texto) y vuelve a ocultar ✓':'✗ visible='+visible+' oculta='+oculta; })()"

step "7. Regresión: DESIGNADOR → nombre «LPE2273 CCBJE EV.pdf» (iniciales no duplicadas)"
EV "fplNombreRegistro('FPL.pdf')==='LPE2273 CCBJE EV.pdf' ? '✓ '+fplNombreRegistro('FPL.pdf') : '✗ '+fplNombreRegistro('FPL.pdf')"

step "8. Regresión: SPHI-SPST (casillero 7 = matrícula) → «OB1630»"
LIMPIAR
sleep 2
CARGAR tmp_e2e_fpl_sphi_spst.pdf
CAMPO OB1630 || exit 1

step "9. Captura visual del panel (campo + botones, sin la ayuda)"
EV "showEditorTab('sigs'); window.scrollTo(0,0); 'listo para captura'"
sleep 1
agent-browser screenshot /tmp/e2e_2928_panel.png >/dev/null 2>&1 && echo "  captura: /tmp/e2e_2928_panel.png"

echo ""
echo "E2E v2.9.28 COMPLETO ✓"
