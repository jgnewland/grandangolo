/* Grandangolo — barra dell'app e apertura animata.
   Si attiva solo quando il sito è aperto dall'icona dell'app (o in prova). */
(function(){
  var C=window.GRDAPP||{};
  var app=C.sempre || (window.matchMedia&&matchMedia('(display-mode: standalone)').matches) || navigator.standalone===true;
  if(!app) return;
  var R=document.documentElement; R.classList.add('gapp-app');
  function ss(k,v){ try{ if(v===undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k,v); }catch(e){ return null; } }

  /* apertura: una volta per sessione */
  if(C.med && !ss('grd_splash') && !(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)){
    ss('grd_splash','1');
    var sp=document.createElement('div'); sp.className='gapp-splash'; sp.setAttribute('aria-hidden','true');
    sp.innerHTML='<div class="gapp-splash__in"><div class="gapp-splash__med"><img src="'+C.med+'" alt=""></div>'+(C.logo?'<div class="gapp-splash__logo"><img src="'+C.logo+'" alt=""></div>':'')+'<div class="gapp-splash__riga"></div><div class="gapp-splash__sotto">Notizie · Il settimanale in edicola</div></div>';
    (document.body||R).appendChild(sp);
    setTimeout(function(){ sp.classList.add('via'); setTimeout(function(){ sp.remove(); },600); },2000);
  }

  function pronto(f){ if(document.body) f(); else document.addEventListener('DOMContentLoaded',f); }
  pronto(function(){
    var IC={
      home:'<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
      ora:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
      ed:'<svg viewBox="0 0 24 24"><path d="M4 5h11v14H6a2 2 0 0 1-2-2zM15 8h4v9a2 2 0 0 1-2 2h-2"/><path d="M7 9h5M7 12h5M7 15h3"/></svg>',
      salva:'<svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4z"/></svg>',
      avvisi:'<svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 21h4"/></svg>',
      cond:'<svg viewBox="0 0 24 24"><path d="M12 3v13M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/></svg>'
    };
    var v=function(n){ return C.app+(C.app.indexOf('?')>=0?'&':'?')+'vista='+n; };
    var at=C.attiva||'';
    var n=document.createElement('nav'); n.className='gapp-tab'; n.setAttribute('aria-label','App');
    n.innerHTML='<a href="'+C.home+'" class="'+(at==='home'?'on':'')+'">'+IC.home+'Home</a>'+
      '<a href="'+v('ultimora')+'">'+IC.ora+'Ultim\'ora</a>'+
      '<a href="'+v('edicola')+'"><span class="gapp-ed">'+IC.ed+'</span>Edicola</a>'+
      '<a href="'+v('salvati')+'">'+IC.salva+'Salvati</a>'+
      '<a href="'+v('avvisi')+'">'+IC.avvisi+'Avvisi</a>';
    document.body.appendChild(n);

    /* negli articoli: Salva e Condividi a portata di pollice */
    var A=C.art; if(!A || !C.salvati) return;
    function toast(t){ var d=document.createElement('div'); d.className='gapp-toast'; d.textContent=t; document.body.appendChild(d); requestAnimationFrame(function(){ d.classList.add('on'); }); setTimeout(function(){ d.classList.remove('on'); setTimeout(function(){ d.remove(); },400); },1800); }
    var b=document.createElement('div'); b.className='gapp-azioni';
    b.innerHTML='<button type="button" data-a="salva">'+IC.salva+'<span>Salva</span></button><button type="button" data-a="cond">'+IC.cond+'Condividi</button>';
    document.body.appendChild(b);
    var bs=b.querySelector('[data-a=salva]');
    function agg(){ var s=C.eSalvato(A.u); bs.classList.toggle('on',s); bs.querySelector('span').textContent=s?'Salvato':'Salva'; }
    agg();
    b.addEventListener('click',function(e){
      var t=e.target.closest('[data-a]'); if(!t) return;
      if(t.getAttribute('data-a')==='salva'){ if(C.eSalvato(A.u)){ C.togli(A.u); toast('Tolto dai salvati'); } else { C.salva(A); toast('Salvato per dopo ✓'); } agg(); }
      else { if(navigator.share) navigator.share({title:A.t,url:A.u}).catch(function(){}); else { try{ navigator.clipboard.writeText(A.u); toast('Link copiato'); }catch(x){} } }
    });
  });
})();
