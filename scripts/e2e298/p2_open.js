(async()=>{
  try{
    if(!window.currentUser) return 'NO-SESSION user='+((window.currentUser||{}).login||'null');
    var b64=window.__d64||'';
    if(!b64||b64.length<1000) return 'NO-B64 '+b64.length;
    var bin=atob(b64), n=bin.length, u8=new Uint8Array(n);
    for(var i=0;i<n;i++) u8[i]=bin.charCodeAt(i);
    var f=new File([u8],'FPL-prueba.docx',{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
    await openFilesList([f]);
    await new Promise(r=>setTimeout(r,1500));
    var tab=null;
    for(var j=0;j<docTabs.length;j++){ if(docTabs[j].kind==='word'){tab=docTabs[j];break;} }
    if(!tab) return 'NO-WORD-TAB tabs='+docTabs.length;
    var secs=tab._docx.wrap.querySelectorAll('section.docx');
    return JSON.stringify({ok:true,fileName:tab.fileName,secs:secs.length,zoom:tab._docx.zoom||1,secH:secs.length?Math.round(secs[0].getBoundingClientRect().height):0,artParas:secs.length?secs[0].querySelectorAll('p').length:0});
  }catch(e){ return 'ERR:'+e.message; }
})()
