(async()=>{
  try{
    var b64=window.__x64||'';
    if(!b64||b64.length<1000) return 'NO-XB64';
    var bin=atob(b64), n=bin.length, u8=new Uint8Array(n);
    for(var i=0;i<n;i++) u8[i]=bin.charCodeAt(i);
    var f=new File([u8],'ATC CM468  11NOV.xlsx',{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    await openFilesList([f]);
    await new Promise(r=>setTimeout(r,2500));
    var tab=null; for(var j=0;j<docTabs.length;j++){ if(docTabs[j].kind==='excel'){tab=docTabs[j];break;} }
    if(!tab) return 'NO-X-TAB tabs='+docTabs.length;
    var sh=tab._xl.sheets[0];
    var geo=xlGeo(sh);
    var host=tab._xlView.host;
    var tbl=host.querySelector('table.xg-table');
    if(!tbl) return 'NO-TABLE';
    var tds=tbl.querySelectorAll('td.xg-td');
    var ox=0,oy=0,found=false;
    for(var k=0;k<tds.length;k++){ var rr=tds[k].getBoundingClientRect(); if(rr.width>1&&rr.height>1){ox=rr.left;oy=rr.top;found=true;break;} }
    if(!found) return 'NO-ORIGIN';
    var sig=getActiveSig();
    // —— sello de recepción: fila 60, col 26 (zona FIR) ——
    var tx=0; for(var c=1;c<=26;c++) tx+=geo.Wpx(c);
    var ty=0; for(var r=1;r<=60;r++) ty+=geo.Hpx(r);
    nativeSelloRecepcion();
    host.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true,button:0,clientX:Math.round(ox+tx),clientY:Math.round(oy+ty)}));
    await new Promise(r=>setTimeout(r,300));
    var n1=(tab.nvStamps||[]).length;
    if(!n1) return 'NO-SELLO1';
    // —— sello personal APROBADO: fila 20, col 40 ——
    nvArmStamp({label:'APROBADO',emoji:'',color:'#c0392b'});
    var tx2=0; for(var c2=1;c2<=40;c2++) tx2+=geo.Wpx(c2);
    var ty2=0; for(var r2=1;r2<=20;r2++) ty2+=geo.Hpx(r2);
    host.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true,button:0,clientX:Math.round(ox+tx2),clientY:Math.round(oy+ty2)}));
    await new Promise(r=>setTimeout(r,300));
    var st=tab.nvStamps||[];
    // —— guardar .xlsx ——
    window._dlCap=[];
    if(!window._dlBlobOrig) window._dlBlobOrig=dlBlob;
    dlBlob=function(blob,name){ window._dlCap.push({name:name,blob:blob}); };
    await nativeSaveOriginal();
    await new Promise(r=>setTimeout(r,2500));
    if(!window._dlCap.length) return 'NO-X-DOWNLOAD';
    var b=window._dlCap[0].blob;
    var buf=await b.arrayBuffer();
    var by=new Uint8Array(buf), bin2='';
    for(var m=0;m<by.length;m+=32768) bin2+=String.fromCharCode.apply(null,by.subarray(m,m+32768));
    window._xlsB64=btoa(bin2);
    dlBlob=window._dlBlobOrig;
    return JSON.stringify({n1:n1,n2:st.length,sig:!!sig,xls:{size:b.size,b64len:window._xlsB64.length,dirty:!!tab._dirty}});
  }catch(e){ return 'ERR:'+e.message; }
})()
