(async()=>{
  try{
    var tab=null;
    for(var i=0;i<docTabs.length;i++){ if(docTabs[i].kind==='excel'){tab=docTabs[i];break;} }
    if(!tab) return 'no tab';
    var sh=tab._xl.sheets[0];
    var geo=xlGeo(sh);
    var host=tab._xlView.host;
    var sc=host.closest('.xg-scroll');
    // fila 60 col 26 — zona FIR (típica para el sello de recepción)
    var tx=0; for(var c=1;c<=26;c++) tx+=geo.Wpx(c);
    var ty=0; for(var r=1;r<=60;r++) ty+=geo.Hpx(r);
    // scroll para que el punto quede visible
    var hostTop=host.getBoundingClientRect().top;
    sc.scrollTop=Math.max(0, ty-260);
    await new Promise(r=>setTimeout(r,350));
    // origen: primer td visible tras el scroll
    var tds=host.querySelectorAll('td.xg-td');
    var ox=0,oy=0;
    for(var i=0;i<tds.length;i++){ var rr=tds[i].getBoundingClientRect(); if(rr.width>1&&rr.height>1){ox=rr.left;oy=rr.top;break;} }
    var vp={x:Math.round(ox+tx), y:Math.round(oy+ty)};
    var vr=sc.getBoundingClientRect();
    if(vp.y>vr.bottom-30||vp.y<vr.top+30) return 'PT-NO-VISIBLE '+JSON.stringify({vp:vp,vr:{t:vr.top,b:vr.bottom}});
    window._pt1=vp;
    // armar sello de recepción (como el usuario: botón de la cinta)
    nativeSelloRecepcion();
    return JSON.stringify({pt:vp, armed:document.body.classList.contains('nv-arm'), sig:(getActiveSig()?'con firma':'sin firma')});
  }catch(e){ return 'ERR:'+e.message; }
})()
