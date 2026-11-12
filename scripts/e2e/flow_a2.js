(async()=>{
  try{
    var tab=null;
    for(var i=0;i<docTabs.length;i++){ if(docTabs[i].kind==='excel'){tab=docTabs[i];break;} }
    if(!tab) return 'no tab';
    // cargar sello personal desde el servidor local
    var blob=await (await fetch('/seal_test.png')).blob();
    var dataUrl=await new Promise(function(res){var fr=new FileReader();fr.onload=function(){res(fr.result)};fr.readAsDataURL(blob);});
    sigLibrary=[{id:'sig1',name:'Sello Test',src:dataUrl}];
    activeSigId='sig1';
    var sig=getActiveSig();
    if(!sig||!sig.src) return 'no sig';
    try{updateSelloPreview();renderSigLib();}catch(e){}
    var sh=tab._xl.sheets[0];
    var geo=xlGeo(sh);
    var host=tab._xlView.host;
    var sc=host.closest('.xg-scroll');
    var tx=0; for(var c=1;c<=26;c++) tx+=geo.Wpx(c);
    var ty=0; for(var r=1;r<=60;r++) ty+=geo.Hpx(r);
    sc.scrollTop=Math.max(0, ty-260);
    await new Promise(r=>setTimeout(r,350));
    var tds=host.querySelectorAll('td.xg-td');
    var ox=0,oy=0;
    for(var i=0;i<tds.length;i++){ var rr=tds[i].getBoundingClientRect(); if(rr.width>1&&rr.height>1){ox=rr.left;oy=rr.top;break;} }
    var p1={x:Math.round(ox+tx), y:Math.round(oy+ty)};
    var vr=sc.getBoundingClientRect();
    if(p1.y>vr.bottom-30||p1.y<vr.top+30) return 'PT1-NO-VISIBLE '+JSON.stringify(p1);
    nativeSelloRecepcion();
    window._pt1=p1;
    return JSON.stringify({pt1:p1, sigName:sig.name, sigLen:Math.round(sig.src.length/1024)+'KB'});
  }catch(e){ return 'ERR:'+e.message; }
})()
