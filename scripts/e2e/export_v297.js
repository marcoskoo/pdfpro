(async()=>{
  try{
    var tab=docTabs[0];
    window._dlCap=[];
    if(!window._dlBlobOrig){ window._dlBlobOrig=dlBlob; }
    dlBlob=function(blob,name){ window._dlCap.push({name:name,blob:blob}); };
    await nativeExportPdf();
    await new Promise(r=>setTimeout(r,2500));
    var b=window._dlCap[0].blob;
    var buf=await b.arrayBuffer();
    var by=new Uint8Array(buf), bin='';
    for(var j=0;j<by.length;j+=32768) bin+=String.fromCharCode.apply(null,by.subarray(j,j+32768));
    window._pdfB64=btoa(bin);
    await nativeSaveOriginal();
    await new Promise(r=>setTimeout(r,2500));
    var b2=window._dlCap[1].blob;
    var buf2=await b2.arrayBuffer();
    var by2=new Uint8Array(buf2), bin2='';
    for(var k=0;k<by2.length;k+=32768) bin2+=String.fromCharCode.apply(null,by2.subarray(k,k+32768));
    window._xlsB64=btoa(bin2);
    return JSON.stringify({pdf:window._dlCap[0].blob.size, xls:window._dlCap[1].blob.size});
  }catch(e){ return 'ERR:'+e.message; }
})()
