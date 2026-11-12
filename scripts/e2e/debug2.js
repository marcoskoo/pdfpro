(async()=>{
  var tab=null;
  for(var i=0;i<docTabs.length;i++){ if(docTabs[i].kind==='excel'){tab=docTabs[i];break;} }
  var z=await JSZip.loadAsync(tab._xl.ab);
  var rxml=await z.file('xl/worksheets/_rels/sheet1.xml.rels').async('string');
  var rels=_xlsxTagAll(rxml,'Relationship');
  var dpath=null;
  rels.forEach(function(r){
    if(/Type="[^"]*\/drawing"/.test(r.attrs)){
      var tg=/Target="([^"]+)"/.exec(r.attrs);
      if(tg) dpath=_xlsxNormPath('xl/worksheets/_rels/sheet1.xml.rels',tg[1]);
    }
  });
  var st=await z.file('xl/styles.xml').async('string');
  var nf=_xlsxTagAll(st,'font').length;
  var nb=_xlsxTagAll(st,'border').length;
  var nfill=_xlsxTagAll(st,'fill').length;
  var dxml=null, nanch=0;
  if(dpath&&z.file(dpath)){
    dxml=await z.file(dpath).async('string');
    var are=/<xdr:(oneCellAnchor|twoCellAnchor|absoluteAnchor)[^>]*>([\s\S]*?)<\/xdr:\1>/g,m;
    while((m=are.exec(dxml))) nanch++;
  }
  return JSON.stringify({relsN:rels.length,dpath:dpath,nFontsTagged:nf,nBordersTagged:nb,nFillsTagged:nfill,nAnchors:nanch,dxmlStart:dxml?dxml.slice(0,180):null});
})()
