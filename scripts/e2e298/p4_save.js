(async()=>{
  try{
    var tab=null; for(var i=0;i<docTabs.length;i++){ if(docTabs[i].kind==='word'){tab=docTabs[i];break;} }
    if(!tab) return 'NO-TAB';
    window._dlCap=[];
    if(!window._dlBlobOrig) window._dlBlobOrig=dlBlob;
    dlBlob=function(blob,name){ window._dlCap.push({name:name,blob:blob}); };
    await nativeSaveOriginal();
    await new Promise(r=>setTimeout(r,1800));
    if(!window._dlCap.length) return 'NO-DOWNLOAD';
    var b=window._dlCap[0].blob;
    var buf=await b.arrayBuffer();
    var by=new Uint8Array(buf), bin='';
    for(var j=0;j<by.length;j+=32768) bin+=String.fromCharCode.apply(null,by.subarray(j,j+32768));
    window._docxB64=btoa(bin);
    window._dlCap=[];
    // —— también exportar PDF de esta pestaña (regresión) ——
    await nativeExportPdf();
    await new Promise(r=>setTimeout(r,2500));
    var pdfOk=false, pdfLen=0;
    if(window._dlCap.length){
      var pb=window._dlCap[0].blob;
      var pbuf=await pb.arrayBuffer();
      var pby=new Uint8Array(pbuf);
      pdfOk=(pby[0]===0x25&&pby[1]===0x50&&pby[2]===0x44&&pby[3]===0x46);
      pdfLen=pb.size;
      var pbin='';
      for(var k=0;k<pby.length;k+=32768) pbin+=String.fromCharCode.apply(null,pby.subarray(k,k+32768));
      window._pdfB64=btoa(pbin);
    }
    dlBlob=window._dlBlobOrig;
    return JSON.stringify({docx:{name:tab.fileName+'.docx',size:b.size,b64len:window._docxB64.length,dirty:!!tab._dirty},pdf:{ok:pdfOk,size:pdfLen,b64len:window._pdfB64?window._pdfB64.length:0}});
  }catch(e){ return 'ERR:'+e.message; }
})()
