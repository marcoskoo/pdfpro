(async()=>{
  try{
    var tab=null;
    for(var i=0;i<docTabs.length;i++){ if(docTabs[i].kind==='excel'){tab=docTabs[i];break;} }
    var host=tab._xlView.host;
    // contenedor con scroll
    var sc=host.closest('.xg-scroll')||host.parentElement;
    var hr=host.getBoundingClientRect(), sr=sc.getBoundingClientRect();
    // ¿está el punto dentro del área visible del contenedor?
    var vis=(hr.top<sr.bottom&&hr.bottom>sr.top);
    return JSON.stringify({hostRect:{t:hr.top,b:hr.bottom,l:hr.left,r:hr.right},
      scrollRect:{t:sr.top,b:sr.bottom,l:sr.left,r:sr.right},
      scClass:sc.className, vis:vis, scrollY:sc.scrollTop, scrollH:sc.scrollHeight});
  }catch(e){ return 'ERR:'+e.message; }
})()
