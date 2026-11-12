(async()=>{
  try{
    await exportPDF();
    await new Promise(r=>setTimeout(r,3000));
    if(!window._dlCap.length) return 'NO DL';
    var b=window._dlCap[0].blob;
    var buf=await b.arrayBuffer();
    var by=new Uint8Array(buf), bin='';
    for(var j=0;j<by.length;j+=32768) bin+=String.fromCharCode.apply(null,by.subarray(j,j+32768));
    window._pdftabB64=btoa(bin);
    return JSON.stringify({name:window._dlCap[0].name,size:b.size});
  }catch(e){ return 'ERR:'+e.message; }
})()
