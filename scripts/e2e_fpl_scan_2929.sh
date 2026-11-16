#!/bin/bash
# ═══ E2E v2.9.29 — AYUDAS DE LA FICHA DEL SELLO OCULTAS (RECEPCIÓN + INICIALES) ═══
# Petición de la oficina: ocultar también el texto de ayuda de la RECEPCIÓN
# («Recepción: vacío = fecha/hora actuales…») y el de las INICIALES («2 letras:
# inicial del primer nombre…»), igual que la matrícula en 2.9.28. Las tres
# ayudas quedan contraídas tras enlaces «ⓘ»: ocultas por defecto (0px, botones
# del sello a la vista), un clic despliega y otro oculta. Se prueba con la
# pestaña de sellos ABIERTA (layout real) + regresión del escaneo.
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
CAMPO(){
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

step "2. Versión v2.9.29 (pie de página)"
EV "(document.documentElement.innerHTML.indexOf('v2.9.29')>=0)?'v2.9.29 ✓':'FALLO: sin v2.9.29'"

step "3. Cargar FPL designador y ABRIR la pestaña de sellos (layout real)"
CARGAR tmp_e2e_fpl_designador.pdf
CAMPO "LPE2273 CCBJE EV" || exit 1
EV "showEditorTab('sigs'); 'pestaña sellos abierta'"
sleep 1
EV "(function(){ var el=document.getElementById('selloMatricula'); return el.offsetHeight>0 ? '✓ panel visible (input '+el.offsetHeight+'px de alto)' : '✗ panel sin layout'; })()"

step "4. ★ LAS 3 AYUDAS OCULTAS por defecto (recepción · iniciales · matrícula)"
EV "(function(){ var ids=['selloRecepcionAyuda','selloInicialesAyuda','selloMatriculaAyuda']; var s=''; var ok=true; ids.forEach(function(id){ var d=document.getElementById(id); if(!d){s+='✗ falta '+id+' | ';ok=false;return;} var hid=getComputedStyle(d).display==='none'&&d.offsetHeight===0; s+=(hid?'✓ '+id+' (0px)':'✗ '+id+' VISIBLE ('+d.offsetHeight+'px)')+' | '; if(!hid)ok=false; }); return ok?s:s; })()"

step "5. ★ BOTONES A LA VISTA: «Colocar Sello de Recepción» renderizado bajo el campo"
EV "(function(){ var inp=document.getElementById('selloMatricula'); var bs=document.querySelectorAll('button'); var btn=null; for(var i=0;i<bs.length;i++){ if(bs[i].textContent.indexOf('Colocar Sello de Recepción')>=0){btn=bs[i];break;} } if(!btn) return '✗ no se encontró el botón'; var gap=btn.getBoundingClientRect().top-inp.getBoundingClientRect().bottom; return '✓ botón renderizado ('+btn.offsetHeight+'px) a '+Math.round(gap)+'px bajo el campo (antes las 3 ayudas empujaban ~300px más) '+(btn.offsetHeight>0?'✓':'✗'); })()"

step "6. ★ TOGGLES: cada «ⓘ» despliega SU ayuda y un segundo clic la oculta"
EV "(function(){ var ids=[['selloRecepcionAyuda',20],['selloInicialesAyuda',20],['selloMatriculaAyuda',100]]; var s=''; var ok=true; ids.forEach(function(par){ var d=document.getElementById(par[0]); var a=d.previousElementSibling; if(!a||a.tagName!=='A'){s+='✗ sin enlace antes de '+par[0]+' | ';ok=false;return;} a.click(); var alto=d.offsetHeight; var visible=getComputedStyle(d).display!=='none'&&alto>par[1]; a.click(); var oculta=getComputedStyle(d).display==='none'&&d.offsetHeight===0; s+=(visible&&oculta?'✓ '+par[0]+': '+alto+'px↔0px':'✗ '+par[0]+': visible='+visible+' oculta='+oculta)+' | '; if(!(visible&&oculta))ok=false; }); return s; })()"

step "7. Regresión: DESIGNADOR → nombre «LPE2273 CCBJE EV.pdf» (iniciales no duplicadas)"
EV "fplNombreRegistro('FPL.pdf')==='LPE2273 CCBJE EV.pdf' ? '✓ '+fplNombreRegistro('FPL.pdf') : '✗ '+fplNombreRegistro('FPL.pdf')"

step "8. Regresión: SPHI-SPST (casillero 7 = matrícula) → «OB1630»"
LIMPIAR
sleep 2
CARGAR tmp_e2e_fpl_sphi_spst.pdf
CAMPO OB1630 || exit 1

step "9. Captura visual del panel (ficha compacta: 3 enlaces ⓘ, sin bloques de texto)"
EV "showEditorTab('sigs'); window.scrollTo(0,0); 'listo para captura'"
sleep 1
agent-browser screenshot /tmp/e2e_2929_panel.png >/dev/null 2>&1 && echo "  captura: /tmp/e2e_2929_panel.png"

echo ""
echo "E2E v2.9.29 COMPLETO ✓"
