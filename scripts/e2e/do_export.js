(async()=>{
  try{
    var tab=docTabs[0];
    window._dlCap=[];
    if(!window._dlBlobOrig){ window._dlBlobOrig=dlBlob; }
    dlBlob=function(blob,name){ window._dlCap.push({name:name,blob:blob}); };
    // ── EXPORTAR PDF ──
    await nativeExportPdf();
    await new Promise(r=>setTimeout(r,2500));
    var pdfOk=window._dlCap.length>=1;
    var pdfB=null;
    if(pdfOk){
      var b=window._dlCap[0].blob;
      var buf=await b.arrayBuffer();
      var by=new Uint8Array(buf), bin='';
      for(var j=0;j<by.length;j+=32768) bin+=String.fromCharCode.apply(null,by.subarray(j,j+32768));
      window._pdfB64=btoa(bin);
    }
    // ── GUARDAR XLSX ──
    await nativeSaveOriginal();
    await new Promise(r=>setTimeout(r,2500));
    var xlsOk=window._dlCap.length>=2;
    var xlsB=null;
    if(xlsOk){
      var b2=window._dlCap[1].blob;
      var buf2=await b2.arrayBuffer();
      var by2=new Uint8Array(buf2), bin2='';
      for(var k=0;k<by2.length;k+=32768) bin2+=String.fromCharCode.apply(null,by2.subarray(k,k+32768));
      window._xlsB64=btoa(bin2);
    }
    return JSON.stringify({pdf:{name:pdfOk?window._dlCap[0].name:null,size:pdfOk?window._dlCap[0].blob.size:null,b64:window._pdfB64?window._pdfB64.length:0},
                           xls:{name:xlsOk?window._dlCap[1].name:null,size:xlsOk?window._dlCap[1].blob.size:null,b64:window._xlsB64?window._xlsB64.length:0},
                           stillDirty:!!tab._dirty});
  }catch(e){ return 'ERR:'+e.message; }
})()
