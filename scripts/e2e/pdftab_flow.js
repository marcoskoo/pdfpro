(async()=>{
  try{
    // 1) Abrir como PDF (convierte la pestaña Excel con sus sellos)
    await nativeOpenAsPdf();
    await new Promise(r=>setTimeout(r,3000));
    var hasPdf=!!pdfDoc;
    var nTabs=docTabs.length;
    // tras abrir, la pestaña activa es PDF
    var kinds=docTabs.map(function(t){return t.kind});
    var active=activeTabId;
    // 2) colocar sello de recepción en la pestaña PDF
    placeSelloRecepcion();
    var armed=!!document.getElementById('armHint')||true;
    return JSON.stringify({hasPdf:hasPdf,kinds:kinds,active:active,anns:(annotations[0]||[]).length});
  }catch(e){ return 'ERR:'+e.message; }
})()
