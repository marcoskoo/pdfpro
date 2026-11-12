(async()=>{
  try{
    var tab=null;
    for(var i=0;i<docTabs.length;i++){ if(docTabs[i].kind==='excel'){tab=docTabs[i];break;} }
    if(!tab) return 'no tab';
    window._dlCap=[];
    dlBlob=function(blob,name){ window._dlCap.push({name:name,blob:blob}); };
    // editar la celda J31 (un dígito de la velocidad) como haría el usuario
    xlSelect(tab,31,10);
    xlCommit(tab,31,10,'5');
    // editar D2 con texto largo para probar el recorte de overflow
    xlSelect(tab,2,4);
    xlCommit(tab,2,4,'PLAN DE VUELO PRUEBA OVERFLOW LARGUISIMO');
    var nEdits=Object.keys(tab._xl.edits).length;
    var dirty=!!tab._dirty;
    await nativeSaveOriginal();
    await new Promise(r=>setTimeout(r,1500));
    var b=window._dlCap[0].blob;
    var buf=await b.arrayBuffer();
    var by=new Uint8Array(buf), bin='';
    for(var j=0;j<by.length;j+=32768) bin+=String.fromCharCode.apply(null,by.subarray(j,j+32768));
    window._outB64=btoa(bin);
    // comprobar recorte en la vista: el span de D2 debe tener maxWidth/overflow hidden
    var td=tab._xlView.host.querySelector('td.xg-td[data-r="2"][data-c="4"]');
    var sp=td?td.querySelector('.xg-tx'):null;
    var clip=sp?JSON.stringify({maxWidth:sp.style.maxWidth,overflow:sp.style.overflow}):'sin span';
    return JSON.stringify({nEdits:nEdits,dirty:dirty,descargas:window._dlCap.length,tam:b.size,clipD2:clip,b64:window._outB64.length});
  }catch(e){ return 'ERR:'+e.message; }
})()
