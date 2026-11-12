(async()=>{
  try{
    var tab=null; for(var i=0;i<docTabs.length;i++){ if(docTabs[i].kind==='word'){tab=docTabs[i];break;} }
    if(!tab) return 'NO-TAB';
    var d=tab._docx;
    var sec=d.wrap.querySelectorAll('section.docx')[0];
    if(!sec) return 'NO-SEC';
    // sello personal del usuario (como si lo hubiera subido en Mi Perfil)
    var sealB64=window._sealB64||'';
    sigLibrary=[{id:'sig1',name:'Sello Test',src:'data:image/png;base64,'+sealB64}];
    activeSigId='sig1';
    var sr=sec.getBoundingClientRect();
    // —— punto A: sello de recepción (con firma) al 58% vertical, 26% horizontal ——
    nativeSelloRecepcion();
    var ax=Math.round(sr.left+sr.width*0.26), ay=Math.round(sr.top+sr.height*0.58);
    sec.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true,button:0,clientX:ax,clientY:ay}));
    await new Promise(r=>setTimeout(r,300));
    var n1=(tab.nvStamps||[]).length;
    if(!n1) return 'NO-SELLO1 armed='+(document.body.classList.contains('nv-arm')?'si':'no');
    // —— punto B: sello personal APROBADO al 30% vertical, 60% horizontal ——
    nvArmStamp({label:'APROBADO',emoji:'',color:'#c0392b'});
    var bx=Math.round(sr.left+sr.width*0.60), by=Math.round(sr.top+sr.height*0.30);
    sec.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true,button:0,clientX:bx,clientY:by}));
    await new Promise(r=>setTimeout(r,300));
    var st=tab.nvStamps||[];
    var over=document.querySelectorAll('.nv-sello, .nv-stamp-el').length;
    return JSON.stringify({n1:n1,n2:st.length,overlayEls:over,sellos:st.map(function(s){return s.type+'@'+Math.round(s.x)+','+Math.round(s.y)+',sec'+s.sec;}),dirty:!!tab._dirty});
  }catch(e){ return 'ERR:'+e.message; }
})()
