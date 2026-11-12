(async()=>{
  try{
    var tab=docTabs[0];
    var sh=tab._xl.sheets[0];
    var geo=xlGeo(sh);
    var host=tab._xlView.host;
    var sc=host.closest('.xg-scroll');
    // fila 20 col 40 — zona superior derecha
    var tx=0; for(var c=1;c<=40;c++) tx+=geo.Wpx(c);
    var ty=0; for(var r=1;r<=20;r++) ty+=geo.Hpx(r);
    sc.scrollTop=Math.max(0, ty-260);
    await new Promise(r=>setTimeout(r,350));
    var tds=host.querySelectorAll('td.xg-td');
    var ox=0,oy=0;
    for(var i=0;i<tds.length;i++){ var rr=tds[i].getBoundingClientRect(); if(rr.width>1&&rr.height>1){ox=rr.left;oy=rr.top;break;} }
    var vp={x:Math.round(ox+tx), y:Math.round(oy+ty)};
    var vr=sc.getBoundingClientRect();
    if(vp.y>vr.bottom-30||vp.y<vr.top+30) return 'PT-NO-VISIBLE '+JSON.stringify(vp);
    window._pt2=vp;
    // ver los presets del modal de sellos (como los ve el usuario)
    nativeSelloPersonal();
    await new Promise(r=>setTimeout(r,200));
    var grid=document.getElementById('stampGrid');
    var presets=grid?Array.from(grid.children).map(function(b){return b.textContent.trim();}):[];
    return JSON.stringify({pt:vp, presets:presets});
  }catch(e){ return 'ERR:'+e.message; }
})()
