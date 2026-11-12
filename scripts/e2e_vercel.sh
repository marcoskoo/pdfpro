#!/bin/bash
# E2E en producción (Vercel): subir FPL real al editor por la ruta real de archivos
set -e
B64=$(base64 -w0 "/home/z/my-project/upload/ATC CM468  11NOV.xlsx")
agent-browser eval "(async function(){
  var w=document.querySelector('iframe').contentWindow,d=w.document;
  var b64='$B64';
  var bin=atob(b64), arr=new Uint8Array(bin.length);
  for(var i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);
  var f=new w.File([arr],'ATC CM468 11NOV.xlsx',{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  var dt=new w.DataTransfer(); dt.items.add(f);
  var inp=d.getElementById('fInput'); inp.files=dt.files;
  inp.dispatchEvent(new w.Event('change',{bubbles:true}));
  return 'FPL enviado: '+f.size+' bytes';
})()" 2>&1 | head -2
sleep 5
agent-browser eval "var d=document.querySelector('iframe').contentDocument; var t=d.body.innerText.match(/PLAN DE VUELO|Flight Plan|CM468/g); t?JSON.stringify([...new Set(t)]):'SIN TEXTO FPL'" 2>&1 | head -2
