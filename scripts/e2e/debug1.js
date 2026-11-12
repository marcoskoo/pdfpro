(async()=>{
  var tab=null;
  for(var i=0;i<docTabs.length;i++){ if(docTabs[i].kind==='excel'){tab=docTabs[i];break;} }
  if(!tab) return 'no tab';
  var sh=tab._xl.sheets[0];
  var s2=sh.styles['2_4'];
  var s31=sh.styles['31_6'];
  var xr=await _xlsxRealStyles(tab._xl.ab);
  var key=xr.byName['CM468'];
  var info={
    rich:sh.rich,
    styleD2:JSON.stringify(s2),
    styleF31:JSON.stringify(s31),
    xrealOk:xr.ok, xrealKey:key,
    xrealImgs:key?xr.sheets[key].images.length:-1,
    xrealN:key?xr.sheets[key].n:-1,
    xrealD2:key?JSON.stringify(xr.sheets[key].styles['2_4']):null
  };
  return JSON.stringify(info,null,1);
})()
