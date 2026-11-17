#!/bin/bash
# ═══ E2E v2.9.30 — REGLA MATRÍCULA «SIEMPRE» + ENVÍO POR GMAIL ═══
# 1) Matrícula: JAP7261 + REG/CCDII → campo «JAP7261 CCDII EV» y el
#    registro se nombra igual (JAP7261 CCDII EV.pdf); regresiones:
#    LPE2273 CCBJE · CMP468 HP1520 (casillas) · OB1630 (sin REG/) ·
#    formación FAP123 FAP124 · FAP001 Jefe de Estado · ayudas ocultas.
# 2) Gmail: GIS cargado, 4 botones, modal pre-llenado con el nombre del
#    registro, validación, MIME unit-test, envío simulado con fetch
#    interceptado, buildAnnotatedPdfBlob (refactor de Drive).
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
  echo "TIMEOUT: $out" | head -3
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
POLLVAR(){
  local out i
  for i in $(seq 1 "${3:-20}"); do
    out=$(agent-browser eval "$1" 2>&1 | head -1 | tr -d '"')
    [ "$out" = "$2" ] && { echo "  ✓ (tras ${i} sondeos)"; return 0; }
    sleep 1
  done
  echo "  ✗ TIMEOUT: '$out' ≠ '$2'"; return 1
}
CAMPO(){
  local out i
  for i in $(seq 1 25); do
    out=$(agent-browser eval "document.getElementById('selloMatricula').value" 2>&1 | head -1 | tr -d '"')
    [ "$out" = "$1" ] && { echo "  ✓ campo=«$out» (tras ${i} sondeos)"; return 0; }
    sleep 1
  done
  echo "  ✗ TIMEOUT: campo='«$out»' (esperaba «$1»)"; return 1
}
CAMPO_CONTIENE(){
  local out i
  for i in $(seq 1 25); do
    out=$(agent-browser eval "document.getElementById('selloMatricula').value" 2>&1 | head -1 | tr -d '"')
    if [[ "$out" == *"$1"* ]]; then echo "  ✓ campo=«$out» (contiene «$1», tras ${i} sondeos)"; return 0; fi
    sleep 1
  done
  echo "  ✗ TIMEOUT: campo='«$out»' (esperaba contener «$1»)"; return 1
}
CARGAR(){
  agent-browser eval "(async function(){ var r=await fetch('/$1'); var ab=await r.arrayBuffer(); var f=new File([ab],'$1',{type:'application/pdf'}); var dt=new DataTransfer(); dt.items.add(f); var inp=document.getElementById('fInput'); inp.files=dt.files; inp.dispatchEvent(new Event('change',{bubbles:true})); return 'cargando $1'; })()" >/dev/null 2>&1
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
EV "typeof gmailSendDialog==='function'&&typeof gmailBuildMime==='function'&&typeof buildAnnotatedPdfBlob==='function' ? 'módulos Gmail + registro cargados ✓' : 'FALLO: sin módulos'"
EV "(function(){ var el=document.getElementById('selloTxInitials'); if(!el.value){el.value='EV';} return 'iniciales del operador: '+el.value; })()"

step "2. Versión v2.9.30"
EV "(document.documentElement.innerHTML.indexOf('v2.9.30')>=0)?'v2.9.30 ✓':'FALLO: sin v2.9.30'"

step "3. ★ NUEVO: JAP7261 (casillero 7, sin matrícula) + REG/CCDII (18) → «JAP7261 CCDII EV»"
CARGAR tmp_e2e_fpl_reg18.pdf
CAMPO "JAP7261 CCDII EV" || exit 1
EV "fplNombreRegistro('FPL.pdf')==='JAP7261 CCDII EV.pdf' ? '✓ registro: '+fplNombreRegistro('FPL.pdf') : '✗ '+fplNombreRegistro('FPL.pdf')"

step "4. Google Identity Services cargado + 4 botones ✉️ Gmail"
EV "(window.google&&google.accounts&&google.accounts.oauth2)?'GIS cargado ✓':'FALLO: GIS no cargado'"
EV "(function(){ var t=document.querySelector('.etb-btn[onclick=\"gmailSendDialog()\"]'); var r=document.querySelector('.rb[onclick=\"gmailSendDialog()\"]'); var s=document.querySelector('.drive-save-btn[onclick=\"gmailSendDialog()\"]'); var m=document.querySelector('.mob-action-btn[onclick*=\"gmailSendDialog\"]'); var st=document.getElementById('gmailStatusLbl'); return 'barra:'+(!!t)+' · lateral:'+(!!r)+' · sellos:'+(!!s)+' · móvil:'+(!!m)+' · estado:\"'+(st?st.textContent:'?')+'\"' + (t&&r&&s&&m?' ✓':' ✗ FALTAN'); })()"

step "5. Modal Gmail: asunto pre-llenado con el NUEVO nombre del registro"
EV "gmailSendDialog(); 'modal abierto'"
EV "(function(){ var m=document.getElementById('gmailModal'); var show=m.classList.contains('show'); var subj=document.getElementById('gmailSubject').value; var body=document.getElementById('gmailBody').value; return (show&&subj==='FPL JAP7261 CCDII EV'&&body.indexOf('JAP7261 CCDII EV.pdf')>=0)?'✓ asunto «'+subj+'» · mensaje con el registro':'✗ show='+show+' asunto=\"'+subj+'\"'; })()"

step "6. Validación: «Para» vacío → avisa y NO llama a la API"
EV "(function(){ window.__origFetch=window.fetch; window.__gmailCalls=[]; window.fetch=function(u,o){window.__gmailCalls.push({url:String(u),opts:o});return Promise.resolve({json:function(){return Promise.resolve({id:'mock123'});}});}; document.getElementById('gmailTo').value=''; gmailEnviar(); var n=window.__gmailCalls.length; return n===0?'✓ sin destinatario no se llama a la API (llamadas='+n+')':'✗ se llamó a la API ('+n+')'; })()"

step "7. UNIT gmailBuildMime (MIME RFC 2822 decodificado)"
EV "(function(){ var pdfB=btoa('PDFBYTES123'); var raw=gmailBuildMime('a@b.com','FPL test','Café ñ áéíóú ✓','JAP7261 CCDII EV.pdf',pdfB); var std=raw.replace(/-/g,'+').replace(/_/g,'/'); while(std.length%4)std+='='; var mime=decodeURIComponent(escape(atob(std))); var ok1=mime.indexOf('To: a@b.com')>=0; var ok2=mime.indexOf('Subject: FPL test')>=0; var ok3=mime.indexOf('Content-Type: multipart/mixed')>=0; var ok4=mime.indexOf(gmailB64Utf8('Café ñ áéíóú ✓'))>=0; var ok5=mime.indexOf(pdfB)>=0; var ok6=mime.indexOf('filename=\"JAP7261 CCDII EV.pdf\"')>=0; var b=mime.match(/boundary=\"([^\"]+)\"/); var ok7=!!b&&mime.indexOf('--'+b[1]+'--')>=0; var rfc=gmailRfc2047('Asúnto ñ'); var ok8=rfc.indexOf('=?UTF-8?B?')===0; return (ok1&&ok2&&ok3&&ok4&&ok5&&ok6&&ok7&&ok8)?'✓ MIME completo ('+mime.length+' chars)':'✗ '+[ok1,ok2,ok3,ok4,ok5,ok6,ok7,ok8].join(','); })()"

step "8. ENVÍO SIMULADO: token de prueba + fetch interceptado"
EV "(function(){ gmailToken='e2e_tok'; gmailTokenExpiry=Date.now()+3600000; document.getElementById('gmailTo').value='destino@test.com'; document.getElementById('gmailSubject').value='FPR JAP7261 CCDII EV'; window.__sendDone=null; gmailEnviar().then(function(){window.__sendDone='done';}).catch(function(){window.__sendDone='err';}); return 'envío lanzado'; })()"
POLLVAR "window.__sendDone||'busy'" "done" 25 || { EV "window.__sendDone"; exit 1; }
EV "(function(){ var c=window.__gmailCalls[0]; if(!c)return '✗ sin llamadas'; var p=JSON.parse(c.opts.body); var btn=document.getElementById('gmailSendBtn'); var modal=document.getElementById('gmailModal'); var okUrl=c.url==='https://gmail.googleapis.com/gmail/v1/users/me/messages/send'; var okTok=c.opts.headers['Authorization']==='Bearer e2e_tok'; var okRaw=p.raw&&p.raw.length>500; var okBtn=!btn.disabled; var cerrado=!modal.classList.contains('show'); window.fetch=window.__origFetch; gmailToken=null;gmailTokenExpiry=0; return (okUrl&&okTok&&okRaw&&okBtn&&cerrado)?'✅ send correcto: API Gmail · Bearer · {raw:'+p.raw.length+' chars} · modal cerrado':'✗ '+[okUrl,okTok,okRaw,okBtn,cerrado].join(','); })()"

step "9. Refactor Drive: buildAnnotatedPdfBlob genera el PDF sellado"
EV "(function(){ window.__blobRes=null; window.__blobDetail=''; buildAnnotatedPdfBlob().then(function(b){window.__blobDetail=b.size+':'+b.type;window.__blobRes='done';}).catch(function(e){window.__blobDetail='err:'+e;window.__blobRes='err';}); return 'blob lanzado'; })()"
POLLVAR "window.__blobRes||'busy'" "done" 25 || { EV "window.__blobDetail"; exit 1; }
EV "(function(){ var p=String(window.__blobDetail).split(':'); var size=parseInt(p[0]); return (!isNaN(size)&&size>1000&&p[1]==='application/pdf')?'✓ blob PDF anotado: '+size+' bytes — Drive y Gmail comparten el generador':'✗ '+window.__blobDetail; })()"

step "10. gmailIsDesktop() false en la web"
EV "gmailIsDesktop()===false?'✓ navegador web (no escritorio)':'✗'"

step "11. Regresión: designador LPE2273 CCBJE EV"
EV "(async function(){ var tabs=docTabs.slice(); tabs.forEach(function(t){ if(t.id!==activeTabId) docTabClose(t.id); }); return 'limpio'; })()" >/dev/null 2>&1
sleep 2
CARGAR tmp_e2e_fpl_designador.pdf
CAMPO "LPE2273 CCBJE EV" || exit 1

step "12. Regresión: OB1630 del casillero 7 sin REG/"
EV "(async function(){ var tabs=docTabs.slice(); tabs.forEach(function(t){ if(t.id!==activeTabId) docTabClose(t.id); }); return 'limpio'; })()" >/dev/null 2>&1
sleep 2
CARGAR tmp_e2e_fpl_sphi_spst.pdf
CAMPO "OB1630" || exit 1
EV "fplNombreRegistro('FPL.pdf')==='OB1630 EV.pdf' ? '✓ campo «OB1630» (las iniciales van al nombre del archivo): OB1630 EV.pdf' : '✗ '+fplNombreRegistro('FPL.pdf')"

step "13. Regresión: CMP468 + REG/HP1520 (casillas de aerolínea)"
EV "(async function(){ var tabs=docTabs.slice(); tabs.forEach(function(t){ if(t.id!==activeTabId) docTabClose(t.id); }); return 'limpio'; })()" >/dev/null 2>&1
sleep 2
CARGAR tmp_e2e_fpl_form_casillas.pdf
CAMPO "CMP468 HP1520 EV" || exit 1

step "14. Regresión: formación (todas las matrículas, sin ID) + Jefe de Estado"
EV "(async function(){ var tabs=docTabs.slice(); tabs.forEach(function(t){ if(t.id!==activeTabId) docTabClose(t.id); }); return 'limpio'; })()" >/dev/null 2>&1
sleep 2
CARGAR tmp_e2e_fpl_formacion.pdf
CAMPO_CONTIENE "FAP123 FAP124"
EV "(async function(){ var tabs=docTabs.slice(); tabs.forEach(function(t){ if(t.id!==activeTabId) docTabClose(t.id); }); return 'limpio'; })()" >/dev/null 2>&1
sleep 2
CARGAR tmp_e2e_fpl_fap001.pdf
CAMPO_CONTIENE "FAP001 - FAP329"

step "15. Regresión: las 3 ayudas de la ficha siguen ocultas (v2.9.28-29)"
EV "(function(){ var ids=['selloRecepcionAyuda','selloInicialesAyuda','selloMatriculaAyuda']; var ok=ids.every(function(id){var d=document.getElementById(id);return d&&getComputedStyle(d).display==='none';}); return ok?'✓ las 3 ayudas de la ficha siguen ocultas':'✗ alguna ayuda visible'; })()"

step "16. Captura de la ficha con el campo JAP7261 CCDII EV"
sleep 1
agent-browser screenshot /tmp/e2e_2930_registro.png >/dev/null 2>&1 && echo "  captura: /tmp/e2e_2930_registro.png"

echo ""
echo "E2E v2.9.30 COMPLETO ✓ (regla SIEMPRE + Gmail + regresiones)"
