(async()=>{
  try{
    var tab=null;
    for(var i=0;i<docTabs.length;i++){ if(docTabs[i].kind==='excel'){tab=docTabs[i];break;} }
    if(!tab) return 'no tab';
    // capturar descargas
    window._dlCap=[];
    if(!window._dlBlobOrig){ window._dlBlobOrig=dlBlob; }
    dlBlob=function(blob,name){ window._dlCap.push({name:name,blob:blob}); };

    // ── 1. SELLO DE RECEPCIÓN (flujo real: armar + clic) ──
    var sh=tab._xl.sheets[0];
    var geo=xlGeo(sh);
    // posición objetivo: fila 60, col 26 (zona FIR/controladores, abajo)
    var tx=0; for(var c=1;c<=26;c++) tx+=geo.Wpx(c);
    var ty=0; for(var r=1;r<=60;r++) ty+=geo.Hpx(r);
    // origen real: primer td visible (lo usa el handler)
    var host=tab._xlView.host;
    var tds=host.querySelectorAll('td.xg-td');
    var ox=0,oy=0;
    for(var i=0;i<tds.length;i++){ var rr=tds[i].getBoundingClientRect(); if(rr.width>1&&rr.height>1){ox=rr.left;oy=rr.top;break;} }
    window._clickPt={x:ox+tx, y:oy+ty};
    var sigState={activeSig:(getActiveSig()? 'con firma':'SIN firma personal')};
    return JSON.stringify({clickPt:window._clickPt, sig:sigState, geoRows:geo.R1, geoCols:geo.C1});
  }catch(e){ return 'ERR:'+e.message; }
})()
