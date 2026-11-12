(async()=>{
  try{
    const bin=atob(window.__b64);
    const bytes=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
    const f=new File([bytes],"ATC CM468.xlsx",{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
    await openFilesList([f]);
    await new Promise(r=>setTimeout(r,2500));
    setSession({id:1,login:"test",email:"t@t.com",name:"Tester",cargo:"AIS",sede:"SPHI",plan:1,status:"active",isAdmin:false});
    currentUser=getSession(); showLayer("editorLayer");
    await initEditor();
    await new Promise(r=>setTimeout(r,800));
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
    await nativeExportPdf();
    await new Promise(r=>setTimeout(r,2500));
    if(!window._dlCap.length) return 'sin descarga';
    var b=window._dlCap[0].blob;
    var buf=await b.arrayBuffer();
    var by=new Uint8Array(buf), bin2='';
    for(var j=0;j<by.length;j+=32768) bin2+=String.fromCharCode.apply(null,by.subarray(j,j+32768));
    window._outB64=btoa(bin2);
    return 'PDF listo: '+window._dlCap[0].name+' '+b.size+' bytes (b64 '+window._outB64.length+')';
  }catch(e){ return 'ERR:'+e.message; }
})()
