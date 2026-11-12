(async()=>{
  var out=[];
  for(var i=0;i<docTabs.length;i++){
    var t=docTabs[i];
    var o={kind:t.kind||null,name:t.fileName,dirty:!!t._dirty};
    if(t._xl){
      o.sheets=[];
      for(var j=0;j<t._xl.sheets.length;j++){
        var s=t._xl.sheets[j];
        o.sheets.push({name:s.name,rich:s.rich,nStyles:Object.keys(s.styles).length,
          imgs:(s.images||[]).length,setup:!!s.setup,marg:!!s.marg});
      }
    }
    out.push(o);
  }
  return JSON.stringify(out);
})()
