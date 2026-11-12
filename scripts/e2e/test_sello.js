(async()=>{
  try{
    var tab=null;
    for(var i=0;i<docTabs.length;i++){ if(docTabs[i].kind==='excel'){tab=docTabs[i];break;} }
    if(!tab) return 'no tab';
    window._dlCap=[];
    if(!window._dlBlobOrig){ window._dlBlobOrig=dlBlob; }
    dlBlob=function(blob,name){ window._dlCap.push({name:name,blob:blob}); };
    if(!tab.nvStamps) tab.nvStamps=[];
    var s=nvBuildSelloAnn();
    s.sec=0; s.x=430; s.y=140; s.w=220;
    tab.nvStamps.push(s);
    nvRenderStamps(tab);
    nvMarkDirty(tab);
    var dirty1=!!tab._dirty;
    var selloDom=document.querySelectorAll('.nv-sello').length;
    await nativeSaveOriginal();
    await new Promise(r=>setTimeout(r,1500));
    var res={dirty1:dirty1,selloDom:selloDom,downloads:window._dlCap.length,
      capName:window._dlCap.length?window._dlCap[0].name:null,
      capSize:window._dlCap.length?window._dlCap[0].blob.size:0,
      stillDirty:!!tab._dirty};
    return JSON.stringify(res);
  }catch(e){ return 'ERR:'+e.message+' | '+(e.stack||'').split('\n')[1]; }
})()
