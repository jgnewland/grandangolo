/* Grandangolo — app */
(function(){
  'use strict';
  var D=window.GRDDATI||{}, C=window.GRDAPP||{};
  function $(s,c){ return (c||document).querySelector(s); }
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function ss(k,v){ try{ if(v===undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k,v); }catch(e){ return null; } }
  var IC={
    salva:'<svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4z"/></svg>',
    freccia:'<svg viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
  };

  /* ── apertura animata: solo alla prima apertura della sessione ── */
  var sp=$('#splash');
  if(sp){
    if(ss('grd_splash') || matchMedia('(prefers-reduced-motion: reduce)').matches){ sp.remove(); }
    else { ss('grd_splash','1'); setTimeout(function(){ sp.classList.add('via'); setTimeout(function(){ sp.remove(); },600); },2050); }
  }

  /* ── data ── */
  var oggi=$('#oggi'); if(oggi){ try{ oggi.textContent=new Date().toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long',year:'numeric'}); }catch(e){ oggi.textContent=D.oggi||''; } }

  /* ── tempi ── */
  function fa(iso){
    var t=new Date(iso), s=(Date.now()-t.getTime())/1000;
    if(s<60) return 'adesso';
    if(s<3600) return Math.floor(s/60)+' min fa';
    if(s<86400) return Math.floor(s/3600)+(Math.floor(s/3600)===1?' ora fa':' ore fa');
    if(s<172800) return 'ieri';
    return t.toLocaleDateString('it-IT',{day:'numeric',month:'long'});
  }
  function orario(iso){ var t=new Date(iso); return t.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}); }
  function giorno(iso){ var t=new Date(iso), o=new Date(); if(t.toDateString()===o.toDateString()) return 'oggi'; o.setDate(o.getDate()-1); if(t.toDateString()===o.toDateString()) return 'ieri'; return t.toLocaleDateString('it-IT',{day:'numeric',month:'short'}); }

  /* ── card notizia ── */
  function card(a,tipo){
    var s=C.eSalvato&&C.eSalvato(a.u);
    var img=a.i?'<div class="card__img"><img src="'+esc(a.i)+'" alt="" loading="lazy"></div>':'';
    var btn='<button class="salva'+(s?' on':'')+'" data-salva aria-label="Salva per dopo">'+IC.salva+'</button>';
    if(tipo==='flusso'){
      return '<a class="card" href="'+esc(a.u)+'" data-art="'+esc(JSON.stringify({t:a.t,u:a.u,i:a.i,k:a.k}))+'"><div class="orario">'+orario(a.d)+'<small>'+giorno(a.d)+'</small></div><div class="card__t"><div class="kick">'+esc(a.k)+'</div><h3>'+esc(a.t)+'</h3></div>'+img+'</a>';
    }
    return '<a class="card'+(tipo==='grande'?' card--grande':'')+'" href="'+esc(a.u)+'" data-art="'+esc(JSON.stringify({t:a.t,u:a.u,i:a.i,k:a.k}))+'">'+(tipo==='grande'?img:'')+'<div class="card__t"><div class="kick">'+esc(a.k)+'</div><h3>'+esc(a.t)+'</h3><div class="ora">'+(a.d?fa(a.d):'')+btn+'</div></div>'+(tipo==='grande'?'':img)+'</a>';
  }
  document.addEventListener('click',function(e){
    var b=e.target.closest('[data-salva]'); if(!b) return;
    e.preventDefault(); e.stopPropagation();
    var a=JSON.parse(b.closest('[data-art]').getAttribute('data-art'));
    if(C.eSalvato(a.u)){ C.togli(a.u); b.classList.remove('on'); toast('Tolto dai salvati'); }
    else { C.salva(a); b.classList.add('on'); toast('Salvato per dopo ✓'); }
    if(vista==='salvati') vSalvati();
  });

  function toast(t){ var d=document.createElement('div'); d.className='toast'; d.textContent=t; document.body.appendChild(d); requestAnimationFrame(function(){ d.classList.add('on'); }); setTimeout(function(){ d.classList.remove('on'); setTimeout(function(){ d.remove(); },400); },1900); }

  /* ── dati dal sito ── */
  function notizie(pag,cat,q){
    if(C.notizie) return C.notizie(pag,cat,q);   /* versione di prova: legge dal sito con l'API pubblica */
    var u=C.ajax+'?action=grd_app_notizie&pag='+pag+(cat?'&cat='+cat:'')+(q?'&q='+encodeURIComponent(q):'');
    return fetch(u,{credentials:'same-origin'}).then(function(r){ return r.json(); }).then(function(j){ return j&&j.success?j.data:[]; });
  }
  function linkNumero(n){ return D.edicola+(n&&n.id?'?numero='+encodeURIComponent(n.id):''); }

  /* ── HOME ── */
  var stato={cat:0,pag:1,fine:false,carica:false};
  function edicolaBand(){
    var ns=D.numeri||[]; if(!ns.length) return '';
    var u=ns[0], altri=ns.slice(1,9);
    return '<section class="ed-band" aria-label="Edicola digitale">'+
      '<div class="ed-kick"><i></i>'+(u.ultimo?'Ora in edicola':'In edicola')+'</div>'+
      '<div class="ed-main"><div class="ed-cover"><a href="'+esc(linkNumero(u))+'"><img src="'+esc(u.cover)+'" alt="Copertina '+esc(u.titolo)+'"></a></div>'+
      '<div class="ed-txt"><h3>'+esc(u.titolo)+'</h3>'+(u.sotto?'<p>'+esc(u.sotto)+'</p>':'')+
      '<a class="btn-giallo" href="'+esc(linkNumero(u))+'">Sfoglia il settimanale '+IC.freccia+'</a></div></div>'+
      (altri.length?'<div class="ed-sotto">Numeri precedenti</div><div class="ed-scorri">'+altri.map(function(n){ return '<a href="'+esc(linkNumero(n))+'"><img src="'+esc(n.cover)+'" alt="" loading="lazy"><span>'+esc(n.titolo)+'</span></a>'; }).join('')+'</div>':'')+
      '</section>';
  }
  function vHome(){
    var v=$('#v-home'), h='';
    if(D.apertura){
      var a=D.apertura;
      h+='<a class="apertura" href="'+esc(a.u)+'">'+(a.i?'<div class="apertura__img"><img src="'+esc(a.i)+'" alt=""></div>':'')+'<span class="kick">'+esc(a.k||'In evidenza')+'</span><h1>'+esc(a.t)+'</h1>'+(a.e?'<p>'+esc(a.e)+'</p>':'')+'<div class="ora">'+fa(a.d)+'</div></a>';
    }
    h+=edicolaBand();
    h+='<div class="sez-t"><h2>Ultime notizie</h2></div>';
    if((D.cats||[]).length) h+='<div class="chips" id="chips"><button class="on" data-cat="0">Tutte</button>'+D.cats.map(function(c){ return '<button data-cat="'+c.id+'">'+esc(c.n)+'</button>'; }).join('')+'</div>';
    h+='<div class="lista" id="lista"></div><div class="carica" id="sentinella"></div>';
    v.innerHTML=h;
    riempiLista(D.lista||[],true);
    var ch=$('#chips');
    if(ch) ch.addEventListener('click',function(e){
      var b=e.target.closest('button'); if(!b) return;
      ch.querySelectorAll('button').forEach(function(x){ x.classList.toggle('on',x===b); });
      b.scrollIntoView({inline:'center',block:'nearest',behavior:'smooth'});
      stato={cat:parseInt(b.getAttribute('data-cat'),10)||0,pag:0,fine:false,carica:false};
      $('#lista').innerHTML='<div class="scheletro"></div><div class="scheletro"></div><div class="scheletro"></div>';
      altre(true);
    });
    osserva();
  }
  function riempiLista(items,reset){
    var l=$('#lista'); if(!l) return;
    var h=items.map(function(a,k){ return card(a,(reset&&k===0&&stato.cat)?'grande':''); }).join('');
    if(reset) l.innerHTML=h||'<div class="vuoto">Nessuna notizia in questa sezione.</div>'; else l.insertAdjacentHTML('beforeend',h);
  }
  function altre(reset){
    if(stato.carica||stato.fine) return;
    stato.carica=true; stato.pag++;
    var s=$('#sentinella'); if(s) s.innerHTML='<i></i>';
    notizie(stato.pag,stato.cat).then(function(items){
      if(!stato.cat && stato.pag===1){ items=items.filter(function(x){ return !D.apertura||x.id!==D.apertura.id; }); }
      riempiLista(items,reset);
      if(items.length<14) stato.fine=true;
    }).catch(function(){ stato.pag--; }).then(function(){ stato.carica=false; if(s) s.innerHTML=''; });
  }
  var oss=null;
  function osserva(){
    stato.pag=1;
    if(!('IntersectionObserver' in window)) return;
    if(oss) oss.disconnect();
    oss=new IntersectionObserver(function(en){ if(en[0].isIntersecting && vista==='home') altre(false); },{rootMargin:'600px'});
    var s=$('#sentinella'); if(s) oss.observe(s);
  }

  /* ── ULTIM'ORA ── */
  function vUltimora(){
    var v=$('#v-ultimora');
    v.innerHTML='<div class="sez-t"><h2>Ultim\'ora</h2><button id="agg">Aggiorna</button></div><div class="lista flusso" id="flusso"><div class="scheletro"></div><div class="scheletro"></div><div class="scheletro"></div></div>';
    function carica(){ notizie(1,0).then(function(items){ $('#flusso').innerHTML=items.map(function(a){ return card(a,'flusso'); }).join('')||'<div class="vuoto">Nessuna notizia.</div>'; }); }
    $('#agg').onclick=function(){ $('#flusso').innerHTML='<div class="carica"><i></i></div>'; carica(); };
    carica();
  }

  /* ── EDICOLA ── */
  function vEdicola(){
    var v=$('#v-edicola'), ns=D.numeri||[], u=ns[0];
    var h='<div class="ed-pagina"><div class="ed-kick"><i></i>Edicola digitale</div><h2>Il settimanale Grandangolo</h2><p class="intro">Ogni venerdì il giornale completo da sfogliare, pagina per pagina, sul telefono.</p>';
    if(u){
      h+='<div class="ed-big"><a href="'+esc(linkNumero(u))+'"><img src="'+esc(u.cover)+'" alt="Copertina '+esc(u.titolo)+'"></a></div>'+
        '<div class="tit-num">'+esc(u.titolo)+'</div>'+(u.sotto?'<div class="sub-num">'+esc(u.sotto)+'</div>':'')+
        '<a class="btn-giallo" href="'+esc(linkNumero(u))+'">Sfoglia l\'ultimo numero '+IC.freccia+'</a>';
    }
    h+='<div class="ed-come"><div><b>1</b>Sfoglia gratis le prime pagine di ogni numero</div><div><b>2</b>Acquista il codice per sbloccare il giornale intero</div><div><b>3</b>Leggilo quando vuoi: resta nel tuo account</div></div>';
    if(ns.length>1) h+='<div class="ed-sotto">Tutti i numeri</div><div class="ed-griglia">'+ns.slice(1).map(function(n){ return '<a href="'+esc(linkNumero(n))+'"><img src="'+esc(n.cover)+'" alt="" loading="lazy"><span>'+esc(n.titolo)+'</span></a>'; }).join('')+'</div>';
    h+='<a class="btn-vuoto" style="color:var(--giallo);margin-top:22px" href="'+esc(D.edicola)+'">Vai all\'edicola completa ›</a></div>';
    v.innerHTML=h;
  }

  /* ── SALVATI ── */
  function vSalvati(){
    var v=$('#v-salvati'), l=C.salvati?C.salvati():[];
    if(!l.length){ v.innerHTML='<div class="vuoto"><div class="ic">🔖</div><b>Niente salvato, per ora</b>Tocca il segnalibro accanto a una notizia, o «Salva» in fondo all\'articolo, per leggerla con calma più tardi.</div>'; return; }
    v.innerHTML='<div class="sez-t"><h2>Da leggere dopo</h2></div><div class="lista">'+l.map(function(a){ return card({t:a.t,u:a.u,i:a.i,k:a.k}); }).join('')+'</div>';
  }

  /* ── AVVISI ── */
  function vAvvisi(){
    var v=$('#v-avvisi'), temi=C.temi?C.temi():['notizie','edicola'];
    var h='<div class="av"><h2>Avvisi sul telefono</h2><p class="intro">Ti scriviamo solo quando serve: le notizie importanti scelte dalla redazione e l\'uscita del nuovo numero del settimanale.</p>';
    if(C.prova){
      v.innerHTML=h+'<div class="passi"><b>Questa è la versione di prova.</b><br>Gli avvisi sul telefono si attivano quando l\'app sarà sul sito vero: da qui potrai scegliere «Notizie importanti» e «Nuova uscita in edicola».</div><a class="link-sito" href="'+esc(D.sito)+'">Apri il sito completo ›</a></div>'; return;
    }
    if(!D.push || !C.pushPossibile || !C.pushPossibile()){
      if(C.ios && !C.standalone()){
        h+='<div class="passi"><b>Su iPhone gli avvisi arrivano solo dall\'app installata:</b><ol><li>tocca <b>Condividi</b> (il quadrato con la freccia in su)</li><li>scegli <b>«Aggiungi alla schermata Home»</b></li><li>apri Grandangolo dall\'icona e torna qui</li></ol></div>';
      } else {
        h+='<div class="av-stato"><i></i>Questo telefono o browser non supporta gli avvisi.</div>';
      }
      v.innerHTML=h+'<a class="link-sito" href="'+esc(D.sito)+'">Apri il sito completo ›</a></div>'; return;
    }
    h+='<div class="av-stato" id="av-stato"><i></i><span>Controllo…</span></div>'+
      '<label class="av-voce"><div><b>Notizie importanti</b><span>Le ultim\'ora scelte dalla redazione</span></div><span class="sw"><input type="checkbox" data-tema="notizie" '+(temi.indexOf('notizie')>=0?'checked':'')+'><i></i></span></label>'+
      '<label class="av-voce"><div><b>Nuova uscita in edicola</b><span>Quando esce il settimanale, ogni venerdì</span></div><span class="sw"><input type="checkbox" data-tema="edicola" '+(temi.indexOf('edicola')>=0?'checked':'')+'><i></i></span></label>'+
      '<button class="btn-giallo" id="av-btn">Attiva gli avvisi</button><p class="nota" id="av-nota"></p>'+
      '<a class="link-sito" href="'+esc(D.sito)+'">Apri il sito completo ›</a></div>';
    v.innerHTML=h;
    var btn=$('#av-btn'), st=$('#av-stato'), nota=$('#av-nota');
    function scelti(){ return Array.prototype.map.call(v.querySelectorAll('[data-tema]:checked'),function(x){ return x.getAttribute('data-tema'); }); }
    function mostra(s){
      st.classList.toggle('ok',s==='attivo');
      st.querySelector('span').textContent= s==='attivo'?'Avvisi attivi su questo telefono':s==='negato'?'Avvisi bloccati':'Avvisi non attivi';
      btn.textContent= s==='attivo'?'Disattiva gli avvisi':'Attiva gli avvisi';
      btn.dataset.s=s;
      nota.textContent= s==='negato'?'Hai bloccato le notifiche per Grandangolo: riattivale dalle impostazioni del telefono (Notifiche → Grandangolo), poi torna qui.':'';
    }
    C.statoPush().then(mostra);
    btn.onclick=function(){
      if(btn.dataset.s==='attivo'){ btn.disabled=true; C.disattiva().then(function(){ toast('Avvisi disattivati'); mostra('spento'); }).catch(function(){}).then(function(){ btn.disabled=false; }); return; }
      var t=scelti(); if(!t.length){ toast('Scegli almeno un tipo di avviso'); return; }
      btn.disabled=true;
      C.attiva(t).then(function(){ toast('Avvisi attivati ✓'); mostra('attivo'); }).catch(function(e){ mostra(Notification.permission==='denied'?'negato':'spento'); if(e&&e.message==='ios') toast('Prima installa l\'app sulla schermata Home'); }).then(function(){ btn.disabled=false; });
    };
    v.querySelectorAll('[data-tema]').forEach(function(x){ x.onchange=function(){
      var t=scelti(); C.ls('grd_temi',t.join(','));
      if(btn.dataset.s==='attivo'){ (t.length?C.attiva(t):C.disattiva()).then(function(){ toast(t.length?'Preferenze salvate':'Avvisi disattivati'); C.statoPush().then(mostra); }); }
    }; });
  }

  /* ── CERCA ── */
  var cb=$('#cerca'), ci=$('#cerca-in');
  $('#btn-cerca').onclick=function(){ cb.classList.toggle('on'); if(cb.classList.contains('on')) ci.focus(); };
  $('#cerca-x').onclick=function(){ cb.classList.remove('on'); ci.value=''; if(vista==='cerca') vai('home'); };
  ci.addEventListener('keydown',function(e){
    if(e.key!=='Enter') return; var q=ci.value.trim(); if(q.length<2) return;
    ci.blur(); vai('cerca',true);
    var v=$('#v-cerca'); v.innerHTML='<div class="sez-t"><h2>«'+esc(q)+'»</h2></div><div class="carica"><i></i></div>';
    notizie(1,0,q).then(function(items){ v.innerHTML='<div class="sez-t"><h2>«'+esc(q)+'»</h2></div><div class="lista">'+(items.map(function(a){ return card(a); }).join('')||'<div class="vuoto">Nessun risultato.</div>')+'</div>'; });
  });

  /* ── navigazione tra le viste ── */
  var vista='home', fatte={};
  var disegna={home:vHome,ultimora:vUltimora,edicola:vEdicola,salvati:vSalvati,avvisi:vAvvisi};
  function vai(n,noDraw){
    vista=n;
    document.querySelectorAll('.vista').forEach(function(x){ x.classList.toggle('on',x.id==='v-'+n); });
    document.querySelectorAll('.tabbar button').forEach(function(x){ x.classList.toggle('on',x.getAttribute('data-v')===n); });
    if(!noDraw && disegna[n] && (!fatte[n] || n==='salvati' || n==='avvisi')){ disegna[n](); fatte[n]=1; }
    window.scrollTo(0,0);
    try{ history.replaceState(null,'',n==='home'?location.pathname:'?vista='+n); }catch(e){}
  }
  document.querySelector('.tabbar').addEventListener('click',function(e){
    var b=e.target.closest('button'); if(!b) return;
    var n=b.getAttribute('data-v');
    /* la Home dell'app è la prima pagina del sito, identica a quella che si vede dal telefono */
    if(n==='home' && D.homeSito){ location.href=D.homeSito; return; }
    if(n===vista && n==='home'){ window.scrollTo({top:0,behavior:'smooth'}); return; }
    vai(n);
  });
  var iniz=(new URLSearchParams(location.search)).get('vista');
  vai(disegna[iniz]?iniz:'home');
  /* tornando all'app dopo aver letto un articolo, i segnalibri restano giusti */
  window.addEventListener('pageshow',function(e){ if(e.persisted && vista==='salvati') vSalvati(); });

  /* ── invito agli avvisi: una volta, poco dopo la prima apertura ── */
  var fg=$('#foglio');
  function chiudiFoglio(){ fg.classList.remove('on'); C.ls('grd_chiesto',String(Date.now())); }
  if(D.push && C.pushPossibile && C.pushPossibile() && Notification.permission==='default' && !C.ls('grd_chiesto')){
    setTimeout(function(){ if(vista==='home') fg.classList.add('on'); }, ss('grd_splash_vista')?2500:4200);
  }
  ss('grd_splash_vista','1');
  $('#foglio-no').onclick=chiudiFoglio;
  fg.addEventListener('click',function(e){ if(e.target===fg) chiudiFoglio(); });
  $('#foglio-si').onclick=function(){
    var b=this; b.disabled=true; b.textContent='Un attimo…';
    C.attiva().then(function(){ toast('Avvisi attivati ✓'); }).catch(function(){ }).then(function(){ chiudiFoglio(); b.disabled=false; b.textContent='Attiva gli avvisi'; });
  };
})();
