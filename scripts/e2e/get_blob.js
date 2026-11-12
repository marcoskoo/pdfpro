(async()=>{
  try{
    var b=window._dlCap[0].blob;
    var buf=await b.arrayBuffer();
    var bytes=new Uint8Array(buf);
    var bin='';
    var CH=32768;
    for(var i=0;i<bytes.length;i+=CH) bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+CH));
    window._outB64=btoa(bin);
    return 'B64 listo: '+window._outB64.length;
  }catch(e){ return 'ERR:'+e.message; }
})()
